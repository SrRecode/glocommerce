import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAdminCategory,
  createAdminProduct,
  deleteAdminCategory,
  deleteAdminProduct,
  getAdminOrder,
  getAdminProduct,
  listAdminCategories,
  listAdminOrders,
  listAdminProducts,
  updateAdminCategory,
  updateAdminOrderStatus,
  updateAdminProduct,
} from './api'
import type { OrderListParams, OrderStatus } from '@/features/orders/types'
import type {
  AdminCategoryInput,
  AdminProductInput,
  AdminProductListParams,
} from './types'

export const adminKeys = {
  all: ['admin'] as const,
  products: (params: AdminProductListParams) => ['admin', 'products', params] as const,
  product: (id: string) => ['admin', 'products', id] as const,
  categories: () => ['admin', 'categories'] as const,
  orders: (params: OrderListParams) => ['admin', 'orders', params] as const,
  order: (id: string) => ['admin', 'orders', id] as const,
}

export function useAdminProducts(params: AdminProductListParams = {}) {
  return useQuery({
    queryKey: adminKeys.products(params),
    queryFn: () => listAdminProducts(params),
  })
}

export function useAdminProduct(id: string) {
  return useQuery({
    queryKey: adminKeys.product(id),
    queryFn: () => getAdminProduct(id),
    enabled: Boolean(id),
  })
}

export function useAdminCategories() {
  return useQuery({
    queryKey: adminKeys.categories(),
    queryFn: listAdminCategories,
  })
}

export function useAdminOrders(params: OrderListParams = {}) {
  return useQuery({
    queryKey: adminKeys.orders(params),
    queryFn: () => listAdminOrders(params),
  })
}

export function useAdminOrder(id: string) {
  return useQuery({
    queryKey: adminKeys.order(id),
    queryFn: () => getAdminOrder(id),
    enabled: Boolean(id),
  })
}

export function useCreateAdminProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AdminProductInput) => createAdminProduct(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.all })
    },
  })
}

export function useUpdateAdminProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminProductInput }) =>
      updateAdminProduct(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.all })
    },
  })
}

export function useDeleteAdminProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAdminProduct(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.all })
    },
  })
}

export function useCreateAdminCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AdminCategoryInput) => createAdminCategory(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.all })
    },
  })
}

export function useUpdateAdminCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminCategoryInput }) =>
      updateAdminCategory(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.all })
    },
  })
}

export function useDeleteAdminCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAdminCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.all })
    },
  })
}

export function useUpdateAdminOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      updateAdminOrderStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.all })
    },
  })
}
