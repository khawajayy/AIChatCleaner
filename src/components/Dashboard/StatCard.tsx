import React from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  onClick?: () => void;
  accentColor?: 'brand' | 'amber' | 'rose' | 'blue';
}

const iconTone = {
  brand: 'bg-accent-soft text-accent-text',
  amber: 'bg-warning-soft text-warning-text',
  rose: 'bg-danger-soft text-danger-text',
  blue: 'bg-info-soft text-info-text',
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  badge,
  onClick,
  accentColor = 'brand',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-xl border border-border bg-surface p-5 text-left shadow-card transition-colors hover:border-border-strong"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] font-medium text-fg-muted">{title}</p>
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg]:size-5 ${iconTone[accentColor]}`}>
          {icon}
        </span>
      </div>
      <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">{value}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-sm text-fg-subtle">{subtitle}</p>
        {badge}
      </div>
    </button>
  );
};
