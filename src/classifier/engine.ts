import {
  ChatMetadata,
  ClassificationCategory,
  UserSettings,
} from '../types';
import {
  ALL_RULES,
  RuleUserProtection,
} from './rules';
import {
  ClassificationResult,
  ClassificationContext,
} from './types';

export class ClassificationEngine {
  /**
   * Prepares context such as duplicate title frequency across a list of chats
   */
  public static buildContext(chats: ChatMetadata[]): ClassificationContext {
    const similarTitles = new Map<string, number>();

    for (const chat of chats) {
      const norm = chat.title.trim().toLowerCase().replace(/[^\w\s]/g, '');
      if (norm.length >= 4) {
        similarTitles.set(norm, (similarTitles.get(norm) || 0) + 1);
      }
    }

    return {
      allChats: chats,
      similarTitles,
    };
  }

  /**
   * Evaluates a single conversation through the rule pipeline
   */
  public static classifyChat(
    chat: ChatMetadata,
    settings: UserSettings,
    context?: ClassificationContext
  ): ClassificationResult {
    // 1. Check protection first (absolute priority)
    const protectionEval = RuleUserProtection.evaluate(chat, settings, context);
    if (protectionEval.triggered) {
      return {
        category: 'keep',
        confidence: 1.0,
        reasons: [protectionEval.reason || 'Protected by user criteria.'],
        matchedRules: [protectionEval.ruleId],
      };
    }

    // 2. Evaluate all rules
    let aggregateScore = 0; // Negative = Keep, Positive = Cleanup
    let maxWeight = 0;
    const reasons: string[] = [];
    const matchedRules: string[] = [];

    for (const rule of ALL_RULES) {
      if (rule.id === 'rule-user-protection') continue; // already evaluated

      const evaluation = rule.evaluate(chat, settings, context);
      if (evaluation.triggered) {
        aggregateScore += evaluation.score;
        maxWeight = Math.max(maxWeight, evaluation.weight);
        matchedRules.push(evaluation.ruleId);
        if (evaluation.reason) {
          reasons.push(evaluation.reason);
        }

        // If user explicitly forced a manual override, return immediately
        if (rule.id === 'rule-user-override' && evaluation.categoryHint) {
          return {
            category: evaluation.categoryHint,
            confidence: 1.0,
            reasons: [evaluation.reason!],
            matchedRules: [rule.id],
          };
        }
      }
    }

    // 3. Determine category & confidence
    let category: ClassificationCategory = 'keep';
    let confidence = 0.5;

    // Normalizing aggregate score
    // High positive (> 30) => Cleanup candidate
    // Moderate positive (15 to 30) => Review
    // Low or negative (<= 15) => Keep
    if (aggregateScore >= 30) {
      category = 'cleanup';
      confidence = Math.min(0.95, 0.65 + (aggregateScore - 30) * 0.01);
    } else if (aggregateScore >= 15) {
      category = 'review';
      confidence = Math.min(0.85, 0.5 + (aggregateScore - 15) * 0.015);
    } else {
      category = 'keep';
      confidence = aggregateScore <= -20 ? 0.9 : 0.6;
    }

    // The minimum-age window is a promise, not a nudge: recent chats are never cleanup
    if (category === 'cleanup' && matchedRules.includes('rule-minimum-age-damping')) {
      category = 'keep';
      confidence = 0.6;
    }

    // Check user confidence threshold
    if (category === 'cleanup' && confidence < settings.confidenceThreshold) {
      // Downgrade to review if confidence does not meet user threshold
      category = 'review';
      reasons.push(
        `Review: Cleanup confidence (${Math.round(confidence * 100)}%) is below user threshold (${Math.round(settings.confidenceThreshold * 100)}%).`
      );
    }

    if (reasons.length === 0) {
      reasons.push('Keep: Active conversation with no low-value signals detected.');
    }

    return {
      category,
      confidence: Math.round(confidence * 100) / 100,
      reasons,
      matchedRules,
    };
  }

  /**
   * Classifies a batch of chats with context (detecting duplicates, etc.)
   */
  public static classifyBatch(
    chats: ChatMetadata[],
    settings: UserSettings
  ): ChatMetadata[] {
    const context = this.buildContext(chats);

    return chats.map((chat) => {
      const result = this.classifyChat(chat, settings, context);
      return {
        ...chat,
        category: result.category,
        confidence: result.confidence,
        reasons: result.reasons,
        isProtected:
          chat.isProtected ||
          result.matchedRules.includes('rule-user-protection'),
      };
    });
  }
}
