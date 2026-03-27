'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-500 text-white hover:bg-primary-600 focus-visible:ring-primary-500/30 shadow-default hover:shadow-raised',
  secondary:
    'bg-secondary-100 text-secondary-800 hover:bg-secondary-200 focus-visible:ring-secondary-500/20',
  ghost:
    'bg-transparent text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900',
  outline:
    'border border-secondary-300 text-secondary-700 hover:bg-secondary-50 hover:border-secondary-400 focus-visible:ring-secondary-500/20',
  danger:
    'bg-error-500 text-white hover:bg-error-600 focus-visible:ring-error-500/30',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-body-sm gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-body gap-2 rounded-xl',
  lg: 'h-12 px-6 text-body-lg gap-2.5 rounded-xl',
};

/** 공통 버튼 컴포넌트 — 에어비앤비 스타일 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      icon,
      iconPosition = 'left',
      children,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <motion.button
        ref={ref}
        whileTap={isDisabled ? undefined : { scale: 0.97 }}
        whileHover={isDisabled ? undefined : { scale: 1.01 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className={`
          inline-flex items-center justify-center font-medium
          transition-colors duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
          disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
          select-none cursor-pointer
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        disabled={isDisabled}
        {...(props as HTMLMotionProps<'button'>)}
      >
        {isLoading && (
          <svg
            className="w-4 h-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {!isLoading && icon && iconPosition === 'left' && icon}
        {children}
        {!isLoading && icon && iconPosition === 'right' && icon}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
