import { render, screen } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it } from 'vitest'

import { HomePage } from '@/pages/HomePage'

function renderHomePage() {
  const router = createMemoryRouter([{ path: '/', element: <HomePage /> }])

  return render(<RouterProvider router={router} />)
}

describe('HomePage', () => {
  it('renders a single top-level heading naming the promise', () => {
    renderHomePage()

    const headings = screen.getAllByRole('heading', { level: 1 })

    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent(/considered goods/i)
  })

  it('lists the editorial collections', () => {
    renderHomePage()

    expect(screen.getAllByRole('link', { name: /kitchen/i })).toHaveLength(1)
    expect(screen.getByRole('link', { name: /stationery/i })).toBeInTheDocument()
  })
})
