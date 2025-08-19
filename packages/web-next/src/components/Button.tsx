import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseStyles = [
      'inline-flex items-center justify-center',
      'border border-transparent',
      'font-medium',
      'transition-all duration-150',
      'cursor-pointer',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed'
    ].join(' ');

    const variantStyles = {
      primary: [
        'bg-blue-600 hover:bg-blue-700',
        'text-white',
        'focus:ring-blue-500'
      ].join(' '),
      secondary: [
        'bg-white hover:bg-gray-50',
        'text-gray-700',
        'border-gray-300',
        'focus:ring-gray-500'
      ].join(' '),
      ghost: [
        'bg-transparent hover:bg-gray-100',
        'text-gray-700',
        'border-transparent'
      ].join(' ')
    };

    const sizeStyles = {
      sm: 'px-4 py-2 text-sm rounded-md',
      md: 'px-4 py-2 text-sm rounded-md',
      lg: 'px-8 py-3 text-base rounded-lg'
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