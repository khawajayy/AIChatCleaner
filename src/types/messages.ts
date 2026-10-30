import {
  ChatMetadata,
  ActionResult,
  PlatformId,
  UserSettings,
  ClassificationCategory,
  ChatProcessingStatus,
} from './index';

export type ExtensionMessage =
  | { type: 'GET_STORAGE_DATA' }
  | { type: 'GET_SETTINGS' }
  | {
      type: 'UPDATE_SETTINGS';
      payload: Partial<UserSettings>;
      /** Re-run classification on the stored chats with the new settings */
      reclassify?: boolean;
    }
  | { type: 'RESET_STORAGE' }
  | { type: 'EXPORT_DATA' }
  | { type: 'DETECT_ACTIVE_TAB' }
  | { type: 'TRIGGER_SCAN'; platform?: PlatformId }
  | {
      type: 'SCAN_COMPLETED';
      platform: PlatformId;
      chats: ChatMetadata[];
      error?: string;
    }
  | {
      type: 'UPDATE_CHAT_CATEGORY';
      chatId: string;
      category: ClassificationCategory;
    }
  | {
      type: 'UPDATE_CHAT_STATUS';
      chatId: string;
      status: ChatProcessingStatus;
    }
  | {
      type: 'TOGGLE_CHAT_PROTECTION';
      chatId: string;
    }
  | {
      type: 'SET_CHAT_PROTECTION';
      chatId: string;
      isProtected: boolean;
    }
  | {
      type: 'EXECUTE_BATCH';
      chatIds: string[];
      action: 'archive' | 'delete';
      dryRun: boolean;
    }
  | { type: 'CANCEL_BATCH' }
  | {
      type: 'BATCH_PROGRESS';
      current: number;
      total: number;
      currentChat?: string;
      result?: ActionResult;
      isComplete: boolean;
      cancelled?: boolean;
    };

export type ContentScriptMessage =
  | { type: 'CONTENT_PING' }
  | { type: 'CONTENT_CHECK_PRESENT'; chatId: string }
  | { type: 'CONTENT_DISCOVER_CHATS' }
  | {
      type: 'CONTENT_DISCOVER_CHATS_RESULT';
      success: boolean;
      chats: ChatMetadata[];
      error?: string;
    }
  | {
      type: 'CONTENT_EXECUTE_ACTION';
      chat: ChatMetadata;
      action: 'archive' | 'delete';
      dryRun: boolean;
    }
  | {
      type: 'CONTENT_EXECUTE_ACTION_RESULT';
      result: ActionResult;
    };
