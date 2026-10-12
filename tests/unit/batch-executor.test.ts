import { describe, it, expect, beforeEach } from 'vitest';
import { SafeBatchExecutor } from '../../src/background/batch-executor';
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
