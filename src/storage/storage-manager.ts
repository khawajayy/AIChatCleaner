import {
  StorageSchema,
  UserSettings,
  ChatMetadata,
  OperationLog,
  PlatformId,
} from '../types';
import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_SETTINGS,
  INITIAL_STORAGE_STATE,
} from './schema';

const STORAGE_KEY = 'chatsweep_state_v1';

// In-memory fallback if neither chrome.storage nor localStorage is available
let memoryFallback: StorageSchema = structuredClone(INITIAL_STORAGE_STATE);

export class StorageManager {
  private static isChromeStorageAvailable(): boolean {
    return (
      typeof chrome !== 'undefined' &&
      !!chrome.storage &&
      !!chrome.storage.local
    );
  }

  public static async getState(): Promise<StorageSchema> {
    try {
      if (this.isChromeStorageAvailable()) {
        const result = await chrome.storage.local.get([STORAGE_KEY]);
        if (result && result[STORAGE_KEY]) {
          return this.migrate(result[STORAGE_KEY]);
        }
        // Initialize default
        const fresh = structuredClone(INITIAL_STORAGE_STATE);
        await chrome.storage.local.set({ [STORAGE_KEY]: fresh });
        return fresh;
      }

      if (typeof window !== 'undefined' && window.localStorage) {
        const item = window.localStorage.getItem(STORAGE_KEY);
        if (item) {
          const parsed = JSON.parse(item);
          return this.migrate(parsed);
        }
        const fresh = structuredClone(INITIAL_STORAGE_STATE);
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(fresh)
        );
        return fresh;
      }
    } catch (err) {
      console.warn('Storage read failed, using memory state:', err);
    }

    return structuredClone(memoryFallback);
  }

  public static async saveState(state: StorageSchema): Promise<void> {
    try {
      if (this.isChromeStorageAvailable()) {
        await chrome.storage.local.set({ [STORAGE_KEY]: state });
        return;
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        return;
      }
    } catch (err) {
      console.error('Storage save failed:', err);
    }
    memoryFallback = state;
  }

  /**
   * Migrate storage state from previous schema versions if needed
   */
  public static migrate(data: any): StorageSchema {
    if (!data || typeof data !== 'object') {
      return structuredClone(INITIAL_STORAGE_STATE);
    }

    let state = { ...data } as StorageSchema;

    // Version 0 or unversioned -> version 1
    if (!state.version || state.version < CURRENT_SCHEMA_VERSION) {
      state = {
        version: CURRENT_SCHEMA_VERSION,
        settings: {
          ...DEFAULT_SETTINGS,
          ...(state.settings || {}),
          schemaVersion: CURRENT_SCHEMA_VERSION,
        },
        chats: state.chats || {},
        operationLogs: state.operationLogs || [],
        platformStatus: {
          ...INITIAL_STORAGE_STATE.platformStatus,
          ...(state.platformStatus || {}),
        },
      };
    }

    // Ensure all critical top-level properties exist
    if (!state.settings) state.settings = { ...DEFAULT_SETTINGS };
    if (!state.chats) state.chats = {};
    if (!state.operationLogs) state.operationLogs = [];
    if (!state.platformStatus) {
      state.platformStatus = { ...INITIAL_STORAGE_STATE.platformStatus };
    }

    return state;
  }

  public static async getSettings(): Promise<UserSettings> {
    const state = await this.getState();
    return state.settings;
  }

  public static async updateSettings(
    partial: Partial<UserSettings>
  ): Promise<UserSettings> {
    const state = await this.getState();
    state.settings = { ...state.settings, ...partial };
    await this.saveState(state);
    return state.settings;
  }

  public static async getChats(): Promise<ChatMetadata[]> {
    const state = await this.getState();
    return Object.values(state.chats);
  }

  public static async getChatById(id: string): Promise<ChatMetadata | null> {
    const state = await this.getState();
    return state.chats[id] || null;
  }

  public static async saveChats(chats: ChatMetadata[]): Promise<void> {
    const state = await this.getState();
    for (const chat of chats) {
      // Preserve existing user override if previously set
      const existing = state.chats[chat.id];
      if (existing && existing.userOverrideCategory) {
        chat.userOverrideCategory = existing.userOverrideCategory;
        chat.category = existing.userOverrideCategory;
      }
      if (existing && existing.isProtected) {
        chat.isProtected = true;
      }
      state.chats[chat.id] = chat;
    }
    await this.saveState(state);
  }

  public static async updateChat(
    id: string,
    updates: Partial<ChatMetadata>
  ): Promise<ChatMetadata | null> {
    const state = await this.getState();
    if (!state.chats[id]) return null;

    state.chats[id] = { ...state.chats[id], ...updates };
    await this.saveState(state);
    return state.chats[id];
  }

  public static async appendOperationLog(log: OperationLog): Promise<void> {
    const state = await this.getState();
    // Keep last 250 operations to prevent unbounded growth
    state.operationLogs = [log, ...state.operationLogs].slice(0, 250);
    await this.saveState(state);
  }

  public static async getOperationLogs(): Promise<OperationLog[]> {
    const state = await this.getState();
    return state.operationLogs;
  }

  public static async updatePlatformStatus(
    platform: PlatformId,
    status: {
      lastScanTimestamp?: number | null;
      connected?: boolean;
      totalDiscovered?: number;
      lastError?: string;
    }
  ): Promise<void> {
    const state = await this.getState();
    state.platformStatus[platform] = {
      ...state.platformStatus[platform],
      ...status,
    };
    await this.saveState(state);
  }

  public static async resetAllData(): Promise<void> {
    const fresh = structuredClone(INITIAL_STORAGE_STATE);
    fresh.chats = {};
    fresh.operationLogs = [];
    fresh.settings = structuredClone(DEFAULT_SETTINGS);
    memoryFallback = structuredClone(fresh);
    await this.saveState(fresh);
  }

  public static async exportDataJson(): Promise<string> {
    const state = await this.getState();
    return JSON.stringify(state, null, 2);
  }
}
