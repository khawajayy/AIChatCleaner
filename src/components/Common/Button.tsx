import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const baseStyles =
  'inline-flex items-center justify-center whitespace-nowrap font-medium rounded-lg select-none transition-colors duration-150 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ' +
  'disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:shrink-0';

const variantStyles = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover shadow-card',
  secondary:
    'bg-surface text-fg border border-border hover:bg-surface-2 hover:border-border-strong shadow-card',
  danger: 'bg-danger text-white hover:bg-danger-hover shadow-card',
  ghost: 'bg-transparent text-fg-muted hover:bg-surface-2 hover:text-fg',
  outline: 'bg-transparent text-fg border border-border-strong hover:bg-surface-2',
};

const sizeStyles = {
  sm: 'h-9 px-3 text-sm gap-1.5 [&_svg]:size-4',
  md: 'h-10 px-4 text-sm gap-2 [&_svg]:size-4',
  lg: 'h-12 px-5 text-base gap-2.5 [&_svg]:size-5',
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  icon,
  fullWidth = false,
  className = '',
  disabled,
  type = 'button',
  ...props
}) => {
  return (
    <button
      type={type}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : (
        icon
      )}
      {children}
    </button>
  );
};
