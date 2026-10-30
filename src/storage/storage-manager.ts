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

export const STORAGE_KEY = 'chatsweep_state_v1';

// In-memory fallback if neither chrome.storage nor localStorage is available
let memoryFallback: StorageSchema = structuredClone(INITIAL_STORAGE_STATE);

export class StorageManager {
  // Tail of the write queue. Writes in one context run one at a time so a
  // read-modify-write never interleaves with another and drops its update.
  private static writeQueue: Promise<unknown> = Promise.resolve();
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
      console.error('Storage read failed, using memory state:', err);
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
   * Runs `fn` on the latest stored state and saves the result, after every
   * earlier write in this context has finished. All writes go through here;
   * the UI routes its writes to the background worker so they share one queue.
   */
  public static mutate<T>(
    fn: (state: StorageSchema) => T | Promise<T>
  ): Promise<T> {
    return this.enqueue(async () => {
      const state = await this.getState();
      const result = await fn(state);
      await this.saveState(state);
      return result;
    });
  }

  private static enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.writeQueue.then(task);
    this.writeQueue = run.catch(() => {});
    return run;
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

  public static updateSettings(
    partial: Partial<UserSettings>
  ): Promise<UserSettings> {
    return this.mutate((state) => {
      state.settings = { ...state.settings, ...partial };
      return state.settings;
    });
  }

  public static async getChats(): Promise<ChatMetadata[]> {
    const state = await this.getState();
    return Object.values(state.chats);
  }

  public static async getChatById(id: string): Promise<ChatMetadata | null> {
    const state = await this.getState();
    return state.chats[id] || null;
  }

  /**
   * Stores freshly scanned chats. Anything the user or a batch decided about a
   * chat already in storage (status, protection, category override) is kept,
   * and so is when it was first seen.
   */
  public static saveChats(chats: ChatMetadata[]): Promise<void> {
    return this.mutate((state) => {
      this.mergeScannedChats(state, chats);
    });
  }

  /**
   * Stores the result of a full sidebar scan of `platform` and flags stored chats
   * of that platform the scan did not list with `missingSince`. Nothing is removed:
   * sidebars lazy-load, so a chat may only be off-screen, and it is unflagged the
   * next time a scan lists it. An empty scan flags nothing, as an empty sidebar
   * usually means it had not loaded.
   */
  public static saveScanResults(platform: PlatformId, chats: ChatMetadata[]): Promise<void> {
    return this.mutate((state) => {
      this.mergeScannedChats(state, chats);
      if (chats.length === 0) return;
      const seen = new Set(chats.map((c) => c.id));
      const now = Date.now();
      for (const chat of Object.values(state.chats)) {
        if (chat.platform !== platform || seen.has(chat.id) || chat.missingSince) continue;
        state.chats[chat.id] = { ...chat, missingSince: now };
      }
    });
  }

  private static mergeScannedChats(state: StorageSchema, chats: ChatMetadata[]): void {
    for (const chat of chats) {
      const existing = state.chats[chat.id];
      if (!existing) {
        state.chats[chat.id] = chat;
        continue;
      }
      const merged: ChatMetadata = {
        ...chat,
        status: existing.status,
        isProtected: existing.isProtected || chat.isProtected,
        userOverrideCategory: existing.userOverrideCategory,
        firstSeenAt: existing.firstSeenAt ?? null,
        missingSince: null,
      };
      if (merged.userOverrideCategory) {
        merged.category = merged.userOverrideCategory;
      } else if (merged.isProtected) {
        merged.category = 'keep';
      }
      state.chats[chat.id] = merged;
    }
  }

  public static updateChat(
    id: string,
    updates: Partial<ChatMetadata>
  ): Promise<ChatMetadata | null> {
    return this.mutate((state) => {
      if (!state.chats[id]) return null;
      state.chats[id] = { ...state.chats[id], ...updates };
      return state.chats[id];
    });
  }

  /**
   * Protects or unprotects a chat, keeping the chat flag and
   * settings.protectedChatIds in step within a single write.
   */
  public static setChatProtection(
    id: string,
    isProtected: boolean
  ): Promise<ChatMetadata | null> {
    return this.mutate((state) => {
      const chat = state.chats[id];
      if (!chat) return null;
      state.chats[id] = {
        ...chat,
        isProtected,
        category: isProtected ? 'keep' : chat.category,
      };
      const ids = state.settings.protectedChatIds.filter((x) => x !== id);
      if (isProtected) ids.push(id);
      state.settings = { ...state.settings, protectedChatIds: ids };
      return state.chats[id];
    });
  }

  public static appendOperationLog(log: OperationLog): Promise<void> {
    return this.mutate((state) => {
      // Keep last 250 operations to prevent unbounded growth
      state.operationLogs = [log, ...state.operationLogs].slice(0, 250);
    });
  }

  public static async getOperationLogs(): Promise<OperationLog[]> {
    const state = await this.getState();
    return state.operationLogs;
  }

  public static updatePlatformStatus(
    platform: PlatformId,
    status: {
      lastScanTimestamp?: number | null;
      connected?: boolean;
      totalDiscovered?: number;
      lastError?: string;
    }
  ): Promise<void> {
    return this.mutate((state) => {
      state.platformStatus[platform] = {
        ...state.platformStatus[platform],
        ...status,
      };
    });
  }

  public static resetAllData(): Promise<void> {
    return this.enqueue(async () => {
      const fresh = structuredClone(INITIAL_STORAGE_STATE);
      fresh.chats = {};
      fresh.operationLogs = [];
      fresh.settings = structuredClone(DEFAULT_SETTINGS);
      memoryFallback = structuredClone(fresh);
      await this.saveState(fresh);
    });
  }

  public static async exportDataJson(): Promise<string> {
    const state = await this.getState();
    return JSON.stringify(state, null, 2);
  }
}
