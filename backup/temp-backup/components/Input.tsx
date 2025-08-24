import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'error' | 'success';
  inputSize?: 'sm' | 'md' | 'lg';
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'default' | 'error' | 'success';
  inputSize?: 'sm' | 'md' | 'lg';
  label?: string;
  error?: string;
  helper?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className = '', 
    variant = 'default', 
    inputSize = 'md', 
    label,
    error,
    helper,
    leftIcon,
    rightIcon,
    id,
    ...props 
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    const baseStyles = [
      'block w-full',
      'border rounded-md',
      'placeholder-gray-400',
      'focus:outline-none focus:ring-2 focus:ring-offset-0',
      'transition-all duration-150',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50'
    ].join(' ');

    const variantStyles = {
      default: [
        'border-gray-300',
        'text-gray-900',
        'focus:border-blue-500 focus:ring-blue-500'
      ].join(' '),
      error: [
        'border-red-300',
        'text-red-900',
        'focus:border-red-500 focus:ring-red-500'
      ].join(' '),
      success: [
        'border-green-300',
        'text-green-900',
        'focus:border-green-500 focus:ring-green-500'
      ].join(' ')
    };

    const sizeStyles = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-3 py-2 text-sm',
      lg: 'px-4 py-3 text-base'
    };

    const iconContainerStyles = leftIcon || rightIcon ? 'relative' : '';
    const inputPaddingStyles = {
      left: leftIcon ? (inputSize === 'lg' ? 'pl-10' : 'pl-10') : '',
      right: rightIcon ? (inputSize === 'lg' ? 'pr-10' : 'pr-10') : ''
    };

    const combinedClassName = [
      baseStyles,
      variantStyles[variant],
      sizeStyles[inputSize],
      inputPaddingStyles.left,
      inputPaddingStyles.right,
      className
    ].filter(Boolean).join(' ');

    return (
      <div className="space-y-1">
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}
        
        <div className={iconContainerStyles}>
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <div className="text-gray-400">
                {leftIcon}
              </div>
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            className={combinedClassName}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <div className="text-gray-400">
                {rightIcon}
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600">
            {error}
          </p>
        )}
        
        {helper && !error && (
          <p className="text-sm text-gray-500">
            {helper}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className = '', 
    variant = 'default', 
    inputSize = 'md',
    label,
    error,
    helper,
    id,
    rows = 3,
    ...props 
  }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    const baseStyles = [
      'block w-full',
      'border rounded-md',
      'placeholder-gray-400',
      'focus:outline-none focus:ring-2 focus:ring-offset-0',
      'transition-all duration-150',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50',
      'resize-vertical'
    ].join(' ');

    const variantStyles = {
      default: [
        'border-gray-300',
        'text-gray-900',
        'focus:border-blue-500 focus:ring-blue-500'
      ].join(' '),
      error: [
        'border-red-300',
        'text-red-900',
        'focus:border-red-500 focus:ring-red-500'
      ].join(' '),
      success: [
        'border-green-300',
        'text-green-900',
        'focus:border-green-500 focus:ring-green-500'
      ].join(' ')
    };

    const sizeStyles = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-3 py-2 text-sm',
      lg: 'px-4 py-3 text-base'
    };

    const combinedClassName = [
      baseStyles,
      variantStyles[variant],
      sizeStyles[inputSize],
      className
    ].filter(Boolean).join(' ');

    return (
      <div className="space-y-1">
        {label && (
          <label 
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}
        
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={combinedClassName}
          {...props}
        />

        {error && (
          <p className="text-sm text-red-600">
            {error}
          </p>
        )}
        
        {helper && !error && (
          <p className="text-sm text-gray-500">
            {helper}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';