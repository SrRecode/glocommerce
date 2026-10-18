import { Component, type ErrorInfo, type ReactNode } from 'react'
import { isRouteErrorResponse, useRouteError } from 'react-router'

import { Spinner } from '@/components/Spinner'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: unknown
}

function ErrorScreen({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6 py-16">
      <div className="w-full max-w-md rounded-lg border border-line bg-surface px-8 py-12 text-center">
        <p className="text-caption font-medium uppercase tracking-[0.08em] text-muted">
          Something went wrong
        </p>
        <h1 className="mt-3 font-display text-h3 text-ink">{title}</h1>
        <p className="mt-3 text-body-sm text-graphite">{description}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-5 text-body-sm font-medium text-white transition-colors duration-120 hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            Back to home
          </a>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-body-sm font-medium text-brand underline-offset-4 transition-colors duration-120 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            Reload the page
          </button>
        </div>
      </div>
    </div>
  )
}

export function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner size="lg" label="Loading page" />
    </div>
  )
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('Unhandled UI error', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <ErrorScreen
          title="This page hit a snag"
          description="An unexpected error interrupted the page. Reloading often clears it."
        />
      )
    }
    return this.props.children
  }
}

export function RouteErrorFallback() {
  const error = useRouteError()
  const isNotFound = isRouteErrorResponse(error) && error.status === 404

  return (
    <ErrorScreen
      title={isNotFound ? 'Page not found' : 'This page hit a snag'}
      description={
        isNotFound
          ? 'The page you were looking for does not exist or has moved.'
          : 'An unexpected error interrupted the page. Reloading often clears it.'
      }
    />
  )
}
