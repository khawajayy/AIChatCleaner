import React from 'react';
import { Card } from '../Common/Card';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  onClick?: () => void;
  accentColor?: 'brand' | 'amber' | 'rose' | 'blue';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  badge,
  onClick,
  accentColor = 'brand',
}) => {
  const accentGlow = {
    brand: 'border-l-4 border-l-brand-500',
    amber: 'border-l-4 border-l-amber-500',
    rose: 'border-l-4 border-l-rose-500',
    blue: 'border-l-4 border-l-blue-500',
  };

  return (
    <Card
      onClick={onClick}
      className={`relative overflow-hidden cursor-pointer hover:border-slate-700 transition-all ${accentGlow[accentColor]}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <h4 className="text-3xl font-bold text-white mt-1.5 tracking-tight font-mono">{value}</h4>
          <p className="text-xs text-slate-400 mt-2">{subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700/60">
            {icon}
          </div>
          {badge}
        </div>
      </div>
    </Card>
  );
};
