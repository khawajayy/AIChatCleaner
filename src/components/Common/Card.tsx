import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  glow = false,
  ...props
}) => {
  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-900/70 backdrop-blur-md p-5 transition-all duration-200 ${
        glow ? 'shadow-glow border-brand-500/30' : 'hover:border-slate-750'
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
