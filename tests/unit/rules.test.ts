import { describe, it, expect } from 'vitest';
import {
  RuleUserProtection,
  RuleAccidentalOrTestPrompt,
  RuleOneOffFactual,
  RuleMinimumAgeDamping,
  RuleEmptyOrDraft,
  matchesProtectedKeyword,
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

  it('RuleAccidentalOrTestPrompt leaves short real topics alone', () => {
    for (const title of ['SQL', 'API', 'Git', 'Tax', 'UX', 'R', 'qwerty keyboard history']) {
      expect(RuleAccidentalOrTestPrompt.evaluate({ ...dummyChat, title }, DEFAULT_SETTINGS).triggered, title).toBe(false);
    }
    for (const title of ['42', 'aaa', '...', 'asdfgh', 'test 2']) {
      expect(RuleAccidentalOrTestPrompt.evaluate({ ...dummyChat, title }, DEFAULT_SETTINGS).triggered, title).toBe(true);
    }
  });

  it('protected keywords match plural and singular forms', () => {
    const isProtected = (title: string) => RuleUserProtection.evaluate({ ...dummyChat, title }, DEFAULT_SETTINGS).triggered;
    expect(isProtected('Tax documents 2025')).toBe(true); // default keyword "taxes"
    expect(isProtected('Tax')).toBe(true);
    expect(isProtected('Contracts for Q3')).toBe(true); // "contract"
    expect(isProtected('Client onboarding notes')).toBe(true);
    expect(isProtected('Refactor auth middleware')).toBe(false);
  });

  it('matchesProtectedKeyword handles multi-word keywords and stems', () => {
    expect(matchesProtectedKeyword('Notes on medical records', 'medical record')).toBe(true);
    expect(matchesProtectedKeyword('Record of medical visits', 'medical record')).toBe(false);
    expect(matchesProtectedKeyword('Passwords to rotate', 'password')).toBe(true);
    expect(matchesProtectedKeyword('Anything', '  ')).toBe(false);
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

  it('RuleMinimumAgeDamping keeps a chat first seen in the sidebar within the window', () => {
    const recent = { ...dummyChat, lastActivityTimestamp: null, firstSeenAt: Date.now() - 1000 * 60 * 60 * 5 };
    const res = RuleMinimumAgeDamping.evaluate(recent, DEFAULT_SETTINGS);
    expect(res.triggered).toBe(true);
    expect(res.categoryHint).toBe('keep');
    expect(res.reason).toContain('first saw it');
  });

  it('RuleMinimumAgeDamping ignores chats with unknown or old first sighting', () => {
    const unknown = { ...dummyChat, lastActivityTimestamp: null, firstSeenAt: null };
    const old = { ...dummyChat, lastActivityTimestamp: null, firstSeenAt: Date.now() - 1000 * 60 * 60 * 24 * 10 };
    expect(RuleMinimumAgeDamping.evaluate(unknown, DEFAULT_SETTINGS).triggered).toBe(false);
    expect(RuleMinimumAgeDamping.evaluate(old, DEFAULT_SETTINGS).triggered).toBe(false);
  });

  it('RuleEmptyOrDraft triggers for isEmpty chats', () => {
    const emptyChat = { ...dummyChat, isEmpty: true };
    const res = RuleEmptyOrDraft.evaluate(emptyChat, DEFAULT_SETTINGS);
    expect(res.triggered).toBe(true);
    expect(res.categoryHint).toBe('cleanup');
  });
});
