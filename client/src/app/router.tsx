import { createBrowserRouter } from 'react-router'

import { AdminGuard } from '@/app/AdminGuard'
import { RouteErrorFallback } from '@/app/ErrorBoundary'
import {
  AccountOrdersPage,
  AdminCategoriesPage,
  AdminOrderDetailPage,
  AdminOrdersPage,
  AdminOverviewPage,
  AdminProductFormPage,
  AdminProductsPage,
  CartPage,
  CheckoutPage,
  HomePage,
  LoginPage,
  OrderConfirmationPage,
  OrderLookupPage,
  ProductPage,
  ShopPage,
} from '@/app/lazy-pages'
import { AdminLayout } from '@/app/layouts/AdminLayout'
import { StorefrontLayout } from '@/app/layouts/StorefrontLayout'
import { NotFoundPage } from '@/pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <StorefrontLayout />,
    errorElement: <RouteErrorFallback />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'products', element: <ShopPage /> },
      { path: 'products/:slug', element: <ProductPage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'orders/lookup', element: <OrderLookupPage /> },
      { path: 'orders/:orderNumber', element: <OrderConfirmationPage /> },
      { path: 'account/orders', element: <AccountOrdersPage /> },
      { path: 'login', element: <LoginPage /> },
    ],
  },
  {
    path: 'admin',
    element: (
      <AdminGuard>
        <AdminLayout />
      </AdminGuard>
    ),
    errorElement: <RouteErrorFallback />,
    children: [
      { index: true, element: <AdminOverviewPage /> },
      { path: 'orders', element: <AdminOrdersPage /> },
      { path: 'orders/:id', element: <AdminOrderDetailPage /> },
      { path: 'products', element: <AdminProductsPage /> },
      { path: 'products/new', element: <AdminProductFormPage /> },
      { path: 'products/:id/edit', element: <AdminProductFormPage /> },
      { path: 'categories', element: <AdminCategoriesPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
