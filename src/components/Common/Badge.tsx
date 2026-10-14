import React from 'react';

export type BadgeVariant = 'green' | 'amber' | 'rose' | 'blue' | 'slate' | 'purple';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  green: 'bg-accent-soft text-accent-text',
  amber: 'bg-warning-soft text-warning-text',
  rose: 'bg-danger-soft text-danger-text',
  blue: 'bg-info-soft text-info-text',
  slate: 'bg-surface-2 text-fg-muted',
  purple: 'bg-violet-soft text-violet-text',
};

const sizeStyles = {
  sm: 'text-xs px-2 py-0.5 gap-1 [&_svg]:size-3.5',
  md: 'text-sm px-2.5 py-1 gap-1.5 [&_svg]:size-4',
};

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'slate', size = 'md', className = '' }) => {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-md font-medium [&_svg]:shrink-0 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};
