import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, type Path } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'

import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { useAuth } from '@/features/auth/use-auth'
import { ApiError } from '@/lib/api-client'

const loginFormSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
})

type LoginFormValues = z.infer<typeof loginFormSchema>

const DEFAULT_VALUES: LoginFormValues = {
  email: '',
  password: '',
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const from = (location.state as { from?: string } | null)?.from ?? '/admin'

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)

    try {
      await login(values)
      navigate(from, { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        let handled = false

        for (const [key, messages] of Object.entries(error.fieldErrors)) {
          const message = messages[0]

          if (!message) {
            continue
          }

          setError(key as Path<LoginFormValues>, { type: 'server', message })
          handled = true
        }

        if (handled) {
          return
        }
      }

      setFormError(
        error instanceof ApiError
          ? error.message
          : 'Something went wrong. Please try again.',
      )
    }
  })

  return (
    <div className="mx-auto w-full max-w-storefront px-6 py-16 lg:px-10 lg:py-24">
      <div className="mx-auto flex w-full max-w-[440px] flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p className="text-caption font-semibold uppercase tracking-[0.08em] text-brand">
            Admin access
          </p>
          <h1 className="font-display text-h2 text-ink">Sign in</h1>
          <p className="text-body-sm text-graphite">
            Sign in to manage orders, products, and categories.
          </p>
        </header>

        <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />

          {formError ? (
            <p
              role="alert"
              className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-body-sm text-danger"
            >
              {formError}
            </p>
          ) : null}

          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <div className="flex flex-col gap-3 border-t border-line pt-6 text-body-sm text-graphite">
          <p>
            <Link
              to="/"
              className="font-semibold text-brand transition-colors duration-120 hover:text-brand-hover"
            >
              Back to store
            </Link>
          </p>
          <p>
            Tracking a guest order?{' '}
            <Link
              to="/orders/lookup"
              className="font-semibold text-brand transition-colors duration-120 hover:text-brand-hover"
            >
              Look it up by number
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
