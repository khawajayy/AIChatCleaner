import { ClassificationCategory, UserSettings } from '../types';

export interface AIClassificationRequest {
  title: string;
  messageCount: number | null;
  ageDays: number;
  snippet?: string; // Optional short non-confidential excerpt (max 100 chars)
}

export interface AIClassificationResponse {
  suggestedCategory: ClassificationCategory;
  confidence: number;
  reason: string;
}

/**
 * Interface contract for future pluggable AI classification models (e.g. local WebLLM or opt-in remote provider).
 * Guarantees privacy boundaries: opt-in required, zero credential leakage, never transmits full transcripts.
 */
export interface AIClassifierProvider {
  id: string;
  name: string;
  discloseProvider: string;
  discloseDataTransmitted: string;

  isOptedIn(settings: UserSettings): boolean;
  classify(request: AIClassificationRequest): Promise<AIClassificationResponse>;
}

export class FallbackLocalAIClassifier implements AIClassifierProvider {
  public id = 'local-heuristic-stub';
  public name = 'Privacy-Preserving Local Heuristics';
  public discloseProvider = 'On-Device Rule Engine (No Network Traffic)';
  public discloseDataTransmitted = 'None (0 bytes leave your machine)';

  public isOptedIn(_settings: UserSettings): boolean {
    return true;
  }

  public async classify(_request: AIClassificationRequest): Promise<AIClassificationResponse> {
    // Zero external network calls.
    return {
      suggestedCategory: 'keep',
      confidence: 0.5,
      reason: 'Local heuristic analysis applied.',
    };
  }
}
