export type UserRole = 'customer' | 'admin'

/** Mirrors the server's `PublicUser` contract. */
export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  isEmailVerified: boolean
  createdAt: string
}

export interface AuthSession {
  user: AuthUser
  accessToken: string
}

export type AuthStatus = 'loading' | 'authenticated' | 'guest'

export interface RegisterPayload {
  name: string
  email: string
  password: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface ForgotPasswordPayload {
  email: string
}

export interface ResetPasswordPayload {
  token: string
  password: string
}

export interface VerifyEmailPayload {
  token: string
}
