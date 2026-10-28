import { ClassifierRule, RuleEvaluation, ClassificationContext } from './types';
import { ChatMetadata, UserSettings } from '../types';

/**
 * Normalizes strings for similarity and keyword matching
 */
function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/[^\w\s]/g, '');
}

/** Crude plural stemmer so "taxes" protects "Tax" and "contract" protects "Contracts". */
function stem(word: string): string {
  if (word.length > 4 && word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (/(x|z|ch|sh|ss)es$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

/**
 * True when the title contains the keyword as text, or any title word shares its stem.
 * Errs toward matching: a false match only keeps a chat.
 */
export function matchesProtectedKeyword(title: string, keyword: string): boolean {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return false;
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes(kw)) return true;

  const kwWords = kw.split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(stem);
  const titleWords = lowerTitle.split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(stem);
  if (kwWords.length === 0) return false;
  if (kwWords.length === 1) return titleWords.includes(kwWords[0]);
  // Multi-word keyword: consecutive stemmed words
  return titleWords.some((_, i) => kwWords.every((w, j) => titleWords[i + j] === w));
}

/**
 * 1. User Protection Rule - Absolute override to Keep
 */
export const RuleUserProtection: ClassifierRule = {
  id: 'rule-user-protection',
  name: 'Protected Conversation Guardian',
  description: 'Prevents any chat matching user protected keywords, regex patterns, or IDs from being flagged for cleanup.',
  evaluate(chat: ChatMetadata, settings: UserSettings): RuleEvaluation {
    if (chat.isProtected || settings.protectedChatIds.includes(chat.id)) {
      return {
        ruleId: 'rule-user-protection',
        triggered: true,
        score: -100,
        categoryHint: 'keep',
        weight: 100,
        reason: 'Protected: Explicitly locked or protected by user preference.',
      };
    }

    // Check keywords
    for (const kw of settings.protectedKeywords) {
      if (kw && matchesProtectedKeyword(chat.title, kw)) {
        return {
          ruleId: 'rule-user-protection',
          triggered: true,
          score: -100,
          categoryHint: 'keep',
          weight: 100,
          reason: `Protected: Matches user protected keyword "${kw}".`,
        };
      }
    }

    // Check regex patterns
    for (const pattern of settings.protectedRegexPatterns) {
      try {
        const rx = new RegExp(pattern, 'i');
        if (rx.test(chat.title)) {
          return {
            ruleId: 'rule-user-protection',
            triggered: true,
            score: -100,
            categoryHint: 'keep',
            weight: 100,
            reason: `Protected: Matches user regex pattern "${pattern}".`,
          };
        }
      } catch {
        // Ignore invalid user regex
      }
    }

    return { ruleId: 'rule-user-protection', triggered: false, score: 0, weight: 0 };
  },
};

/**
 * 2. User Explicit Override Rule
 */
export const RuleUserOverride: ClassifierRule = {
  id: 'rule-user-override',
  name: 'User Override Rule',
  description: 'Honors any manual classification set by the user.',
  evaluate(chat: ChatMetadata): RuleEvaluation {
    if (chat.userOverrideCategory) {
      return {
        ruleId: 'rule-user-override',
        triggered: true,
        score: chat.userOverrideCategory === 'cleanup' ? 50 : -50,
        categoryHint: chat.userOverrideCategory,
        weight: 90,
        reason: `User decision: Manually classified as "${chat.userOverrideCategory}".`,
      };
    }
    return { ruleId: 'rule-user-override', triggered: false, score: 0, weight: 0 };
  },
};

/**
 * 3. Empty or Abandoned Draft Rule
 */
export const RuleEmptyOrDraft: ClassifierRule = {
  id: 'rule-empty-or-draft',
  name: 'Empty or Abandoned Conversation Rule',
  description: 'Flags empty chats, default placeholder titles, or abandoned initial prompts.',
  evaluate(chat: ChatMetadata): RuleEvaluation {
    const defaultTitles = [
      'new chat',
      'untitled',
      'new conversation',
      'gemini',
      'claude',
      'chat',
      'new message',
    ];
    const normTitle = normalizeText(chat.title);
    const isDefaultTitle = defaultTitles.includes(normTitle);

    if (chat.isEmpty) {
      return {
        ruleId: 'rule-empty-or-draft',
        triggered: true,
        score: 40,
        categoryHint: 'cleanup',
        weight: 80,
        reason: 'Empty conversation: Conversation is empty with zero user messages.',
      };
    }

    if (isDefaultTitle && (chat.messageCount === null || chat.messageCount <= 1)) {
      return {
        ruleId: 'rule-empty-or-draft',
        triggered: true,
        score: 35,
        categoryHint: 'cleanup',
        weight: 75,
        reason: 'Cleanup candidate: Default placeholder title with no substantive follow-up.',
      };
    }

    return { ruleId: 'rule-empty-or-draft', triggered: false, score: 0, weight: 0 };
  },
};

/**
 * 4. Obvious Test Prompt & Casual Experimentation Rule
 */
export const RuleAccidentalOrTestPrompt: ClassifierRule = {
  id: 'rule-accidental-or-test',
  name: 'Accidental or Test Prompt Rule',
  description: 'Identifies brief diagnostic prompts, typos, or throwaway experiments.',
  evaluate(chat: ChatMetadata): RuleEvaluation {
    const testPatterns = [
      /^test(ing)?(\s*\d+)?$/i,
      /^hello\??$/i,
      /^hi\??$/i,
      /^hey\??$/i,
      /^ping\??$/i,
      /^pong\??$/i,
      /^can you hear me\??$/i,
      /^are you there\??$/i,
      /^asdf\w*$/i,
      /^qwer\w*$/i,
      // Lone numbers or one repeated character ("1", "42", "aaa", "...").
      // Short words are left alone: "SQL", "API", "Git", "Tax" are real topics.
      /^\d{1,3}$/,
      /^(.)\1+$/,
      /^prompt test$/i,
      /^check$/i,
    ];

    const title = chat.title.trim();
    for (const pattern of testPatterns) {
      if (pattern.test(title)) {
        return {
          ruleId: 'rule-accidental-or-test',
          triggered: true,
          score: 38,
          categoryHint: 'cleanup',
          weight: 70,
          reason: 'Cleanup candidate: Obvious test prompt or accidental short query with no sustained dialogue.',
        };
      }
    }

    return { ruleId: 'rule-accidental-or-test', triggered: false, score: 0, weight: 0 };
  },
};

/**
 * 5. One-Off Quick Factual Lookup Rule
 */
export const RuleOneOffFactual: ClassifierRule = {
  id: 'rule-one-off-factual',
  name: 'Single Factual Query Rule',
  description: 'Flags isolated factual queries that are rarely referenced again.',
  evaluate(chat: ChatMetadata): RuleEvaluation {
    const factualPrefixes = [
      'what is the weather',
      'convert',
      'how many',
      'what time is',
      'currency conversion',
      'calculator',
      'capital of',
      'distance between',
      'define ',
      'synonym for',
    ];

    const lower = chat.title.toLowerCase();
    const isFactual = factualPrefixes.some((prefix) => lower.startsWith(prefix));

    if (isFactual && (chat.messageCount === null || chat.messageCount <= 2)) {
      return {
        ruleId: 'rule-one-off-factual',
        triggered: true,
        score: 18,
        categoryHint: 'review',
        weight: 50,
        reason: 'Review: Single factual lookup or unit conversion with no apparent follow-up discussion.',
      };
    }

    return { ruleId: 'rule-one-off-factual', triggered: false, score: 0, weight: 0 };
  },
};

/**
 * 6. Duplicate or Repetitive Chat Rule
 */
export const RuleDuplicateOrRepetitive: ClassifierRule = {
  id: 'rule-duplicate-detection',
  name: 'Duplicate Title Detection Rule',
  description: 'Detects repetitive chats created with identical or incremented titles.',
  evaluate(chat: ChatMetadata, _settings: UserSettings, context?: ClassificationContext): RuleEvaluation {
    if (!context || !context.similarTitles) {
      return { ruleId: 'rule-duplicate-detection', triggered: false, score: 0, weight: 0 };
    }

    const norm = normalizeText(chat.title);
    // Ignore empty or very short strings
    if (norm.length < 4) {
      return { ruleId: 'rule-duplicate-detection', triggered: false, score: 0, weight: 0 };
    }

    const count = context.similarTitles.get(norm) || 0;
    if (count > 1) {
      return {
        ruleId: 'rule-duplicate-detection',
        triggered: true,
        score: 22,
        categoryHint: 'review',
        weight: 60,
        reason: `Review: Appears to duplicate ${count - 1} other conversation(s) with an identical topic title.`,
      };
    }

    return { ruleId: 'rule-duplicate-detection', triggered: false, score: 0, weight: 0 };
  },
};

/**
 * 7. Minimum Age Safety Damping Rule
 */
export const RuleMinimumAgeDamping: ClassifierRule = {
  id: 'rule-minimum-age-damping',
  name: 'Recent Conversation Protection Rule',
  description: 'Dampens cleanup suggestions for freshly created chats to protect ongoing work.',
  evaluate(chat: ChatMetadata, settings: UserSettings): RuleEvaluation {
    if (!chat.lastActivityTimestamp) {
      return { ruleId: 'rule-minimum-age-damping', triggered: false, score: 0, weight: 0 };
    }

    const ageInDays = (Date.now() - chat.lastActivityTimestamp) / (1000 * 60 * 60 * 24);

    if (ageInDays < settings.minimumAgeDays && !chat.isEmpty) {
      return {
        ruleId: 'rule-minimum-age-damping',
        triggered: true,
        score: -25,
        categoryHint: 'keep',
        weight: 55,
        reason: `Keep: Created recently (${ageInDays < 1 ? 'today' : Math.floor(ageInDays) + 'd ago'}), within the ${settings.minimumAgeDays}-day safety window.`,
      };
    }

    return { ruleId: 'rule-minimum-age-damping', triggered: false, score: 0, weight: 0 };
  },
};

export const ALL_RULES: ClassifierRule[] = [
  RuleUserProtection,
  RuleUserOverride,
  RuleEmptyOrDraft,
  RuleAccidentalOrTestPrompt,
  RuleOneOffFactual,
  RuleDuplicateOrRepetitive,
  RuleMinimumAgeDamping,
];
