import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  tone?: 'accent' | 'danger';
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, disabled, tone = 'accent' }) => {
  const onColor = tone === 'danger' ? 'bg-danger' : 'bg-accent';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? onColor : 'bg-surface-3'
      }`}
    >
      <span
        className={`inline-block size-5 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-150 ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
};
