import { describe, it, expect } from 'vitest';
import { stampFirstSeen } from '../../src/storage/first-seen';
import { ChatMetadata } from '../../src/types';

const chat = (id: string, extra: Partial<ChatMetadata> = {}): ChatMetadata => ({
  id,
  platform: 'chatgpt',
  title: `Chat ${id}`,
  url: `https://chatgpt.com/c/${id}`,
  lastActivityTimestamp: null,
  messageCount: null,
  isEmpty: false,
  isUnfinished: false,
  category: 'keep',
  confidence: 0.5,
  reasons: [],
  lastScannedAt: 0,
  supportsArchive: false,
  supportsDelete: true,
  status: 'discovered',
  isProtected: false,
  ...extra,
});

const NOW = 1_800_000_000_000;

describe('stampFirstSeen', () => {
  it('leaves every age unknown on the first scan', () => {
    const out = stampFirstSeen([chat('a'), chat('b')], {}, NOW);
    expect(out.map((c) => c.firstSeenAt)).toEqual([null, null]);
  });

  it('dates new chats above a known chat and leaves scrolled-in chats unknown', () => {
    const known = { b: chat('b', { firstSeenAt: null }), c: chat('c', { firstSeenAt: NOW - 1000 }) };
    const out = stampFirstSeen([chat('new'), chat('b'), chat('c'), chat('older')], known, NOW);
    expect(out.map((c) => [c.id, c.firstSeenAt])).toEqual([
      ['new', NOW],
      ['b', null],
      ['c', NOW - 1000],
      ['older', null],
    ]);
  });

  it('ignores known chats from another platform', () => {
    const known = { b: chat('b', { platform: 'claude' }) };
    const out = stampFirstSeen([chat('a'), chat('b')], known, NOW);
    expect(out.map((c) => c.firstSeenAt)).toEqual([null, null]);
  });
});
