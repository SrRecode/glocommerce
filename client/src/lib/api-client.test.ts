import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ApiError,
  apiRequest,
  getAccessToken,
  refreshAccessToken,
  setAccessToken,
} from '@/lib/api-client'

const fetchMock = vi.fn()

interface FetchInit {
  method?: string
  headers?: Headers
  body?: unknown
  credentials?: string
}

function mockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

function callUrl(index: number): string {
  const call = fetchMock.mock.calls[index]
  if (!call) {
    throw new Error(`Expected a fetch call at index ${index}`)
  }
  return String(call[0])
}

function callInit(index: number): FetchInit {
  const call = fetchMock.mock.calls[index]
  if (!call) {
    throw new Error(`Expected a fetch call at index ${index}`)
  }
  return call[1] as FetchInit
}

beforeEach(() => {
  setAccessToken(null)
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiRequest', () => {
  it('attaches the access token and parses the JSON body', async () => {
    setAccessToken('token-123')
    fetchMock.mockResolvedValueOnce(mockResponse({ user: { id: 'u1' } }))

    const result = await apiRequest<{ user: { id: string } }>('/auth/me')

    expect(callUrl(0)).toBe('/api/v1/auth/me')
    expect(callInit(0).headers?.get('Authorization')).toBe('Bearer token-123')
    expect(callInit(0).credentials).toBe('include')
    expect(result).toEqual({ user: { id: 'u1' } })
  })

  it('throws an ApiError carrying fieldErrors on validation failure', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(
        {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          fieldErrors: { email: 'Invalid email' },
        },
        400,
      ),
    )

    const promise = apiRequest('/auth/register', { method: 'POST', body: {} })

    await expect(promise).rejects.toBeInstanceOf(ApiError)
    await expect(promise).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      fieldErrors: { email: 'Invalid email' },
    })
  })

  it('refreshes once and replays the original request after a 401', async () => {
    setAccessToken('stale-token')
    fetchMock
      .mockResolvedValueOnce(mockResponse({ message: 'Expired', code: 'UNAUTHORIZED' }, 401))
      .mockResolvedValueOnce(mockResponse({ accessToken: 'fresh-token' }))
      .mockResolvedValueOnce(mockResponse({ user: { id: 'u1' } }))

    const result = await apiRequest<{ user: { id: string } }>('/auth/me')

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(callUrl(1)).toBe('/api/v1/auth/refresh')
    expect(callInit(2).headers?.get('Authorization')).toBe('Bearer fresh-token')
    expect(getAccessToken()).toBe('fresh-token')
    expect(result).toEqual({ user: { id: 'u1' } })
  })

  it('resolves undefined for a 204 response', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(undefined, 204))

    await expect(apiRequest<void>('/auth/logout', { method: 'POST' })).resolves.toBeUndefined()
  })
})

describe('refreshAccessToken', () => {
  it('returns false without recursing when the refresh itself is unauthorized', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ message: 'No session' }, 401))

    const refreshed = await refreshAccessToken()

    expect(refreshed).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(callUrl(0)).toBe('/api/v1/auth/refresh')
  })

  it('shares a single in-flight refresh between concurrent callers', async () => {
    let resolveRefresh: ((value: Response) => void) | undefined
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveRefresh = resolve
        }),
    )

    const first = refreshAccessToken()
    const second = refreshAccessToken()
    resolveRefresh?.(mockResponse({ accessToken: 'fresh-token' }))

    await expect(Promise.all([first, second])).resolves.toEqual([true, true])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
