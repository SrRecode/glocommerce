const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export interface ApiErrorPayload {
  message: string
  code?: string
  /** Validation errors keyed by dotted field path, e.g. `customer.name`. */
  fieldErrors?: Record<string, string[]>
}

/** Envelope for paginated list endpoints: `{ items, page, limit, total }`. */
export interface Paginated<T> {
  items: T[]
  page: number
  limit: number
  total: number
}

/** Normalized failure from the API. `fieldErrors` is present on validation errors. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors: Record<string, string[]> | undefined

  constructor(options: {
    status: number
    message: string
    code?: string
    fieldErrors?: Record<string, string[]>
  }) {
    super(options.message)
    this.name = 'ApiError'
    this.status = options.status
    this.code = options.code ?? 'UNKNOWN'
    this.fieldErrors = options.fieldErrors
  }
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
  /** Skip the refresh-and-retry dance (used by the refresh call itself). */
  skipAuthRetry?: boolean
}

/**
 * The access token lives in memory only. The refresh token is an httpOnly
 * cookie the browser sends automatically, so nothing sensitive is persisted
 * in JS-accessible storage.
 */
let accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

let refreshPromise: Promise<boolean> | null = null

async function performRefresh(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!response.ok) {
      setAccessToken(null)
      return false
    }
    const session = (await response.json()) as { accessToken: string }
    setAccessToken(session.accessToken)
    return true
  } catch {
    setAccessToken(null)
    return false
  }
}

/**
 * Exchange the refresh cookie for a new access token. Concurrent callers share
 * one in-flight request so two 401s (or React StrictMode's double mount) never
 * rotate the same refresh token twice.
 */
export function refreshAccessToken(): Promise<boolean> {
  refreshPromise ??= performRefresh().finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

async function toApiError(response: Response): Promise<ApiError> {
  let payload: ApiErrorPayload | undefined
  try {
    payload = (await response.json()) as ApiErrorPayload
  } catch {
    payload = undefined
  }

  return new ApiError({
    status: response.status,
    message: payload?.message ?? 'Something went wrong. Please try again.',
    code: payload?.code,
    fieldErrors: payload?.fieldErrors,
  })
}

async function send<T>(path: string, options: ApiRequestOptions, isRetry: boolean): Promise<T> {
  const { method = 'GET', body, signal, skipAuthRetry } = options

  const headers = new Headers()
  if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  })

  if (response.status === 401 && !skipAuthRetry && !isRetry) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      return send<T>(path, options, true)
    }
  }

  if (!response.ok) {
    throw await toApiError(response)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

/** Typed fetch wrapper: attaches the access token, retries once after a refresh. */
export function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  return send<T>(path, options, false)
}
