import { ShieldAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router'

import { ButtonLink } from '@/components/ButtonLink'
import { EmptyState } from '@/components/EmptyState'
import { Spinner } from '@/components/Spinner'
import { useAuth } from '@/features/auth/use-auth'

interface AdminGuardProps {
  children: ReactNode
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { status, user } = useAuth()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <Spinner size="lg" label="Checking your account" />
      </div>
    )
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== 'admin') {
    return (
      <div className="mx-auto w-full max-w-storefront px-6 py-16 lg:px-10">
        <EmptyState
          icon={<ShieldAlert aria-hidden="true" size={28} strokeWidth={1.5} />}
          title="Administrators only"
          description="This area is restricted to store administrators. Sign in with an admin account to continue."
          action={
            <ButtonLink to="/" variant="secondary">
              Back to store
            </ButtonLink>
          }
        />
      </div>
    )
  }

  return <>{children}</>
}
