import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-storefront flex-col justify-center px-6 py-16 lg:px-10">
      <p className="text-caption font-medium uppercase tracking-[0.08em] text-muted">
        Error 404
      </p>
      <h1 className="mt-4 font-display text-h1 tracking-[-0.02em] text-ink">
        We couldn&rsquo;t find that page.
      </h1>
      <p className="mt-4 max-w-[68ch] text-body text-graphite">
        The link may be out of date, or the item may have sold through.
      </p>
      <div className="mt-8">
        <Link
          to="/"
          className="inline-flex h-12 items-center rounded-md bg-brand px-6 text-body-sm font-semibold text-white transition-colors duration-120 hover:bg-brand-hover"
        >
          Back to the storefront
        </Link>
      </div>
    </main>
  )
}
