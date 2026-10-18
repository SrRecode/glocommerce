import { Search, ShoppingBag } from 'lucide-react'
import { Link, Outlet } from 'react-router'

const NAV_LINKS = [
  { label: 'Shop', to: '/' },
  { label: 'Collections', to: '/' },
  { label: 'Journal', to: '/' },
] as const

export function StorefrontLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <a
        href="#main"
        className="sr-only rounded-md bg-brand px-4 py-2 text-body-sm font-medium text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-storefront items-center gap-6 px-6 lg:px-10">
          <Link
            to="/"
            className="font-display text-h4 font-semibold tracking-[-0.01em] text-ink"
          >
            Glocommerce
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="text-body-sm font-medium text-graphite transition-colors duration-120 hover:text-brand"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative hidden lg:block">
              <Search
                aria-hidden="true"
                size={16}
                strokeWidth={1.5}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                type="search"
                aria-label="Search products"
                placeholder="Search"
                className="h-10 w-64 rounded-pill border border-line bg-surface-sunken pl-9 pr-4 text-body-sm text-ink transition-colors duration-120 placeholder:text-muted focus:border-brand focus:outline-none"
              />
            </div>

            <button
              type="button"
              aria-label="Cart"
              className="inline-flex size-10 items-center justify-center rounded-md text-graphite transition-colors duration-120 hover:bg-surface-sunken hover:text-ink"
            >
              <ShoppingBag aria-hidden="true" size={20} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex w-full max-w-storefront flex-col gap-2 px-6 py-10 lg:px-10">
          <span className="font-display text-body-lg">Glocommerce</span>
          <span className="text-caption text-muted">
            Considered goods, delivered to your door. Cash on delivery only.
          </span>
        </div>
      </footer>
    </div>
  )
}
