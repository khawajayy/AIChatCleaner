import React from 'react';
import { Card } from '../Common/Card';
import { UserSettings, PlatformId } from '../../types';
import { ShieldCheck, Sliders, Layers } from 'lucide-react';

interface GeneralSettingsProps {
  settings: UserSettings;
  onUpdate: (partial: Partial<UserSettings>) => void;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings, onUpdate }) => {
  const togglePlatform = (p: PlatformId) => {
    onUpdate({
      enabledPlatforms: {
        ...settings.enabledPlatforms,
        [p]: !settings.enabledPlatforms[p],
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Safety Defaults */}
      <Card>
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <ShieldCheck className="w-4 h-4 text-brand-400" />
          <h5 className="font-semibold text-sm text-white">Execution Safety Controls</h5>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          {/* Dry Run Default */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="font-semibold text-slate-200">Default to Dry-Run Mode</span>
              <p className="text-slate-400 text-[11px] mt-0.5">
                When enabled, batch actions default to a simulated trial so you can preview operations before anything is deleted.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.dryRunDefault}
              onChange={(e) => onUpdate({ dryRunDefault: e.target.checked })}
              className="mt-1 rounded border-slate-700 bg-slate-800 text-brand-500 focus:ring-brand-400 cursor-pointer"
            />
          </div>

          {/* Max Batch Size */}
          <div className="pt-3 border-t border-slate-850 flex items-center justify-between gap-4">
            <div>
              <span className="font-semibold text-slate-200">Maximum Batch Size</span>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Hard ceiling on the number of conversations processed in a single batch (1-50).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="50"
                value={settings.maxBatchSize}
                onChange={(e) => onUpdate({ maxBatchSize: Math.max(1, Math.min(50, Number(e.target.value))) })}
                className="w-16 px-2.5 py-1 text-center font-mono rounded-lg bg-slate-800 border border-slate-700 text-slate-200"
              />
              <span className="text-slate-400 text-[11px]">chats</span>
            </div>
          </div>

          {/* Action Delay Pacing */}
          <div className="pt-3 border-t border-slate-850 flex items-center justify-between gap-4">
            <div>
              <span className="font-semibold text-slate-200">Sequential Action Delay</span>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Safe delay between actions to avoid rate limits and allow visual verification.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="500"
                max="5000"
                step="100"
                value={settings.actionDelayMs}
                onChange={(e) => onUpdate({ actionDelayMs: Number(e.target.value) })}
                className="w-20 px-2.5 py-1 text-center font-mono rounded-lg bg-slate-800 border border-slate-700 text-slate-200"
              />
              <span className="text-slate-400 text-[11px]">ms</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Classification Thresholds */}
      <Card>
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Sliders className="w-4 h-4 text-brand-400" />
          <h5 className="font-semibold text-sm text-white">Classification Thresholds</h5>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          {/* Minimum Age */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-slate-200">Minimum Age Protection Window</span>
              <span className="font-mono text-brand-400">{settings.minimumAgeDays} days</span>
            </div>
            <p className="text-slate-400 text-[11px] mb-2">
              Conversations newer than this threshold are protected from cleanup suggestions unless explicitly empty.
            </p>
            <input
              type="range"
              min="0"
              max="30"
              value={settings.minimumAgeDays}
              onChange={(e) => onUpdate({ minimumAgeDays: Number(e.target.value) })}
              className="w-full accent-brand-500 cursor-pointer"
            />
          </div>

          {/* Confidence Threshold */}
          <div className="pt-3 border-t border-slate-850">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-slate-200">Cleanup Confidence Threshold</span>
              <span className="font-mono text-brand-400">{Math.round(settings.confidenceThreshold * 100)}%</span>
            </div>
            <p className="text-slate-400 text-[11px] mb-2">
              Suggestions with confidence below this threshold are downgraded to "Needs Review" instead of direct cleanup candidates.
            </p>
            <input
              type="range"
              min="0.5"
              max="0.95"
              step="0.05"
              value={settings.confidenceThreshold}
              onChange={(e) => onUpdate({ confidenceThreshold: Number(e.target.value) })}
              className="w-full accent-brand-500 cursor-pointer"
            />
          </div>
        </div>
      </Card>

      {/* Platform Toggles */}
      <Card>
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Layers className="w-4 h-4 text-brand-400" />
          <h5 className="font-semibold text-sm text-white">Supported Platforms</h5>
        </div>

        <div className="mt-4 space-y-3 text-xs">
          {(['chatgpt', 'gemini', 'claude'] as PlatformId[]).map((p) => {
            const name = p === 'chatgpt' ? 'ChatGPT (chatgpt.com)' : p === 'gemini' ? 'Google Gemini (gemini.google.com)' : 'Anthropic Claude (claude.ai)';
            const enabled = settings.enabledPlatforms[p];

            return (
              <div key={p} className="flex items-center justify-between py-1.5">
                <span className="text-slate-200 font-medium">{name}</span>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => togglePlatform(p)}
                  className="rounded border-slate-700 bg-slate-800 text-brand-500 focus:ring-brand-400 cursor-pointer"
                />
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
