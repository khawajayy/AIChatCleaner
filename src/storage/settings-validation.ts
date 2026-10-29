import { PlatformId, UserSettings } from '../types';

export const SETTINGS_LIMITS = {
  maxBatchSize: { min: 1, max: 50 },
  actionDelayMs: { min: 500, max: 60_000 },
  confidenceThreshold: { min: 0, max: 1 },
  minimumAgeDays: { min: 0, max: 3650 },
} as const;

const PLATFORMS: PlatformId[] = ['chatgpt', 'gemini', 'claude'];
const THEMES: UserSettings['theme'][] = ['dark', 'light', 'system'];

function clampNumber(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined;
  return Math.min(max, Math.max(min, value));
}

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((v): v is string => typeof v === 'string');
}

/**
 * Turns an UPDATE_SETTINGS payload into a safe partial: numbers are clamped to
 * their limits, values of the wrong type and unknown keys are dropped.
 * `schemaVersion` is owned by migrations and never accepted from a message.
 */
export function sanitizeSettingsUpdate(payload: unknown): Partial<UserSettings> {
  if (!payload || typeof payload !== 'object') return {};
  const input = payload as Record<string, unknown>;
  const out: Partial<UserSettings> = {};

  const batch = clampNumber(input.maxBatchSize, SETTINGS_LIMITS.maxBatchSize.min, SETTINGS_LIMITS.maxBatchSize.max);
  if (batch !== undefined) out.maxBatchSize = Math.round(batch);

  const delay = clampNumber(input.actionDelayMs, SETTINGS_LIMITS.actionDelayMs.min, SETTINGS_LIMITS.actionDelayMs.max);
  if (delay !== undefined) out.actionDelayMs = Math.round(delay);

  const threshold = clampNumber(
    input.confidenceThreshold,
    SETTINGS_LIMITS.confidenceThreshold.min,
    SETTINGS_LIMITS.confidenceThreshold.max
  );
  if (threshold !== undefined) out.confidenceThreshold = threshold;

  const age = clampNumber(input.minimumAgeDays, SETTINGS_LIMITS.minimumAgeDays.min, SETTINGS_LIMITS.minimumAgeDays.max);
  if (age !== undefined) out.minimumAgeDays = age;

  for (const key of ['dryRunDefault', 'autoScanOnVisit', 'onboardingCompleted', 'aiClassificationOptIn'] as const) {
    if (typeof input[key] === 'boolean') out[key] = input[key] as boolean;
  }

  for (const key of ['protectedKeywords', 'protectedRegexPatterns', 'protectedChatIds'] as const) {
    const list = stringList(input[key]);
    if (list) out[key] = list;
  }

  if (THEMES.includes(input.theme as UserSettings['theme'])) {
    out.theme = input.theme as UserSettings['theme'];
  }

  const platforms = input.enabledPlatforms;
  if (platforms && typeof platforms === 'object') {
    const enabled: Partial<Record<PlatformId, boolean>> = {};
    for (const p of PLATFORMS) {
      const v = (platforms as Record<string, unknown>)[p];
      if (typeof v === 'boolean') enabled[p] = v;
    }
    if (Object.keys(enabled).length) out.enabledPlatforms = enabled as Record<PlatformId, boolean>;
  }

  return out;
}
