import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-lg border border-line bg-surface px-6 py-16 text-center',
        className,
      )}
    >
      {icon ? (
        <div aria-hidden="true" className="mb-4 text-muted">
          {icon}
        </div>
      ) : null}
      <h2 className="font-display text-h4 text-ink">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-[52ch] text-body-sm text-graphite">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
