import { PackageCheck, Search, ShieldCheck, Truck } from 'lucide-react'
import { Link } from 'react-router'

const CATEGORIES = [
  { name: 'Kitchen', note: '12 pieces' },
  { name: 'Textiles', note: '18 pieces' },
  { name: 'Lighting', note: '9 pieces' },
  { name: 'Stationery', note: '24 pieces' },
] as const

const ASSURANCES = [
  { icon: Truck, label: 'Cash on delivery' },
  { icon: PackageCheck, label: '7-day returns' },
  { icon: ShieldCheck, label: 'Inspected before dispatch' },
] as const

export function HomePage() {
  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="mx-auto grid w-full max-w-storefront gap-12 px-6 py-16 lg:grid-cols-12 lg:gap-16 lg:px-10 lg:py-24">
          <div className="lg:col-span-7">
            <p className="text-caption font-medium uppercase tracking-[0.08em] text-muted">
              New season
            </p>
            <h1 className="mt-4 font-display text-display-xl tracking-[-0.02em] text-ink">
              Considered goods for everyday rooms.
            </h1>
            <p className="mt-6 max-w-[68ch] text-body-lg text-graphite">
              A small, deliberate catalogue. We stock one good option per need, inspect every
              parcel ourselves, and take payment at your door.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/"
                className="inline-flex h-12 items-center gap-2 rounded-md bg-brand px-6 text-body-sm font-semibold text-white transition-colors duration-120 hover:bg-brand-hover"
              >
                Browse the catalogue
                <Search aria-hidden="true" size={16} strokeWidth={1.5} />
              </Link>
              <Link
                to="/"
                className="inline-flex h-12 items-center rounded-md border border-line bg-surface px-6 text-body-sm font-semibold text-ink transition-colors duration-120 hover:bg-surface-sunken"
              >
                This week&rsquo;s edit
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="flex h-full flex-col justify-end rounded-lg border border-line bg-surface-sunken p-6 lg:p-8">
              <p className="text-caption font-medium uppercase tracking-[0.08em] text-muted">
                Deliveries
              </p>
              <p className="mt-3 font-display text-h3 tracking-[-0.01em] text-ink tabular-nums">
                2–4 days
              </p>
              <p className="mt-2 max-w-[68ch] text-body-sm text-graphite">
                Nationwide, flat rate, paid in cash when the parcel reaches you.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-storefront px-6 py-16 lg:px-10 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-caption font-medium uppercase tracking-[0.08em] text-muted">
              Shop the edit
            </p>
            <h2 className="mt-3 font-display text-h2 tracking-[-0.01em] text-ink">
              Four rooms, one standard
            </h2>
          </div>
          <Link
            to="/"
            className="text-body-sm font-medium text-brand transition-colors duration-120 hover:text-brand-hover"
          >
            All collections
          </Link>
        </div>

        <ul className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
          {CATEGORIES.map((category) => (
            <li key={category.name}>
              <Link to="/" className="group block">
                <div className="aspect-4/5 rounded-md border border-line bg-surface-sunken" />
                <div className="mt-4 flex items-baseline justify-between gap-2">
                  <span className="text-h4 font-medium text-ink group-hover:text-brand">
                    {category.name}
                  </span>
                  <span className="text-caption text-muted">{category.note}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-line bg-surface">
        <ul className="mx-auto flex w-full max-w-storefront flex-wrap items-center gap-x-10 gap-y-4 px-6 py-8 lg:px-10">
          {ASSURANCES.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 text-body-sm text-graphite">
              <Icon aria-hidden="true" size={20} strokeWidth={1.5} className="text-brand" />
              {label}
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
