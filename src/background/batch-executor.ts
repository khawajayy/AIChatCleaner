import {
  ChatMetadata,
  ActionResult,
  UserSettings,
  OperationLog,
} from '../types';
import { StorageManager } from '../storage/storage-manager';
import { AdapterRegistry } from '../adapters/registry';

export interface BatchProgressCallback {
  (progress: {
    current: number;
    total: number;
    currentChatTitle: string;
    result?: ActionResult;
    isComplete: boolean;
    cancelled?: boolean;
    error?: string;
  }): void;
}

export class SafeBatchExecutor {
  private static isCancelled = false;
  private static isRunning = false;

  public static cancel(): void {
    if (this.isRunning) {
      this.isCancelled = true;
    }
  }

  public static getRunningState(): boolean {
    return this.isRunning;
  }

  /**
   * Executes a sequential, verified batch of actions with safety pauses,
   * observable verification, instant abortion on unexpected state, and audit logging.
   */
  public static async executeBatch(
    chatsToProcess: ChatMetadata[],
    action: 'archive' | 'delete',
    dryRun: boolean,
    settings: UserSettings,
    onProgress?: BatchProgressCallback
  ): Promise<{ results: ActionResult[]; cancelled: boolean; stoppedOnError?: string }> {
    if (this.isRunning) {
      throw new Error('Another batch operation is already in progress.');
    }

    this.isRunning = true;
    this.isCancelled = false;

    const results: ActionResult[] = [];
    const batchId = `batch_${Date.now()}`;

    // Safety Safeguard 1: Hard enforcement of batch size limit
    const safeBatch = chatsToProcess.slice(0, settings.maxBatchSize);

    try {
      for (let i = 0; i < safeBatch.length; i++) {
        // Safety Safeguard 2: Check for user cancellation before each step
        if (this.isCancelled) {
          if (onProgress) {
            onProgress({
              current: i,
              total: safeBatch.length,
              currentChatTitle: '',
              isComplete: true,
              cancelled: true,
            });
          }
          return { results, cancelled: true };
        }

        const chat = safeBatch[i];

        // Safety Safeguard 3: Strict immunity for protected conversations
        if (chat.isProtected || settings.protectedChatIds.includes(chat.id)) {
          const skipResult: ActionResult = {
            success: false,
            action: dryRun ? 'dry_run' : action,
            chatId: chat.id,
            platform: chat.platform,
            timestamp: Date.now(),
            verified: false,
            error: 'Operation aborted: Conversation is strictly protected by user policy.',
          };
          results.push(skipResult);
          continue;
        }

        if (onProgress) {
          onProgress({
            current: i + 1,
            total: safeBatch.length,
            currentChatTitle: chat.title,
            isComplete: false,
          });
        }

        let actionResult: ActionResult;

        if (dryRun) {
          // Dry-run mode: Never mutates DOM or calls destructive methods
          actionResult = {
            success: true,
            action: 'dry_run',
            chatId: chat.id,
            platform: chat.platform,
            timestamp: Date.now(),
            verified: true,
          };
        } else {
          // Live execution: Find registered adapter for platform
          const adapter = AdapterRegistry.getAdapter(chat.platform);
          if (!adapter) {
            actionResult = {
              success: false,
              action,
              chatId: chat.id,
              platform: chat.platform,
              timestamp: Date.now(),
              verified: false,
              error: `No adapter available for platform "${chat.platform}".`,
            };
          } else {
            // Execute via adapter with strict identity check
            if (action === 'delete') {
              actionResult = await adapter.deleteChat(chat, false);
            } else if (action === 'archive' && adapter.archiveChat) {
              actionResult = await adapter.archiveChat(chat, false);
            } else {
              actionResult = {
                success: false,
                action: 'archive',
                chatId: chat.id,
                platform: chat.platform,
                timestamp: Date.now(),
                verified: false,
                error: `Archive not supported for ${chat.platform}.`,
              };
            }
          }
        }

        results.push(actionResult);

        // Update local chat status
        if (actionResult.success && !dryRun) {
          await StorageManager.updateChat(chat.id, {
            status: action === 'delete' ? 'deleted' : 'archived',
          });
        } else if (!actionResult.success && !dryRun) {
          await StorageManager.updateChat(chat.id, {
            status: 'failed',
          });
        }

        // Audit log entry
        const log: OperationLog = {
          id: `log_${Date.now()}_${i}`,
          batchId,
          timestamp: Date.now(),
          platform: chat.platform,
          chatId: chat.id,
          chatTitle: chat.title,
          action: actionResult.action,
          success: actionResult.success,
          error: actionResult.error,
          verified: actionResult.verified,
        };
        await StorageManager.appendOperationLog(log);

        if (onProgress) {
          onProgress({
            current: i + 1,
            total: safeBatch.length,
            currentChatTitle: chat.title,
            result: actionResult,
            isComplete: i === safeBatch.length - 1,
          });
        }

        // Safety Safeguard 4: If an action failed in live mode, stop the batch immediately!
        // Never blindly continue when unexpected state occurs.
        if (!dryRun && !actionResult.success) {
          return {
            results,
            cancelled: false,
            stoppedOnError: `Batch stopped automatically for safety: ${actionResult.error || 'Action failed'}`,
          };
        }

        // Safety Safeguard 5: Sequential delay pacing between operations
        if (i < safeBatch.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, settings.actionDelayMs));
        }
      }

      return { results, cancelled: false };
    } finally {
      this.isRunning = false;
      this.isCancelled = false;
    }
  }
}
