import { useQuery } from '@tanstack/react-query'
import { getCategoryBySlug, getProductBySlug, listCategories, listProducts } from './api'
import type { ProductListParams } from './types'

export const catalogKeys = {
  all: ['catalog'] as const,
  products: (params: ProductListParams) => ['catalog', 'products', params] as const,
  product: (slug: string) => ['catalog', 'product', slug] as const,
  categories: () => ['catalog', 'categories'] as const,
  category: (slug: string) => ['catalog', 'category', slug] as const,
}

export function useProducts(params: ProductListParams = {}) {
  return useQuery({
    queryKey: catalogKeys.products(params),
    queryFn: () => listProducts(params),
  })
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: catalogKeys.product(slug),
    queryFn: () => getProductBySlug(slug),
    enabled: Boolean(slug),
  })
}

export function useCategories() {
  return useQuery({
    queryKey: catalogKeys.categories(),
    queryFn: listCategories,
  })
}

export function useCategory(slug: string) {
  return useQuery({
    queryKey: catalogKeys.category(slug),
    queryFn: () => getCategoryBySlug(slug),
    enabled: Boolean(slug),
  })
}
