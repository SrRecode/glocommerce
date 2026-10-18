import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge conditional class names, letting later Tailwind utilities win. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Serialize params into a query string, dropping `undefined`, `null`, and empty
 * strings. Returns `''` when nothing remains, so callers can concatenate safely.
 */
export function buildQueryString(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue
    }
    search.set(key, String(value))
  }

  const query = search.toString()
  return query === '' ? '' : `?${query}`
}
