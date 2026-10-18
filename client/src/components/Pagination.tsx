import { Button } from '@/components/Button'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
  className?: string
}

export function Pagination({ page, totalPages, onChange, className }: PaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  const canGoPrevious = page > 1
  const canGoNext = page < totalPages

  return (
    <nav aria-label="Pagination" className={cn('flex items-center justify-between gap-4', className)}>
      <Button
        variant="secondary"
        size="sm"
        disabled={!canGoPrevious}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </Button>
      <p className="text-body-sm text-graphite">
        Page {page} of {totalPages}
      </p>
      <Button variant="secondary" size="sm" disabled={!canGoNext} onClick={() => onChange(page + 1)}>
        Next
      </Button>
    </nav>
  )
}
