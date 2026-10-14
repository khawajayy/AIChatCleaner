import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'md' | 'lg';
}

const paddingStyles = {
  none: '',
  md: 'p-5',
  lg: 'p-6',
};

export const Card: React.FC<CardProps> = ({ children, className = '', padding = 'lg', ...props }) => {
  return (
    <div
      className={`rounded-xl border border-border bg-surface shadow-card ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ icon, title, description, action }) => (
  <div className="flex items-start justify-between gap-4 pb-4 mb-5 border-b border-border">
    <div className="flex items-start gap-3 min-w-0">
      {icon && (
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-fg-muted [&_svg]:size-[18px]">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-fg leading-6">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
