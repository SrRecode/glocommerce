import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import * as authApi from '@/features/auth/api'
import { AuthContext } from '@/features/auth/auth-context'
import type { AuthContextValue } from '@/features/auth/auth-context'
import type { AuthStatus, AuthUser, LoginPayload, RegisterPayload } from '@/features/auth/types'
import { setAccessToken } from '@/lib/api-client'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    let cancelled = false

    void authApi.restoreSession().then((restored) => {
      if (cancelled) {
        return
      }
      if (restored) {
        setUser(restored)
        setStatus('authenticated')
      } else {
        setUser(null)
        setStatus('guest')
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    const session = await authApi.register(payload)
    setAccessToken(session.accessToken)
    setUser(session.user)
    setStatus('authenticated')
    return session.user
  }, [])

  const login = useCallback(async (payload: LoginPayload) => {
    const session = await authApi.login(payload)
    setAccessToken(session.accessToken)
    setUser(session.user)
    setStatus('authenticated')
    return session.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      setAccessToken(null)
      setUser(null)
      setStatus('guest')
    }
  }, [])

  const refreshUser = useCallback(async () => {
    const current = await authApi.fetchCurrentUser()
    setUser(current)
    setStatus('authenticated')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAuthenticated: status === 'authenticated' && user !== null,
      register,
      login,
      logout,
      refreshUser,
    }),
    [status, user, register, login, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
