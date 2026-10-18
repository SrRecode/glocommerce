import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Package, Search } from 'lucide-react'
import { Badge, type BadgeTone } from '@/components/Badge'
import { Button } from '@/components/Button'
import { ButtonLink } from '@/components/ButtonLink'
import { EmptyState } from '@/components/EmptyState'
import { Pagination } from '@/components/Pagination'
import { Skeleton } from '@/components/Skeleton'
import { useAdminProducts, useDeleteAdminProduct } from '@/features/admin/queries'
import { PRODUCT_STATUS_LABELS, type AdminProductListParams } from '@/features/admin/types'
import {
  PRODUCT_SORT_LABELS,
  PRODUCT_SORTS,
  type ProductSort,
  type ProductStatus,
} from '@/features/catalog/types'
import { useCategories } from '@/features/catalog/queries'
import { ApiError } from '@/lib/api-client'
import { formatMoney } from '@/lib/money'

const PAGE_SIZE = 20
const DEFAULT_SORT: ProductSort = 'newest'
const STATUS_OPTIONS = Object.keys(PRODUCT_STATUS_LABELS) as ProductStatus[]
const STATUS_TONES: Record<ProductStatus, BadgeTone> = {
  draft: 'neutral',
  active: 'success',
  archived: 'warning',
}
const SELECT_CLASSES =
  'h-11 rounded-md border border-line bg-surface px-3 text-body-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'
const LABEL_CLASSES =
  'flex flex-col gap-2 text-caption font-medium uppercase tracking-[0.08em] text-muted'

function toSort(value: string | null): ProductSort {
  return value !== null && (PRODUCT_SORTS as readonly string[]).includes(value)
    ? (value as ProductSort)
    : DEFAULT_SORT
}

function toStatus(value: string | null): ProductStatus | undefined {
  return value !== null && value in PRODUCT_STATUS_LABELS ? (value as ProductStatus) : undefined
}

