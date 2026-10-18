import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

const STARS = [0, 1, 2, 3, 4]

interface RatingProps {
  value: number
  reviewCount?: number
  className?: string
}

export function Rating({ value, reviewCount, className }: RatingProps) {
  const rounded = Math.round(value)

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {STARS.map((index) => (
          <Star
            key={index}
            size={14}
            strokeWidth={1.5}
            className={index < rounded ? 'fill-warning-mark text-warning-mark' : 'text-line'}
          />
        ))}
      </span>
      <span className="text-caption text-muted">
        {value.toFixed(1)}
        {typeof reviewCount === 'number' ? ` (${reviewCount})` : ''}
      </span>
    </div>
  )
}
