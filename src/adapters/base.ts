import { ChatAdapter, ChatDetails, PlatformCapabilities } from './types';
import { ActionResult, ChatMetadata, PlatformId } from '../types';

export abstract class BaseAdapter implements ChatAdapter {
  abstract readonly platform: PlatformId;
  abstract readonly displayName: string;
  abstract readonly capabilities: PlatformCapabilities;

  abstract detectPage(): boolean;
  abstract discoverChats(): Promise<ChatMetadata[]>;
  abstract getChatDetails(chat: ChatMetadata): Promise<ChatDetails | null>;
  abstract deleteChat(chat: ChatMetadata, dryRun?: boolean): Promise<ActionResult>;

  public async archiveChat?(chat: ChatMetadata, dryRun?: boolean): Promise<ActionResult> {
    if (!this.capabilities.supportsArchive) {
      return {
        success: false,
        action: 'archive',
        chatId: chat.id,
        platform: this.platform,
        timestamp: Date.now(),
        verified: false,
        error: `Archive operation is not supported by ${this.displayName}.`,
      };
    }
    return this.executeArchiveInternal(chat, dryRun);
  }

  protected async executeArchiveInternal(chat: ChatMetadata, _dryRun = false): Promise<ActionResult> {
    return {
      success: false,
      action: 'archive',
      chatId: chat.id,
      platform: this.platform,
      timestamp: Date.now(),
      verified: false,
      error: 'Archive not implemented for this adapter.',
    };
  }

  /**
   * Revalidates that the target chat actually exists in the DOM right now
   * and matches the stored identity (title / id / url) before performing any destructive action.
   */
  public async validateChatIdentity(chat: ChatMetadata): Promise<boolean> {
    if (!chat || !chat.id) return false;
    // Check if on correct platform
    if (!this.detectPage()) return false;

    // Search for matching link or element in DOM
    const links = Array.from(document.querySelectorAll('a[href]'));
    const match = links.find((a) => {
      const href = a.getAttribute('href') || '';
      return href.includes(chat.id) || (chat.title && a.textContent?.trim().includes(chat.title.trim()));
    });

    return !!match;
  }

  /**
   * Safe helper to wait for an element to appear in DOM
   */
  protected async waitForElement<T extends Element = Element>(
    selector: string,
    timeoutMs = 2500,
    root: ParentNode = document
  ): Promise<T | null> {
    const existing = root.querySelector<T>(selector);
    if (existing) return existing;

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeoutMs);

      const observer = new MutationObserver(() => {
        const found = root.querySelector<T>(selector);
        if (found) {
          clearTimeout(timer);
          observer.disconnect();
          resolve(found);
        }
      });

      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
      });
    });
  }

  protected async sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
