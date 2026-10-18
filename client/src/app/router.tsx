import { createBrowserRouter } from 'react-router'

import { AdminGuard } from '@/app/AdminGuard'
import { AdminLayout } from '@/app/layouts/AdminLayout'
import { StorefrontLayout } from '@/app/layouts/StorefrontLayout'
import { AccountOrdersPage } from '@/pages/AccountOrdersPage'
import { CartPage } from '@/pages/CartPage'
import { CheckoutPage } from '@/pages/CheckoutPage'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { OrderConfirmationPage } from '@/pages/OrderConfirmationPage'
import { OrderLookupPage } from '@/pages/OrderLookupPage'
import { ProductPage } from '@/pages/ProductPage'
import { ShopPage } from '@/pages/ShopPage'
import { AdminCategoriesPage } from '@/pages/admin/AdminCategoriesPage'
import { AdminOrderDetailPage } from '@/pages/admin/AdminOrderDetailPage'
import { AdminOrdersPage } from '@/pages/admin/AdminOrdersPage'
import { AdminOverviewPage } from '@/pages/admin/AdminOverviewPage'
import { AdminProductFormPage } from '@/pages/admin/AdminProductFormPage'
import { AdminProductsPage } from '@/pages/admin/AdminProductsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <StorefrontLayout />,
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
