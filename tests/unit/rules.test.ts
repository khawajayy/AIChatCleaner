import { describe, it, expect } from 'vitest';
import {
  RuleUserProtection,
  RuleAccidentalOrTestPrompt,
  RuleOneOffFactual,
  RuleMinimumAgeDamping,
  RuleEmptyOrDraft,
} from '../../src/classifier/rules';
import { DEFAULT_SETTINGS } from '../../src/storage/schema';
import { ChatMetadata } from '../../src/types';

describe('Classifier Individual Rules', () => {
  const dummyChat: ChatMetadata = {
    id: 'c1',
    platform: 'chatgpt',
    title: 'test prompt',
    url: 'https://chatgpt.com/c/c1',
    lastActivityTimestamp: Date.now() - 1000 * 60 * 60 * 24 * 5,
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

  it('RuleUserProtection triggers for protectedChatIds', () => {
    const chat = { ...dummyChat, id: 'secret-123' };
    const settings = { ...DEFAULT_SETTINGS, protectedChatIds: ['secret-123'] };
    const evalRes = RuleUserProtection.evaluate(chat, settings);
    expect(evalRes.triggered).toBe(true);
    expect(evalRes.categoryHint).toBe('keep');
  });

  it('RuleAccidentalOrTestPrompt triggers for "asdf" and "ping"', () => {
    expect(RuleAccidentalOrTestPrompt.evaluate({ ...dummyChat, title: 'asdf' }, DEFAULT_SETTINGS).triggered).toBe(true);
    expect(RuleAccidentalOrTestPrompt.evaluate({ ...dummyChat, title: 'ping?' }, DEFAULT_SETTINGS).triggered).toBe(true);
    expect(RuleAccidentalOrTestPrompt.evaluate({ ...dummyChat, title: 'Architecture of Distributed DBs' }, DEFAULT_SETTINGS).triggered).toBe(false);
  });

  it('RuleOneOffFactual triggers for factual queries with few messages', () => {
    const factualChat = { ...dummyChat, title: 'what is the weather today', messageCount: 1 };
    const res = RuleOneOffFactual.evaluate(factualChat, DEFAULT_SETTINGS);
    expect(res.triggered).toBe(true);
    expect(res.categoryHint).toBe('review');
  });

  it('RuleMinimumAgeDamping protects chats created today', () => {
    const todayChat = { ...dummyChat, lastActivityTimestamp: Date.now() - 1000 * 60 * 60 * 2 }; // 2 hours ago
    const res = RuleMinimumAgeDamping.evaluate(todayChat, DEFAULT_SETTINGS);
    expect(res.triggered).toBe(true);
    expect(res.categoryHint).toBe('keep');
  });

  it('RuleEmptyOrDraft triggers for isEmpty chats', () => {
    const emptyChat = { ...dummyChat, isEmpty: true };
    const res = RuleEmptyOrDraft.evaluate(emptyChat, DEFAULT_SETTINGS);
    expect(res.triggered).toBe(true);
    expect(res.categoryHint).toBe('cleanup');
  });
});
