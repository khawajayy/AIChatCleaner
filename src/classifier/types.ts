import { ChatMetadata, ClassificationCategory, UserSettings } from '../types';

export interface ClassificationResult {
  category: ClassificationCategory;
  confidence: number; // 0.0 to 1.0
  reasons: string[];
  matchedRules: string[];
}

export interface RuleEvaluation {
  ruleId: string;
  triggered: boolean;
  score: number; // Positive = pushes toward cleanup, Negative = pushes toward keep
  reason?: string;
  categoryHint?: ClassificationCategory;
  weight: number;
}

export interface ClassifierRule {
  id: string;
  name: string;
  description: string;
  evaluate(chat: ChatMetadata, settings: UserSettings, context?: ClassificationContext): RuleEvaluation;
}

export interface ClassificationContext {
  allChats?: ChatMetadata[];
  similarTitles?: Map<string, number>;
}
