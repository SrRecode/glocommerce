import type { FormEvent } from 'react'
import { Search } from 'lucide-react'
import { useSearchParams } from 'react-router'

import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { Pagination } from '@/components/Pagination'
import { ProductCard } from '@/components/ProductCard'
import { Skeleton } from '@/components/Skeleton'
import { useCategories, useProducts } from '@/features/catalog/queries'
import { PRODUCT_SORTS, PRODUCT_SORT_LABELS } from '@/features/catalog/types'
import type { ProductListParams, ProductSort } from '@/features/catalog/types'

const PAGE_SIZE = 12
const DEFAULT_SORT: ProductSort = 'newest'

const SELECT_CLASSES =
  'h-11 rounded-md border border-line bg-surface px-3 text-body-sm text-ink transition-colors duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-paper'

function toSort(value: string | null): ProductSort | undefined {
  if (!value) {
    return undefined
  }
  return (PRODUCT_SORTS as readonly string[]).includes(value) ? (value as ProductSort) : undefined
}

function toPositiveInt(value: string | null): number | undefined {
  if (!value) {
    return undefined
  }
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

/** URL is the single source of truth for filters, so results are shareable. */
function readParams(searchParams: URLSearchParams): ProductListParams {
  const params: ProductListParams = { limit: PAGE_SIZE }

  const q = searchParams.get('q')?.trim()
  if (q) {
    params.q = q
  }

  const category = searchParams.get('category')?.trim()
  if (category) {
    params.category = category
  }

  const sort = toSort(searchParams.get('sort'))
  if (sort) {
    params.sort = sort
  }

  const page = toPositiveInt(searchParams.get('page'))
  if (page) {
    params.page = page
  }

  return params
}

export function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const params = readParams(searchParams)
  const productsQuery = useProducts(params)
  const categoriesQuery = useCategories()

  const qParam = searchParams.get('q') ?? ''
  const categoryParam = searchParams.get('category') ?? ''
  const sortParam = toSort(searchParams.get('sort')) ?? DEFAULT_SORT
  const currentPage = params.page ?? 1

  function updateParams(changes: Record<string, string | undefined>) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      for (const [key, value] of Object.entries(changes)) {
        if (value) {
          next.set(key, value)
        } else {
          next.delete(key)
        }
      }
      return next
    })
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = new FormData(event.currentTarget).get('q')
    const next = typeof value === 'string' ? value.trim() : ''
    updateParams({ q: next || undefined, page: undefined })
  }

  function clearFilters() {
    setSearchParams(new URLSearchParams())
  }

  const products = productsQuery.data?.items ?? []
  const total = productsQuery.data?.total ?? 0
  const pageSize = productsQuery.data?.limit ?? PAGE_SIZE
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const hasFilters = Boolean(qParam || categoryParam || toSort(searchParams.get('sort')))

  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="mx-auto w-full max-w-storefront px-6 py-12 lg:px-10 lg:py-16">
          <p className="text-caption font-medium uppercase tracking-[0.08em] text-muted">
            Catalogue
          </p>
          <h1 className="mt-3 font-display text-display-lg tracking-[-0.02em] text-ink">
            Everything we carry
          </h1>
          <p className="mt-4 max-w-[62ch] text-body-lg text-graphite">
            Considered pieces for the kitchen, the desk, and every room in between. Cash on
            delivery, seven-day returns.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-storefront px-6 py-10 lg:px-10">
        <div className="flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-center lg:justify-between">
          <form
            key={qParam}
            onSubmit={handleSearchSubmit}
            role="search"
            className="relative w-full lg:max-w-sm"
          >
            <Search
              aria-hidden="true"
              size={16}
              strokeWidth={1.5}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              name="q"
              defaultValue={qParam}
              aria-label="Search products"
              placeholder="Search the catalogue"
              className="h-11 w-full rounded-pill border border-line bg-surface-sunken pl-9 pr-4 text-body-sm text-ink transition-colors duration-120 placeholder:text-muted focus:border-brand focus:outline-none"
            />
          </form>

          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label="Filter by category"
              value={categoryParam}
              onChange={(event) =>
                updateParams({ category: event.target.value || undefined, page: undefined })
              }
              className={SELECT_CLASSES}
            >
              <option value="">All categories</option>
              {(categoriesQuery.data ?? []).map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              aria-label="Sort products"
              value={sortParam}
              onChange={(event) =>
                updateParams({
                  sort: event.target.value === DEFAULT_SORT ? undefined : event.target.value,
                  page: undefined,
                })
              }
              className={SELECT_CLASSES}
            >
              {PRODUCT_SORTS.map((sort) => (
                <option key={sort} value={sort}>
                  {PRODUCT_SORT_LABELS[sort]}
                </option>
              ))}
            </select>

            {hasFilters ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex items-baseline justify-between gap-4 py-6">
          <p className="text-body-sm text-graphite">
            {productsQuery.isSuccess
              ? `${total} ${total === 1 ? 'piece' : 'pieces'}`
              : 'Loading the catalogue'}
          </p>
        </div>

        {productsQuery.isPending ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="flex flex-col gap-3">
                <Skeleton className="aspect-4/5 w-full rounded-lg" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : null}

        {productsQuery.isError ? (
          <EmptyState
            title="We could not load the catalogue"
            description="Something went wrong on our side. Please try again in a moment."
            action={
              <Button onClick={() => productsQuery.refetch()}>Try again</Button>
            }
          />
        ) : null}

        {productsQuery.isSuccess && products.length === 0 ? (
          <EmptyState
            title="Nothing matches those filters"
            description="Try a different search term, or clear the filters to see everything we carry."
            action={
              hasFilters ? (
                <Button onClick={clearFilters}>Clear filters</Button>
              ) : undefined
            }
          />
        ) : null}

        {productsQuery.isSuccess && products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onChange={(nextPage) =>
                updateParams({ page: nextPage > 1 ? String(nextPage) : undefined })
              }
              className="mt-14"
            />
          </>
        ) : null}
      </section>
    </>
  )
}
