import { createContext } from 'react'
import type { AuthStatus, AuthUser, LoginPayload, RegisterPayload } from '@/features/auth/types'

export interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  isAuthenticated: boolean
  register: (payload: RegisterPayload) => Promise<AuthUser>
  login: (payload: LoginPayload) => Promise<AuthUser>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
