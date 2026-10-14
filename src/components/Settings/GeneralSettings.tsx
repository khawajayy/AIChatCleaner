import React from 'react';
import { Card, CardHeader } from '../Common/Card';
import { Switch } from '../Common/Switch';
import { ThemeToggle } from '../Common/ThemeToggle';
import { PlatformMark, PLATFORM_META } from '../Common/PlatformMark';
import { inputClass } from '../Common/formStyles';
import { UserSettings, PlatformId } from '../../types';
import { ShieldCheck, SlidersHorizontal, Layers, Palette } from 'lucide-react';

interface GeneralSettingsProps {
  settings: UserSettings;
  onUpdate: (partial: Partial<UserSettings>) => void;
}

const SettingRow: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({
  title,
  description,
  children,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
    <div className="max-w-lg">
      <p className="text-[15px] font-medium">{title}</p>
      <p className="mt-0.5 text-sm text-fg-muted">{description}</p>
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings, onUpdate }) => {
  const togglePlatform = (p: PlatformId) => {
    onUpdate({
      enabledPlatforms: { ...settings.enabledPlatforms, [p]: !settings.enabledPlatforms[p] },
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader icon={<Palette />} title="Appearance" description="Choose a theme or follow your system setting." />
        <SettingRow title="Theme" description="Applies to the popup and this dashboard.">
          <ThemeToggle showLabels />
        </SettingRow>
      </Card>

      <Card>
        <CardHeader icon={<ShieldCheck />} title="Safety" description="Limits that apply to every batch action." />
        <div className="divide-y divide-border">
          <SettingRow
            title="Dry run by default"
            description="New batch actions start as a simulation so you can check them first."
          >
            <Switch
              checked={settings.dryRunDefault}
              onChange={(v) => onUpdate({ dryRunDefault: v })}
              label="Dry run by default"
            />
          </SettingRow>

          <SettingRow title="Maximum batch size" description="Most conversations processed in one batch (1–50).">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={50}
                value={settings.maxBatchSize}
                onChange={(e) => onUpdate({ maxBatchSize: Math.max(1, Math.min(50, Number(e.target.value))) })}
                className={`${inputClass} w-24 text-center tabular-nums`}
              />
              <span className="text-sm text-fg-muted">chats</span>
            </div>
          </SettingRow>

          <SettingRow title="Delay between actions" description="Pause between each action to avoid rate limits.">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={500}
                max={5000}
                step={100}
                value={settings.actionDelayMs}
                onChange={(e) => onUpdate({ actionDelayMs: Math.max(500, Math.min(5000, Number(e.target.value))) })}
                className={`${inputClass} w-24 text-center tabular-nums`}
              />
              <span className="text-sm text-fg-muted">ms</span>
            </div>
          </SettingRow>
        </div>
      </Card>

      <Card>
        <CardHeader icon={<SlidersHorizontal />} title="Classification" description="How aggressive cleanup suggestions are." />
        <div className="space-y-6">
          <RangeSetting
            title="Minimum age"
            description="Conversations newer than this are never suggested for cleanup, unless empty."
            value={settings.minimumAgeDays}
            display={`${settings.minimumAgeDays} day${settings.minimumAgeDays === 1 ? '' : 's'}`}
            min={0}
            max={30}
            step={1}
            onChange={(v) => onUpdate({ minimumAgeDays: v })}
          />
          <RangeSetting
            title="Cleanup confidence threshold"
            description="Below this, a suggestion goes to Needs review instead of Cleanup."
            value={settings.confidenceThreshold}
            display={`${Math.round(settings.confidenceThreshold * 100)}%`}
            min={0.5}
            max={0.95}
            step={0.05}
            onChange={(v) => onUpdate({ confidenceThreshold: v })}
          />
        </div>
      </Card>

      <Card>
        <CardHeader icon={<Layers />} title="Platforms" description="Turn off platforms you don't use." />
        <div className="divide-y divide-border">
          {(Object.keys(PLATFORM_META) as PlatformId[]).map((p) => (
            <div key={p} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <PlatformMark platform={p} />
                <div>
                  <p className="text-[15px] font-medium">{PLATFORM_META[p].name}</p>
                  <p className="text-sm text-fg-subtle">{PLATFORM_META[p].host}</p>
                </div>
              </div>
              <Switch
                checked={settings.enabledPlatforms[p]}
                onChange={() => togglePlatform(p)}
                label={`Enable ${PLATFORM_META[p].name}`}
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

const RangeSetting: React.FC<{
  title: string;
  description: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}> = ({ title, description, value, display, min, max, step, onChange }) => (
  <div>
    <div className="flex items-baseline justify-between gap-3">
      <p className="text-[15px] font-medium">{title}</p>
      <span className="rounded-md bg-surface-2 px-2 py-0.5 text-sm font-semibold tabular-nums">{display}</span>
    </div>
    <p className="mt-0.5 text-sm text-fg-muted">{description}</p>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label={title}
      className="mt-3 w-full cursor-pointer"
    />
  </div>
);
