import { describe, it, expect } from 'vitest';
import { sanitizeSettingsUpdate } from '../../src/storage/settings-validation';

describe('sanitizeSettingsUpdate', () => {
  it('clamps numeric settings to their limits', () => {
    expect(
      sanitizeSettingsUpdate({ maxBatchSize: 500, actionDelayMs: 10, confidenceThreshold: 3, minimumAgeDays: -4 })
    ).toEqual({ maxBatchSize: 50, actionDelayMs: 500, confidenceThreshold: 1, minimumAgeDays: 0 });

    expect(sanitizeSettingsUpdate({ maxBatchSize: 0, confidenceThreshold: -0.2 })).toEqual({
      maxBatchSize: 1,
      confidenceThreshold: 0,
    });
  });

  it('keeps in-range values unchanged', () => {
    const payload = { maxBatchSize: 10, actionDelayMs: 1200, confidenceThreshold: 0.65, minimumAgeDays: 3 };
    expect(sanitizeSettingsUpdate(payload)).toEqual(payload);
  });

  it('drops unknown keys, schemaVersion and values of the wrong type', () => {
    expect(
      sanitizeSettingsUpdate({
        evil: true,
        __proto__polluted: 1,
        schemaVersion: 99,
        maxBatchSize: '50',
        actionDelayMs: NaN,
        dryRunDefault: 'no',
        theme: 'neon',
        protectedKeywords: ['taxes', 7, null],
        autoScanOnVisit: true,
      })
    ).toEqual({ protectedKeywords: ['taxes'], autoScanOnVisit: true });
  });

  it('keeps only known boolean platform toggles', () => {
    expect(sanitizeSettingsUpdate({ enabledPlatforms: { gemini: false, bing: true, claude: 'yes' } })).toEqual({
      enabledPlatforms: { gemini: false },
    });
  });

  it('returns an empty update for non-object payloads', () => {
    expect(sanitizeSettingsUpdate(null)).toEqual({});
    expect(sanitizeSettingsUpdate('maxBatchSize=50')).toEqual({});
  });
});
