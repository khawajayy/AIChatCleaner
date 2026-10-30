import { describe, it, expect, beforeEach } from 'vitest';
import { StorageManager } from '../../src/storage/storage-manager';
import { resetMockStorage } from '../setup';
import { ChatMetadata, OperationLog } from '../../src/types';

const makeChat = (id: string, overrides: Partial<ChatMetadata> = {}): ChatMetadata => ({
  id,
  platform: 'chatgpt',
  title: `Chat ${id}`,
  url: `https://chatgpt.com/c/${id}`,
  lastActivityTimestamp: null,
  messageCount: null,
  isEmpty: false,
  isUnfinished: false,
  category: 'cleanup',
  confidence: 0.8,
  reasons: [],
  lastScannedAt: Date.now(),
  supportsArchive: true,
  supportsDelete: true,
  status: 'discovered',
  isProtected: false,
  ...overrides,
});

describe('StorageManager & Schema Migration', () => {
  beforeEach(() => {
    resetMockStorage();
  });

  it('migrates unversioned or empty state to current schema', () => {
    const migrated = StorageManager.migrate({});
    expect(migrated.version).toBe(1);
    expect(migrated.settings).toBeDefined();
    expect(migrated.settings.maxBatchSize).toBe(10);
    expect(migrated.chats).toEqual({});
  });

  it('preserves existing settings during migration', () => {
    const oldData = {
      version: 0,
      settings: {
        maxBatchSize: 25,
        theme: 'light',
      },
    };
    const migrated = StorageManager.migrate(oldData);
    expect(migrated.settings.maxBatchSize).toBe(25);
    expect(migrated.settings.theme).toBe('light');
    expect(migrated.version).toBe(1);
  });

  it('saves, updates, and retrieves chats correctly', async () => {
    const dummyChat: ChatMetadata = {
      id: 'test-chat-1',
      platform: 'chatgpt',
      title: 'Initial Title',
      url: 'https://chatgpt.com/c/test-chat-1',
      lastActivityTimestamp: null,
      messageCount: null,
      isEmpty: false,
      isUnfinished: false,
      category: 'cleanup',
      confidence: 0.8,
      reasons: ['Initial reason'],
      lastScannedAt: Date.now(),
      supportsArchive: true,
      supportsDelete: true,
      status: 'discovered',
      isProtected: false,
    };

    await StorageManager.saveChats([dummyChat]);
    const retrieved = await StorageManager.getChatById('test-chat-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.title).toBe('Initial Title');

    await StorageManager.updateChat('test-chat-1', { status: 'deleted' });
    const updated = await StorageManager.getChatById('test-chat-1');
    expect(updated?.status).toBe('deleted');
  });

  it('appends and caps operation audit logs', async () => {
    const log: OperationLog = {
      id: 'log-1',
      batchId: 'batch-1',
      timestamp: Date.now(),
      platform: 'chatgpt',
      chatId: 'c1',
      chatTitle: 'Test Chat',
      action: 'dry_run',
      success: true,
      verified: true,
    };

    await StorageManager.appendOperationLog(log);
    const logs = await StorageManager.getOperationLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].id).toBe('log-1');
  });

  it('exports JSON and resets state properly', async () => {
    const jsonStr = await StorageManager.exportDataJson();
    expect(jsonStr).toContain('settings');

    await StorageManager.resetAllData();
    const chats = await StorageManager.getChats();
    expect(chats.length).toBe(0);
  });

  it('does not lose updates when writers interleave', async () => {
    await StorageManager.saveChats([makeChat('a'), makeChat('b')]);

    // Each of these reads the whole state and writes it back; without the write
    // queue they all read the same snapshot and only the last one survives.
    await Promise.all([
      StorageManager.updateChat('a', { status: 'deleted' }),
      StorageManager.setChatProtection('b', true),
      StorageManager.updateSettings({ theme: 'dark' }),
      StorageManager.appendOperationLog({
        id: 'log-1',
        batchId: 'batch-1',
        timestamp: Date.now(),
        platform: 'chatgpt',
        chatId: 'a',
        chatTitle: 'Chat a',
        action: 'delete',
        success: true,
        verified: true,
      }),
      StorageManager.updatePlatformStatus('chatgpt', { totalDiscovered: 2 }),
    ]);

    const state = await StorageManager.getState();
    expect(state.chats['a'].status).toBe('deleted');
    expect(state.chats['b'].isProtected).toBe(true);
    expect(state.settings.protectedChatIds).toEqual(['b']);
    expect(state.settings.theme).toBe('dark');
    expect(state.operationLogs.map((l) => l.id)).toEqual(['log-1']);
    expect(state.platformStatus.chatgpt.totalDiscovered).toBe(2);
  });

  it('runs a slow mutation to completion before the next write reads state', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));

    const slow = StorageManager.mutate(async (state) => {
      await gate;
      state.settings.protectedChatIds = ['kept'];
    });
    const fast = StorageManager.updateSettings({ maxBatchSize: 3 });
    release();
    await Promise.all([slow, fast]);

    const settings = await StorageManager.getSettings();
    expect(settings.protectedChatIds).toEqual(['kept']);
    expect(settings.maxBatchSize).toBe(3);
  });

  it('keeps going after a failed mutation', async () => {
    await expect(
      StorageManager.mutate(() => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
    await StorageManager.updateSettings({ maxBatchSize: 4 });
    expect((await StorageManager.getSettings()).maxBatchSize).toBe(4);
  });

  it('rescans keep status, protection and category overrides from storage', async () => {
    await StorageManager.saveChats([makeChat('a'), makeChat('b'), makeChat('c')]);
    await StorageManager.updateChat('a', { status: 'deleted' });
    await StorageManager.setChatProtection('b', true);
    await StorageManager.updateChat('c', { category: 'review', userOverrideCategory: 'review' });

    await StorageManager.saveChats([
      makeChat('a', { title: 'Renamed' }),
      makeChat('b'),
      makeChat('c'),
      makeChat('d'),
    ]);

    const state = await StorageManager.getState();
    expect(state.chats['a']).toMatchObject({ title: 'Renamed', status: 'deleted' });
    expect(state.chats['b']).toMatchObject({ isProtected: true, category: 'keep' });
    expect(state.chats['c']).toMatchObject({ category: 'review', userOverrideCategory: 'review' });
    expect(state.chats['d']).toMatchObject({ status: 'discovered', category: 'cleanup' });
  });

  it('rescans keep the first time a chat was seen', async () => {
    await StorageManager.saveChats([makeChat('a', { firstSeenAt: 1000 }), makeChat('b', { firstSeenAt: null })]);
    await StorageManager.saveChats([makeChat('a', { firstSeenAt: 9999 }), makeChat('b', { firstSeenAt: 9999 })]);

    const state = await StorageManager.getState();
    expect(state.chats['a'].firstSeenAt).toBe(1000);
    expect(state.chats['b'].firstSeenAt).toBeNull();
  });

  describe('saveScanResults', () => {
    it('flags chats of the scanned platform that the scan no longer lists', async () => {
      await StorageManager.saveChats([
        makeChat('a'),
        makeChat('b'),
        makeChat('g', { platform: 'gemini', url: 'https://gemini.google.com/app/g' }),
      ]);

      await StorageManager.saveScanResults('chatgpt', [makeChat('a')]);

      const state = await StorageManager.getState();
      expect(state.chats.a.missingSince).toBeFalsy();
      expect(state.chats.b.missingSince).toEqual(expect.any(Number));
      // Non-destructive: the chat and its status are kept
      expect(state.chats.b.status).toBe('discovered');
      // Other platforms are untouched
      expect(state.chats.g.missingSince).toBeFalsy();
    });

    it('does not flag anything when the scan found no chats', async () => {
      await StorageManager.saveChats([makeChat('a'), makeChat('b')]);

      await StorageManager.saveScanResults('chatgpt', []);

      const state = await StorageManager.getState();
      expect(state.chats.a.missingSince).toBeFalsy();
      expect(state.chats.b.missingSince).toBeFalsy();
    });

    it('unflags a chat that shows up again and keeps the first missing time', async () => {
      await StorageManager.saveChats([makeChat('a'), makeChat('b', { status: 'reviewed' })]);
      await StorageManager.saveScanResults('chatgpt', [makeChat('a')]);
      const firstMissing = (await StorageManager.getChatById('b'))!.missingSince;

      await StorageManager.saveScanResults('chatgpt', [makeChat('a')]);
      expect((await StorageManager.getChatById('b'))!.missingSince).toBe(firstMissing);

      await StorageManager.saveScanResults('chatgpt', [makeChat('a'), makeChat('b')]);
      const b = (await StorageManager.getChatById('b'))!;
      expect(b.missingSince).toBeFalsy();
      expect(b.status).toBe('reviewed');
    });
  });
});
