'use client';

import { type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

type CardVariant = 'default' | 'interactive' | 'outlined' | 'elevated';

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const variantStyles: Record<CardVariant, string> = {
  default:
    'bg-white rounded-2xl border border-secondary-200 shadow-default',
  interactive:
    'bg-white rounded-2xl border border-secondary-200 shadow-default cursor-pointer',
  outlined:
    'bg-white rounded-2xl border border-secondary-200',
  elevated:
    'bg-white rounded-2xl shadow-raised',
};

const paddingStyles: Record<string, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

/** 공통 카드 컴포넌트 — 호버 시 elevation 변화 */
export default function Card({
  variant = 'default',
  padding = 'md',
  children,
  className = '',
  ...props
}: CardProps) {
  const isInteractive = variant === 'interactive';

  return (
    <motion.div
      whileHover={
        isInteractive
          ? { scale: 1.015, y: -2 }
          : undefined
      }
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${isInteractive ? 'hover:shadow-card-hover hover:border-secondary-300 transition-shadow duration-200' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  );
}
