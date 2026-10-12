import { describe, it, expect } from 'vitest';
import { ClassificationEngine } from '../../src/classifier/engine';
import { DEFAULT_SETTINGS } from '../../src/storage/schema';
import { ChatMetadata } from '../../src/types';

describe('ClassificationEngine', () => {
  const baseChat: ChatMetadata = {
    id: 'chat-1',
    platform: 'chatgpt',
    title: 'Test prompt',
    url: 'https://chatgpt.com/c/chat-1',
    lastActivityTimestamp: Date.now() - 1000 * 60 * 60 * 24 * 10, // 10 days ago
    messageCount: 1,
    isEmpty: false,
    isUnfinished: false,
    category: 'keep',
    confidence: 0.5,
    reasons: [],
    lastScannedAt: Date.now(),
    supportsArchive: true,
    supportsDelete: true,
    status: 'discovered',
    isProtected: false,
  };

  it('classifies obvious test prompt as cleanup candidate with clear reason', () => {
    const chat: ChatMetadata = {
      ...baseChat,
      title: 'test 123',
    };

    const result = ClassificationEngine.classifyChat(chat, DEFAULT_SETTINGS);
    expect(result.category).toBe('cleanup');
    expect(result.confidence).toBeGreaterThanOrEqual(0.65);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons[0]).toContain('Cleanup candidate');
  });

  it('strictly protects conversations matching protected keyword', () => {
    const chat: ChatMetadata = {
      ...baseChat,
      title: 'My 2024 taxes and deductions',
    };

    const result = ClassificationEngine.classifyChat(chat, DEFAULT_SETTINGS);
    expect(result.category).toBe('keep');
    expect(result.confidence).toBe(1.0);
    expect(result.reasons[0]).toContain('Protected');
  });

  it('strictly protects conversations matching user regex pattern', () => {
    const chat: ChatMetadata = {
      ...baseChat,
      title: '[Work] Sprint Planning Q3',
    };

    const result = ClassificationEngine.classifyChat(chat, DEFAULT_SETTINGS);
    expect(result.category).toBe('keep');
    expect(result.confidence).toBe(1.0);
    expect(result.reasons[0]).toContain('Protected');
  });

  it('classifies empty chat as cleanup candidate', () => {
    const chat: ChatMetadata = {
      ...baseChat,
      title: 'New chat',
      isEmpty: true,
      messageCount: 0,
    };

    const result = ClassificationEngine.classifyChat(chat, DEFAULT_SETTINGS);
    expect(result.category).toBe('cleanup');
    expect(result.reasons[0]).toContain('Empty conversation');
  });

  it('detects duplicate conversations within batch context', () => {
    const batch: ChatMetadata[] = [
      { ...baseChat, id: 'd1', title: 'Python Web Scraper Script' },
      { ...baseChat, id: 'd2', title: 'Python Web Scraper Script' },
      { ...baseChat, id: 'd3', title: 'Something completely unique' },
    ];

    const classified = ClassificationEngine.classifyBatch(batch, DEFAULT_SETTINGS);
    const dup1 = classified.find((c) => c.id === 'd1');
    const dup2 = classified.find((c) => c.id === 'd2');

    expect(dup1?.reasons.some((r) => r.includes('duplicate'))).toBe(true);
    expect(dup2?.reasons.some((r) => r.includes('duplicate'))).toBe(true);
  });

  it('honors explicit user manual override', () => {
    const chat: ChatMetadata = {
      ...baseChat,
      title: 'test',
      userOverrideCategory: 'keep',
    };

    const result = ClassificationEngine.classifyChat(chat, DEFAULT_SETTINGS);
    expect(result.category).toBe('keep');
    expect(result.confidence).toBe(1.0);
    expect(result.reasons[0]).toContain('User decision');
  });
});
