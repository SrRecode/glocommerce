import { render, screen } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminGuard } from '@/app/AdminGuard'
import type { AuthContextValue } from '@/features/auth/auth-context'
import type { AuthUser } from '@/features/auth/types'
import { useAuth } from '@/features/auth/use-auth'

vi.mock('@/features/auth/use-auth', () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)

function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'user-1',
    name: 'Ayesha Khan',
    email: 'ayesha@example.com',
    role: 'customer',
    isEmailVerified: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function setAuth(overrides: Partial<AuthContextValue> = {}) {
  mockedUseAuth.mockReturnValue({
    status: 'guest',
    user: null,
    isAuthenticated: false,
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    ...overrides,
  })
}

function renderGuard() {
  const router = createMemoryRouter(
    [
      {
        path: '/admin',
        element: (
          <AdminGuard>
            <div>admin content</div>
          </AdminGuard>
        ),
      },
      { path: '/login', element: <div>login page</div> },
    ],
    { initialEntries: ['/admin'] },
  )

  render(<RouterProvider router={router} />)
}

describe('AdminGuard', () => {
  beforeEach(() => {
    mockedUseAuth.mockReset()
  })

  it('shows a loading indicator while auth is resolving', () => {
    setAuth({ status: 'loading' })

    renderGuard()

    expect(screen.getByRole('status')).toHaveAccessibleName('Checking your account')
    expect(screen.queryByText('admin content')).toBeNull()
  })

  it('redirects unauthenticated visitors to the login page', () => {
    setAuth({ status: 'guest' })

    renderGuard()

    expect(screen.getByText('login page')).toBeInTheDocument()
    expect(screen.queryByText('admin content')).toBeNull()
  })

  it('blocks authenticated customers with a restricted message', () => {
    setAuth({ status: 'authenticated', isAuthenticated: true, user: makeUser() })

    renderGuard()

    expect(screen.getByText('Administrators only')).toBeInTheDocument()
    expect(screen.queryByText('admin content')).toBeNull()
  })

  it('renders children for administrators', () => {
    setAuth({
      status: 'authenticated',
      isAuthenticated: true,
      user: makeUser({ role: 'admin' }),
    })

    renderGuard()

    expect(screen.getByText('admin content')).toBeInTheDocument()
    expect(screen.queryByText('Administrators only')).toBeNull()
  })
})
