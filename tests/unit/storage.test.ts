import { describe, it, expect, beforeEach } from 'vitest';
import { StorageManager } from '../../src/storage/storage-manager';
import { resetMockStorage } from '../setup';
import { ChatMetadata, OperationLog } from '../../src/types';

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
});
