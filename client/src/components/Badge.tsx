import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

const TONES = {
  neutral: 'bg-surface-sunken text-graphite',
  brand: 'bg-brand-soft text-brand',
  accent: 'bg-accent-soft text-accent-text',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning-mark/10 text-warning',
  danger: 'bg-danger/10 text-danger',
} as const;

export type BadgeTone = keyof typeof TONES;

export interface BadgeProps {
  tone?: keyof typeof TONES;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-3 py-1 text-caption font-medium',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
