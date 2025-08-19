import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'export' | 'sync-save' | 'sync-load';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseStyles = [
      'inline-flex items-center justify-center',
      'border',
      'font-medium',
      'transition-all duration-150',
      'cursor-pointer',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'text-center'
    ].join(' ');

    const variantStyles = {
      primary: [
        'bg-productory-purple-1 hover:bg-brand-primary-hover',
        'text-productory-surface-light',
        'border-transparent',
        'font-bold',
        'focus:ring-productory-purple-1'
      ].join(' '),
      secondary: [
        'bg-productory-surface-tinted hover:bg-productory-surface-light',
        'text-productory-purple-1',
        'border-transparent',
        'font-bold',
        'focus:ring-productory-purple-1'
      ].join(' '),
      outline: [
        'bg-transparent hover:bg-productory-surface-light',
        'text-productory-purple-1',
        'border-productory-purple-1 border-2',
        'font-bold',
        'focus:ring-productory-purple-1'
      ].join(' '),
      ghost: [
        'bg-transparent hover:bg-gray-100',
        'text-gray-700',
        'border-transparent',
        'focus:ring-gray-500'
      ].join(' '),
      destructive: [
        'bg-red-600 hover:bg-red-700',
        'text-white',
        'border-transparent',
        'focus:ring-red-500'
      ].join(' '),
      export: [
        'bg-gray-50 hover:bg-gray-100',
        'text-gray-700',
        'border-gray-300',
        'focus:ring-gray-500'
      ].join(' '),
      'sync-save': [
        'bg-white hover:bg-green-50',
        'text-green-700',
        'border-green-500',
        'focus:ring-green-500'
      ].join(' '),
      'sync-load': [
        'bg-white hover:bg-blue-50',
        'text-blue-700',
        'border-blue-500',
        'focus:ring-blue-500'
      ].join(' ')
    };

    const sizeStyles = {
      sm: 'px-3 py-2 text-sm rounded-lg',
      md: 'px-4 py-3 text-base rounded-lg',
      lg: 'px-6 py-4 text-lg rounded-xl'
    };

    const combinedClassName = [
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      className
    ].filter(Boolean).join(' ');

    return (
      <button
        ref={ref}
        className={combinedClassName}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';