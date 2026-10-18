import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
  containerClassName?: string
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, containerClassName, className, id, ...props },
  ref,
) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-2', containerClassName)}>
      <label htmlFor={fieldId} className="text-body-sm font-medium text-graphite">
        {label}
      </label>
      <input
        ref={ref}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'h-11 w-full rounded-md border bg-surface px-3 text-body text-ink transition-colors duration-120 placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-50',
          error ? 'border-danger' : 'border-line',
          className,
        )}
        {...props}
      />
      {hint && !error ? (
        <p id={hintId} className="text-caption text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
})

TextField.displayName = 'TextField'
