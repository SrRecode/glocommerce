import { ImageOff } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/Badge'
import { Price } from '@/components/Price'
import { Rating } from '@/components/Rating'
import type { PublicProduct } from '@/features/catalog/types'
import { cn } from '@/lib/utils'

interface ProductCardProps {
  product: PublicProduct
  className?: string
}

export function ProductCard({ product, className }: ProductCardProps) {
  const image = product.images[0]
  const isOnSale =
    typeof product.compareAtPrice === 'number' && product.compareAtPrice > product.price
  const isOutOfStock = product.stock <= 0

  return (
    <Link to={`/products/${product.slug}`} className={cn('group flex flex-col gap-3', className)}>
      <div className="relative aspect-4/5 overflow-hidden rounded-lg border border-line bg-surface-sunken">
        {image ? (
          <img
            src={image.url}
            alt={image.alt || product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-line">
            <ImageOff size={32} strokeWidth={1.5} aria-hidden="true" />
          </div>
        )}
        {isOutOfStock ? (
          <span className="absolute left-3 top-3">
            <Badge tone="neutral">Out of stock</Badge>
          </span>
        ) : isOnSale ? (
          <span className="absolute left-3 top-3">
            <Badge tone="accent">Sale</Badge>
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        {product.brand ? (
          <p className="text-caption uppercase tracking-[0.08em] text-muted">{product.brand}</p>
        ) : null}
        <h3 className="text-body-sm font-medium text-ink transition-colors duration-120 group-hover:text-brand">
          {product.name}
        </h3>
        <Price
          amount={product.price}
          currency={product.currency}
          compareAt={product.compareAtPrice}
        />
        {product.reviewCount > 0 ? (
          <Rating value={product.rating} reviewCount={product.reviewCount} />
        ) : null}
      </div>
    </Link>
  )
}
