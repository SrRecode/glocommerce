import { createBrowserRouter } from 'react-router'

import { StorefrontLayout } from '@/app/layouts/StorefrontLayout'
import { AccountOrdersPage } from '@/pages/AccountOrdersPage'
import { CartPage } from '@/pages/CartPage'
import { CheckoutPage } from '@/pages/CheckoutPage'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { OrderConfirmationPage } from '@/pages/OrderConfirmationPage'
import { OrderLookupPage } from '@/pages/OrderLookupPage'
import { ProductPage } from '@/pages/ProductPage'
import { ShopPage } from '@/pages/ShopPage'

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
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
