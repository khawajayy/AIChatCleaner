import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, ThemePreference } from '../Layout/ThemeProvider';

const options: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
];

interface ThemeToggleProps {
  showLabels?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ showLabels = false }) => {
  const { preference, setPreference } = useTheme();

  return (
    <div role="radiogroup" aria-label="Color theme" className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface-2 p-0.5">
      {options.map(({ value, label, Icon }) => {
        const active = preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${label} theme`}
            title={`${label} theme`}
            onClick={() => setPreference(value)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md text-sm font-medium transition-colors ${
              showLabels ? 'px-3' : 'w-8 justify-center'
            } ${active ? 'bg-surface text-fg shadow-card ring-1 ring-border' : 'text-fg-subtle hover:text-fg'}`}
          >
            <Icon className="size-4" />
            {showLabels && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
};
