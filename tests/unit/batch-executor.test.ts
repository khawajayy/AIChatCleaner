import { describe, it, expect, beforeEach } from 'vitest';
import { SafeBatchExecutor, ActionDispatcher } from '../../src/background/batch-executor';
import { StorageManager } from '../../src/storage/storage-manager';
import { resetMockStorage } from '../setup';
import { ChatMetadata, UserSettings } from '../../src/types';
import { DEFAULT_SETTINGS } from '../../src/storage/schema';

describe('SafeBatchExecutor', () => {
  beforeEach(() => {
    resetMockStorage();
  });

  const dummyChats: ChatMetadata[] = Array.from({ length: 15 }, (_, i) => ({
    id: `chat-${i + 1}`,
    platform: 'chatgpt',
    title: `Chat ${i + 1}`,
    url: `https://chatgpt.com/c/chat-${i + 1}`,
    lastActivityTimestamp: null,
    messageCount: null,
    isEmpty: false,
    isUnfinished: false,
    category: 'cleanup',
    confidence: 0.9,
    reasons: ['Test reason'],
    lastScannedAt: Date.now(),
    supportsArchive: true,
    supportsDelete: true,
    status: 'discovered',
    isProtected: false,
  }));

  it('strictly enforces the maxBatchSize ceiling', async () => {
    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      maxBatchSize: 5,
      actionDelayMs: 0,
    };

    const res = await SafeBatchExecutor.executeBatch(
      dummyChats,
      'delete',
      true, // dryRun
      settings
    );

    // Max 5 items executed despite 15 provided
    expect(res.results.length).toBe(5);
  });

  it('runs safely in dry-run mode without modifying status', async () => {
    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      maxBatchSize: 3,
      actionDelayMs: 0,
    };

    const res = await SafeBatchExecutor.executeBatch(
      dummyChats.slice(0, 3),
      'delete',
      true, // dryRun
      settings
    );

    expect(res.results.length).toBe(3);
    expect(res.results.every((r) => r.action === 'dry_run')).toBe(true);
    expect(res.results.every((r) => r.success)).toBe(true);
  });

  it('strictly protects and skips protected conversations', async () => {
    const chatsWithProtected: ChatMetadata[] = [
      { ...dummyChats[0], isProtected: true, title: 'Secret Pinned Chat' },
      { ...dummyChats[1], isProtected: false },
    ];

    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      maxBatchSize: 10,
      actionDelayMs: 0,
    };

    const res = await SafeBatchExecutor.executeBatch(
      chatsWithProtected,
      'delete',
      true,
      settings
    );

    expect(res.results[0].success).toBe(false);
    expect(res.results[0].error).toContain('strictly protected');
    expect(res.results[1].success).toBe(true);
  });

  it('skips a chat the user protects after the batch has started', async () => {
    const chats = dummyChats.slice(0, 3);
    await StorageManager.saveChats(chats.map((c) => ({ ...c })));
    const settings: UserSettings = { ...DEFAULT_SETTINGS, maxBatchSize: 10, actionDelayMs: 0 };

    const acted: string[] = [];
    const dispatcher: ActionDispatcher = async (chat, action) => {
      acted.push(chat.id);
      // While the first action runs, the user hits "protect" on the last chat
      if (chat.id === 'chat-1') await StorageManager.updateChat('chat-3', { isProtected: true });
      return { success: true, action, chatId: chat.id, platform: chat.platform, timestamp: Date.now(), verified: true };
    };

    const res = await SafeBatchExecutor.executeBatch(chats, 'delete', false, settings, undefined, dispatcher);

    expect(acted).toEqual(['chat-1', 'chat-2']);
    expect(res.results[2]).toMatchObject({ chatId: 'chat-3', success: false });
    expect(res.results[2].error).toContain('strictly protected');
  });

  it('skips a chat matching a keyword added after the batch started', async () => {
    const chats = [{ ...dummyChats[0], title: 'Quarterly invoices' }];
    await StorageManager.saveChats(chats.map((c) => ({ ...c })));
    await StorageManager.updateSettings({ protectedKeywords: ['invoice'] });

    const acted: string[] = [];
    const dispatcher: ActionDispatcher = async (chat, action) => {
      acted.push(chat.id);
      return { success: true, action, chatId: chat.id, platform: chat.platform, timestamp: Date.now(), verified: true };
    };

    // Settings snapshot from before the keyword was added
    const res = await SafeBatchExecutor.executeBatch(chats, 'delete', false, { ...DEFAULT_SETTINGS, actionDelayMs: 0 }, undefined, dispatcher);

    expect(acted).toEqual([]);
    expect(res.results[0].success).toBe(false);
  });

  it('supports in-flight cancellation', async () => {
    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      maxBatchSize: 10,
      actionDelayMs: 10,
    };

    const promise = SafeBatchExecutor.executeBatch(
      dummyChats.slice(0, 5),
      'delete',
      true,
      settings
    );

    SafeBatchExecutor.cancel();
    const res = await promise;
    expect(res.cancelled).toBe(true);
  });
});
