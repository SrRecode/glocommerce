import { lazy } from 'react'

export const HomePage = lazy(() =>
  import('@/pages/HomePage').then((module) => ({ default: module.HomePage })),
)
export const ShopPage = lazy(() =>
  import('@/pages/ShopPage').then((module) => ({ default: module.ShopPage })),
)
export const ProductPage = lazy(() =>
  import('@/pages/ProductPage').then((module) => ({ default: module.ProductPage })),
)
export const CartPage = lazy(() =>
  import('@/pages/CartPage').then((module) => ({ default: module.CartPage })),
)
export const CheckoutPage = lazy(() =>
  import('@/pages/CheckoutPage').then((module) => ({ default: module.CheckoutPage })),
)
export const OrderLookupPage = lazy(() =>
  import('@/pages/OrderLookupPage').then((module) => ({ default: module.OrderLookupPage })),
)
export const OrderConfirmationPage = lazy(() =>
  import('@/pages/OrderConfirmationPage').then((module) => ({
    default: module.OrderConfirmationPage,
  })),
)
export const AccountOrdersPage = lazy(() =>
  import('@/pages/AccountOrdersPage').then((module) => ({
    default: module.AccountOrdersPage,
  })),
)
export const LoginPage = lazy(() =>
  import('@/pages/LoginPage').then((module) => ({ default: module.LoginPage })),
)
export const AdminOverviewPage = lazy(() =>
  import('@/pages/admin/AdminOverviewPage').then((module) => ({
    default: module.AdminOverviewPage,
  })),
)
export const AdminOrdersPage = lazy(() =>
  import('@/pages/admin/AdminOrdersPage').then((module) => ({
    default: module.AdminOrdersPage,
  })),
)
export const AdminOrderDetailPage = lazy(() =>
  import('@/pages/admin/AdminOrderDetailPage').then((module) => ({
    default: module.AdminOrderDetailPage,
  })),
)
export const AdminProductsPage = lazy(() =>
  import('@/pages/admin/AdminProductsPage').then((module) => ({
    default: module.AdminProductsPage,
  })),
)
export const AdminProductFormPage = lazy(() =>
  import('@/pages/admin/AdminProductFormPage').then((module) => ({
    default: module.AdminProductFormPage,
  })),
)
export const AdminCategoriesPage = lazy(() =>
  import('@/pages/admin/AdminCategoriesPage').then((module) => ({
    default: module.AdminCategoriesPage,
  })),
)
