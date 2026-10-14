import { StorageSchema, UserSettings } from '../types';

export const CURRENT_SCHEMA_VERSION = 1;

export const DEFAULT_SETTINGS: UserSettings = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  dryRunDefault: true,
  maxBatchSize: 10,
  actionDelayMs: 1200,
  protectedKeywords: ['taxes', 'legal', 'client', 'important', 'pinned', 'contract', 'password', 'confidential'],
  protectedRegexPatterns: ['^\\[work\\].*', '^\\[save\\].*'],
  protectedChatIds: [],
  minimumAgeDays: 3,
  confidenceThreshold: 0.65,
  enabledPlatforms: {
    chatgpt: true,
    gemini: true,
    claude: true,
  },
  autoScanOnVisit: false,
  theme: 'system',
  onboardingCompleted: false,
  aiClassificationOptIn: false,
};

export const INITIAL_STORAGE_STATE: StorageSchema = {
  version: CURRENT_SCHEMA_VERSION,
  settings: DEFAULT_SETTINGS,
  chats: {},
  operationLogs: [],
  platformStatus: {
    chatgpt: {
      lastScanTimestamp: null,
      connected: false,
      totalDiscovered: 0,
    },
    gemini: {
      lastScanTimestamp: null,
      connected: false,
      totalDiscovered: 0,
    },
    claude: {
      lastScanTimestamp: null,
      connected: false,
      totalDiscovered: 0,
    },
  },
};
