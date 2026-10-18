import { useState } from 'react'
import { ImageOff, Minus, Plus } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { ButtonLink } from '@/components/ButtonLink'
import { EmptyState } from '@/components/EmptyState'
import { Price } from '@/components/Price'
import { ProductCard } from '@/components/ProductCard'
import { Rating } from '@/components/Rating'
import { Skeleton } from '@/components/Skeleton'
import { useCartStore, clampQuantity } from '@/features/cart/cart-store'
import { useProduct, useProducts } from '@/features/catalog/queries'

const STEPPER_CLASSES =
  'inline-flex size-10 items-center justify-center rounded-md border border-line text-graphite transition-colors duration-120 hover:bg-surface-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-50'

export function ProductPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug ?? ''

  const productQuery = useProduct(slug)
  const addItem = useCartStore((state) => state.addItem)

  const [activeImage, setActiveImage] = useState(0)
  const [quantity, setQuantity] = useState(1)

  const product = productQuery.data
  const categorySlug = product?.category?.slug
  const relatedQuery = useProducts(
    categorySlug ? { category: categorySlug, limit: 4 } : { limit: 4 },
  )

  if (productQuery.isPending) {
    return (
      <div className="mx-auto grid w-full max-w-storefront gap-12 px-6 py-14 lg:grid-cols-2 lg:px-10">
        <Skeleton className="aspect-4/5 w-full rounded-lg" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-48" />
        </div>
      </div>
    )
  }

  if (productQuery.isError || !product) {
    return (
      <div className="mx-auto w-full max-w-storefront px-6 py-20 lg:px-10">
        <EmptyState
          title="We could not find that piece"
          description="It may have sold out or been retired from the catalogue."
          action={<ButtonLink to="/products">Back to the catalogue</ButtonLink>}
        />
      </div>
    )
  }

  const hasImages = product.images.length > 0
  const mainImage = hasImages ? (product.images[activeImage] ?? product.images[0]) : null
  const isOutOfStock = product.stock <= 0
  const isLowStock = !isOutOfStock && product.stock <= 5
  const upperBound = clampQuantity(Number.MAX_SAFE_INTEGER, product.stock)
  const relatedItems = relatedQuery.data
    ? relatedQuery.data.items.filter((item) => item.id !== product.id).slice(0, 3)
    : []

  function handleAddToCart() {
    if (!product) {
      return
    }
    const primaryImage = product.images[0]
    addItem(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image: primaryImage ? primaryImage.url : null,
        unitPrice: product.price,
        currency: product.currency,
        maxStock: product.stock,
      },
      quantity,
    )
  }

  return (
    <>
      <div className="mx-auto w-full max-w-storefront px-6 py-8 lg:px-10">
        <nav aria-label="Breadcrumb" className="text-caption text-muted">
          <Link to="/" className="transition-colors duration-120 hover:text-brand">
            Home
          </Link>
          <span aria-hidden="true" className="px-2">
            /
          </span>
          <Link to="/products" className="transition-colors duration-120 hover:text-brand">
            Catalogue
          </Link>
          {product.category ? (
            <>
              <span aria-hidden="true" className="px-2">
                /
              </span>
              <Link
                to={`/products?category=${encodeURIComponent(product.category.slug)}`}
                className="transition-colors duration-120 hover:text-brand"
              >
                {product.category.name}
              </Link>
            </>
          ) : null}
        </nav>
      </div>

      <section className="mx-auto grid w-full max-w-storefront gap-12 px-6 pb-16 lg:grid-cols-2 lg:gap-16 lg:px-10">
        <div className="flex flex-col gap-4">
          <div className="relative aspect-4/5 overflow-hidden rounded-lg border border-line bg-surface-sunken">
            {mainImage ? (
              <img
                src={mainImage.url}
                alt={mainImage.alt || product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-line">
                <ImageOff size={40} strokeWidth={1.5} aria-hidden="true" />
              </div>
            )}
          </div>

          {product.images.length > 1 ? (
            <div className="flex flex-wrap gap-3">
              {product.images.map((image, index) => (
                <button
                  key={`${image.url}-${index}`}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={`View image ${index + 1}`}
                  aria-current={index === activeImage ? true : undefined}
                  className={
                    index === activeImage
                      ? 'size-16 overflow-hidden rounded-md border-2 border-brand'
                      : 'size-16 overflow-hidden rounded-md border border-line transition-colors duration-120 hover:border-graphite'
                  }
                >
                  <img
                    src={image.url}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            {product.brand ? (
              <p className="text-caption uppercase tracking-[0.08em] text-muted">
                {product.brand}
              </p>
            ) : null}
            <h1 className="font-display text-display-lg tracking-[-0.02em] text-ink">
              {product.name}
            </h1>
            {product.reviewCount > 0 ? (
              <Rating value={product.rating} reviewCount={product.reviewCount} />
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Price
              amount={product.price}
              currency={product.currency}
              compareAt={product.compareAtPrice}
              size="lg"
            />
            {isOutOfStock ? <Badge tone="neutral">Out of stock</Badge> : null}
            {isLowStock ? <Badge tone="warning">Only {product.stock} left</Badge> : null}
          </div>

          <p className="max-w-[68ch] whitespace-pre-line text-body text-graphite">
            {product.description}
          </p>

          <div className="flex flex-col gap-4 border-t border-line pt-6">
            <div className="flex items-center gap-4">
              <span className="text-body-sm font-medium text-graphite">Quantity</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity((value) => clampQuantity(value - 1, product.stock))}
                  disabled={isOutOfStock || quantity <= 1}
                  aria-label="Decrease quantity"
                  className={STEPPER_CLASSES}
                >
                  <Minus size={16} strokeWidth={1.5} aria-hidden="true" />
                </button>
                <span
                  aria-live="polite"
                  className="w-10 text-center text-body font-semibold tabular-nums text-ink"
                >
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((value) => clampQuantity(value + 1, product.stock))}
                  disabled={isOutOfStock || quantity >= upperBound}
                  aria-label="Increase quantity"
                  className={STEPPER_CLASSES}
                >
                  <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" disabled={isOutOfStock} onClick={handleAddToCart}>
                {isOutOfStock ? 'Out of stock' : 'Add to cart'}
              </Button>
              <ButtonLink to="/cart" variant="secondary" size="lg">
                View cart
              </ButtonLink>
            </div>

            <p className="text-caption text-muted">
              Cash on delivery. Seven-day returns on unused pieces.
            </p>
          </div>

          {product.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2 border-t border-line pt-6">
              {product.tags.map((tag) => (
                <Badge key={tag} tone="neutral">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {categorySlug && relatedItems.length > 0 ? (
        <section className="border-t border-line bg-surface">
          <div className="mx-auto w-full max-w-storefront px-6 py-14 lg:px-10">
            <h2 className="font-display text-h3 text-ink">More in {product.category?.name}</h2>
            <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-3">
              {relatedItems.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  )
}
