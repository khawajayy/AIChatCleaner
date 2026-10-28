import { ChatMetadata, ClassificationCategory, UserSettings } from '../types';
import { ExtensionMessage } from '../types/messages';
import { StorageManager, STORAGE_KEY } from './storage-manager';

/**
 * Storage writes for the dashboard and popup. Each one is sent to the background
 * worker, which applies it to the latest stored state on its single write queue, so
 * writes from different extension pages and running batches cannot clobber each other.
 * Reads stay direct (StorageManager.getState) and pages refresh via onStorageChanged.
 *
 * Outside the extension (standalone preview) there is no worker and only one writer,
 * so writes go straight to StorageManager.
 */
function hasWorker(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime?.id && !!chrome.runtime.sendMessage;
}

async function send(message: ExtensionMessage): Promise<any> {
  return chrome.runtime.sendMessage(message);
}

export const StorageClient = {
  async updateSettings(partial: Partial<UserSettings>, options: { reclassify?: boolean } = {}): Promise<UserSettings> {
    if (!hasWorker()) return StorageManager.updateSettings(partial);
    const res = await send({ type: 'UPDATE_SETTINGS', payload: partial, reclassify: options.reclassify });
    if (!res || res.success === false) throw new Error(res?.error || 'Settings could not be saved.');
    return res;
  },

  async setChatProtection(chatId: string, isProtected: boolean): Promise<ChatMetadata | null> {
    if (!hasWorker()) return StorageManager.setChatProtection(chatId, isProtected);
    const res = await send({ type: 'SET_CHAT_PROTECTION', chatId, isProtected });
    return res?.chat ?? null;
  },

  async setChatCategory(chatId: string, category: ClassificationCategory): Promise<ChatMetadata | null> {
    if (!hasWorker()) {
      return StorageManager.updateChat(chatId, { category, userOverrideCategory: category });
    }
    const res = await send({ type: 'UPDATE_CHAT_CATEGORY', chatId, category });
    return res?.chat ?? null;
  },

  async resetAllData(): Promise<void> {
    if (!hasWorker()) return StorageManager.resetAllData();
    const res = await send({ type: 'RESET_STORAGE' });
    if (!res?.success) throw new Error(res?.error || 'Data could not be reset.');
  },
};

/** Calls `onChange` whenever the stored state changes, from any extension context. Returns an unsubscribe function. */
export function onStorageChanged(onChange: () => void): () => void {
  if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) return () => {};
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === 'local' && changes[STORAGE_KEY]) onChange();
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
