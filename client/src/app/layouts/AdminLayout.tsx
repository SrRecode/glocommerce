import { LayoutDashboard, LogOut, Package, ShoppingBag, Store, Tags } from 'lucide-react'
import { Suspense, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'

import { RouteFallback } from '@/app/ErrorBoundary'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { useAuth } from '@/features/auth/use-auth'

const NAV_ITEMS = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag, end: false },
  { to: '/admin/products', label: 'Products', icon: Package, end: false },
  { to: '/admin/categories', label: 'Categories', icon: Tags, end: false },
]

const LINK_BASE =
  'flex items-center gap-3 rounded-md px-3 py-2 text-body-sm font-medium transition-colors duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-paper'
const LINK_INACTIVE = 'text-graphite hover:bg-surface-sunken hover:text-ink'
const LINK_ACTIVE = 'bg-brand-soft text-brand'

function adminNavClass({ isActive }: { isActive: boolean }): string {
  return `${LINK_BASE} ${isActive ? LINK_ACTIVE : LINK_INACTIVE}`
}

const UTILITY_LINK =
  'flex items-center gap-2 rounded-md px-3 py-2 text-body-sm font-medium text-graphite transition-colors duration-120 hover:bg-surface-sunken hover:text-ink'

export function AdminLayout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await logout()
      navigate('/')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-body-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
        <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
          <Link to="/admin" className="flex items-center gap-2">
            <span className="font-display text-h4 font-semibold tracking-[-0.01em] text-ink">
              Glocommerce
            </span>
            <Badge tone="brand">Admin</Badge>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Link to="/" className={`hidden sm:flex ${UTILITY_LINK}`}>
              <Store aria-hidden="true" size={18} strokeWidth={1.5} />
              View store
            </Link>

            <span className="hidden max-w-[18ch] truncate text-body-sm text-muted md:block">
              {user?.name ?? user?.email}
            </span>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              <LogOut aria-hidden="true" size={16} strokeWidth={1.5} />
              Sign out
            </Button>
          </div>
        </div>

        <nav
          aria-label="Admin"
          className="flex gap-1 overflow-x-auto border-t border-line px-4 py-2 lg:hidden"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={adminNavClass}>
              <item.icon aria-hidden="true" size={18} strokeWidth={1.5} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 border-r border-line bg-surface lg:block">
          <nav aria-label="Admin" className="flex flex-col gap-1 p-3">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={adminNavClass}>
                <item.icon aria-hidden="true" size={18} strokeWidth={1.5} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main id="main" className="w-full flex-1 px-4 py-8 lg:px-8">
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
