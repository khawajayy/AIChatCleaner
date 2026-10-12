export type PlatformId = 'chatgpt' | 'gemini' | 'claude';

export type ClassificationCategory = 'keep' | 'review' | 'cleanup';

export type ChatProcessingStatus =
  | 'discovered'
  | 'reviewed'
  | 'marked_for_cleanup'
  | 'archived'
  | 'deleted'
  | 'protected'
  | 'failed';

export interface ChatMetadata {
  id: string;
  platform: PlatformId;
  title: string;
  url: string;
  lastActivityTimestamp: number | null;
  messageCount: number | null;
  isEmpty: boolean;
  isUnfinished: boolean;
  category: ClassificationCategory;
  confidence: number; // 0.0 - 1.0
  reasons: string[];
  lastScannedAt: number;
  supportsArchive: boolean;
  supportsDelete: boolean;
  status: ChatProcessingStatus;
  isProtected: boolean;
  snippet?: string;
  userOverrideCategory?: ClassificationCategory | null;
}

export interface ActionResult {
  success: boolean;
  action: 'archive' | 'delete' | 'dry_run';
  chatId: string;
  platform: PlatformId;
  timestamp: number;
  error?: string;
  verified: boolean;
}

export interface UserSettings {
  schemaVersion: number;
  dryRunDefault: boolean;
  maxBatchSize: number;
  actionDelayMs: number;
  protectedKeywords: string[];
  protectedRegexPatterns: string[];
  protectedChatIds: string[];
  minimumAgeDays: number;
  confidenceThreshold: number;
  enabledPlatforms: Record<PlatformId, boolean>;
  autoScanOnVisit: boolean;
  theme: 'dark' | 'light' | 'system';
  onboardingCompleted: boolean;
  aiClassificationOptIn: boolean;
}

export interface OperationLog {
  id: string;
  batchId: string;
  timestamp: number;
  platform: PlatformId;
  chatId: string;
  chatTitle: string;
  action: 'archive' | 'delete' | 'dry_run';
  success: boolean;
  error?: string;
  verified: boolean;
}

export interface StorageSchema {
  version: number;
  settings: UserSettings;
  chats: Record<string, ChatMetadata>;
  operationLogs: OperationLog[];
  platformStatus: Record<
    PlatformId,
    {
      lastScanTimestamp: number | null;
      connected: boolean;
      totalDiscovered: number;
      lastError?: string;
    }
  >;
}
