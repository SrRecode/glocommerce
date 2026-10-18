import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

const SIZE_CLASSES = {
  sm: 'text-body-sm',
  md: 'text-body',
  lg: 'text-h4',
} as const;

export interface PriceProps {
  amount: number;
  currency?: string;
  compareAt?: number | null;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

export function Price({ amount, currency, compareAt, size = 'md', className }: PriceProps) {
  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-2 tabular-nums',
        SIZE_CLASSES[size],
        className,
      )}
    >
      <span className="font-semibold text-ink">{formatMoney(amount, currency)}</span>
      {typeof compareAt === 'number' && compareAt > amount ? (
        <span className="text-body-sm text-muted line-through">
          {formatMoney(compareAt, currency)}
        </span>
      ) : null}
    </span>
  );
}
