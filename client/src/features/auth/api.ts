import { apiRequest, refreshAccessToken, setAccessToken } from '@/lib/api-client'
import type {
  AuthSession,
  AuthUser,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  VerifyEmailPayload,
} from '@/features/auth/types'

export function register(payload: RegisterPayload): Promise<AuthSession> {
  return apiRequest<AuthSession>('/auth/register', { method: 'POST', body: payload })
}

export function login(payload: LoginPayload): Promise<AuthSession> {
  return apiRequest<AuthSession>('/auth/login', { method: 'POST', body: payload })
}

export function logout(): Promise<void> {
  return apiRequest<void>('/auth/logout', { method: 'POST' })
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const { user } = await apiRequest<{ user: AuthUser }>('/auth/me')
  return user
}

/**
 * Bootstrap helper: exchange the refresh cookie for an access token, then load
 * the profile. Returns null when there is no valid session to restore.
 */
export async function restoreSession(): Promise<AuthUser | null> {
  const refreshed = await refreshAccessToken()
  if (!refreshed) {
    return null
  }

  try {
    return await fetchCurrentUser()
  } catch {
    setAccessToken(null)
    return null
  }
}

export async function verifyEmail(payload: VerifyEmailPayload): Promise<AuthUser> {
  const { user } = await apiRequest<{ user: AuthUser }>('/auth/verify-email', {
    method: 'POST',
    body: payload,
  })
  return user
}

export function resendVerification(): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/resend-verification', { method: 'POST' })
}

export function forgotPassword(payload: ForgotPasswordPayload): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/forgot-password', { method: 'POST', body: payload })
}

export function resetPassword(payload: ResetPasswordPayload): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/reset-password', { method: 'POST', body: payload })
}
