import '@fontsource-variable/fraunces'
import '@fontsource-variable/inter'
import '@/index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'

import { AppProviders } from '@/app/providers'
import { router } from '@/app/router'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element #root is missing from index.html')
}

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)
