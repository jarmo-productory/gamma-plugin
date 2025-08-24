import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'empty-state' | 'container';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export interface IconContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', variant = 'default', padding = 'md', children, ...props }, ref) => {
    const baseStyles = [
      'bg-white',
      'border border-gray-200',
      'rounded-lg'
    ].join(' ');

    const variantStyles = {
      default: '',
      'empty-state': 'text-center',
      container: ''
    };

    const paddingStyles = {
      none: 'p-0',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
      xl: 'p-16'
    };

    const combinedClassName = [
      baseStyles,
      variantStyles[variant],
      paddingStyles[padding],
      className
    ].filter(Boolean).join(' ');

    return (
      <div
        ref={ref}
        className={combinedClassName}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = '', children, ...props }, ref) => {
    const combinedClassName = [
      'mb-2',
      className
    ].filter(Boolean).join(' ');

    return (
      <div
        ref={ref}
        className={combinedClassName}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={className}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className = '', children, ...props }, ref) => {
    const combinedClassName = [
      'text-lg font-semibold text-gray-900 mb-2',
      className
    ].filter(Boolean).join(' ');

    return (
      <h3
        ref={ref}
        className={combinedClassName}
        {...props}
      >
        {children}
      </h3>
    );
  }
);

CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className = '', children, ...props }, ref) => {
    const combinedClassName = [
      'text-sm text-gray-600',
      className
    ].filter(Boolean).join(' ');

    return (
      <p
        ref={ref}
        className={combinedClassName}
        {...props}
      >
        {children}
      </p>
    );
  }
);

CardDescription.displayName = 'CardDescription';

export const IconContainer = React.forwardRef<HTMLDivElement, IconContainerProps>(
  ({ className = '', size = 'md', children, ...props }, ref) => {
    const baseStyles = [
      'bg-gray-100',
      'rounded-full',
      'flex items-center justify-center',
      'mx-auto mb-4'
    ].join(' ');

    const sizeStyles = {
      sm: 'w-8 h-8 text-sm',
      md: 'w-16 h-16 text-2xl',
      lg: 'w-24 h-24 text-4xl'
    };

    const combinedClassName = [
      baseStyles,
      sizeStyles[size],
      className
    ].filter(Boolean).join(' ');

    return (
      <div
        ref={ref}
        className={combinedClassName}
        {...props}
      >
        {children}
      </div>
    );
  }
);

IconContainer.displayName = 'IconContainer';