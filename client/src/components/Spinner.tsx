import { cn } from '@/lib/utils';

const SIZES = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
} as const;

export interface SpinnerProps {
  size?: keyof typeof SIZES;
  label?: string;
  className?: string;
}

export function Spinner({ size = 'md', label = 'Loading', className }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className={cn('inline-flex', className)}>
      <svg
        className={cn('animate-spin text-brand', SIZES[size])}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4z"
        />
      </svg>
    </span>
  );
}