function toPositiveInt(value: string | null, fallback: number): number {
  if (value === null) {
    return fallback
  }
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function readParams(searchParams: URLSearchParams): AdminProductListParams {
  const q = searchParams.get('q')?.trim() ?? ''
  const category = searchParams.get('category') ?? ''
  return {
    q: q || undefined,
    status: toStatus(searchParams.get('status')),
    category: category || undefined,
    sort: toSort(searchParams.get('sort')),
    page: toPositiveInt(searchParams.get('page'), 1),
    limit: PAGE_SIZE,
  }
}

export function AdminProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const params = readParams(searchParams)
  const productsQuery = useAdminProducts(params)
  const categoriesQuery = useCategories()
  const deleteMutation = useDeleteAdminProduct()
  const [searchDraft, setSearchDraft] = useState(params.q ?? '')
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    setSearchDraft(params.q ?? '')
  }, [params.q])

  const updateParams = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) {
        next.delete(key)
      } else {
        next.set(key, value)
      }
    }
    setSearchParams(next)
  }

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    updateParams({ q: searchDraft.trim() || null, page: null })
  }

  const handlePage = (page: number) => {
    updateParams({ page: page <= 1 ? null : String(page) })
  }

  const clearFilters = () => {
    setSearchParams(new URLSearchParams())
  }

  const handleDelete = (productId: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      return
    }
    setDeleteError(null)
    deleteMutation.mutate(productId, {
      onError: (error) => {
        setDeleteError(
          error instanceof ApiError ? error.message : 'Could not delete the product',
        )
      },
    })
  }

  const products = productsQuery.data?.items ?? []
  const total = productsQuery.data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const categories = categoriesQuery.data ?? []

  return (
    <div className="mx-auto w-full max-w-storefront px-6 py-10 lg:px-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <span className="text-caption font-semibold uppercase tracking-[0.08em] text-brand">
            Admin
          </span>
          <h1 className="font-display text-h2 text-ink">Products</h1>
          <p className="text-body-sm text-graphite">
            Create, edit, and retire the products shown across the store.
          </p>
        </div>
        <ButtonLink to="/admin/products/new" variant="primary">
          New product
        </ButtonLink>
      </header>

      <div className="mt-8 flex flex-col gap-4">
        <form onSubmit={handleSearch} className="flex items-end gap-3">
          <label className="flex flex-1 flex-col gap-2">
            <span className={LABEL_CLASSES}>Search</span>
            <span className="relative block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
                strokeWidth={1.5}
              />
              <input
                type="search"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Name, brand, or tag"
                className="h-11 w-full rounded-md border border-line bg-surface pl-10 pr-3 text-body-sm text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              />
            </span>
          </label>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>

        <div className="flex flex-col gap-4 sm:flex-row">
          <label className={LABEL_CLASSES}>
            Status
            <select
              className={SELECT_CLASSES}
              value={params.status ?? ''}
              onChange={(event) =>
                updateParams({ status: event.target.value || null, page: null })
              }
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {PRODUCT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>

          <label className={LABEL_CLASSES}>
            Category
            <select
              className={SELECT_CLASSES}
              value={params.category ?? ''}
              onChange={(event) =>
                updateParams({ category: event.target.value || null, page: null })
              }
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className={LABEL_CLASSES}>
            Sort
            <select
              className={SELECT_CLASSES}
              value={params.sort ?? DEFAULT_SORT}
              onChange={(event) =>
                updateParams({
                  sort: event.target.value === DEFAULT_SORT ? null : event.target.value,
                  page: null,
                })
              }
            >
              {PRODUCT_SORTS.map((sort) => (
                <option key={sort} value={sort}>
                  {PRODUCT_SORT_LABELS[sort]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <section className="mt-10">
        {deleteError ? (
          <p
            role="alert"
            className="mb-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-body-sm text-danger"
          >
            {deleteError}
          </p>
        ) : null}

        {productsQuery.isPending ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3, 4].map((index) => (
              <Skeleton key={index} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : productsQuery.isError ? (
          <EmptyState
            icon={<Package className="size-7" strokeWidth={1.5} />}
            title="We could not load products"
            description="Try again in a moment."
          />
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Package className="size-7" strokeWidth={1.5} />}
            title="No products found"
            description="Adjust your filters, or create your first product."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
              {products.map((product) => (
                <li
                  key={product.id}
                  className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="size-14 shrink-0 overflow-hidden rounded-md border border-line bg-surface-sunken">
                      {product.images[0]?.url ? (
                        <img
                          src={product.images[0].url}
                          alt={product.images[0].alt || product.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="flex size-full items-center justify-center text-muted">
                          <Package className="size-5" strokeWidth={1.5} />
                        </span>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <Link
                        to={`/admin/products/${product.id}/edit`}
                        className="truncate font-semibold text-ink transition-colors duration-120 hover:text-brand"
                      >
                        {product.name}
                      </Link>
                      <span className="truncate text-body-sm text-muted">
                        {product.category?.name ?? 'Uncategorised'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:justify-end">
                    <Badge tone={STATUS_TONES[product.status]}>
                      {PRODUCT_STATUS_LABELS[product.status]}
                    </Badge>
                    <span className="tabular-nums text-body-sm text-graphite">
                      {formatMoney(product.price, product.currency)}
                    </span>
                    <span className="text-body-sm text-muted">Stock {product.stock}</span>
                    <div className="flex items-center gap-2">
                      <ButtonLink
                        to={`/admin/products/${product.id}/edit`}
                        variant="secondary"
                        size="sm"
                      >
                        Edit
                      </ButtonLink>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={deleteMutation.isPending}
                        onClick={() => handleDelete(product.id, product.name)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <Pagination page={params.page ?? 1} totalPages={totalPages} onChange={handlePage} />
            </div>
          </>
        )}
      </section>
    </div>
  )
}
