
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import React from 'react'
import Gallery from '../components/Gallery'

describe('Gallery', () => {
  it('renders items returned by API', async () => {
    // mock fetch
    // @ts-ignore
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        items: [{
          id: '1', filename: 'a.png', originalName: 'testikuva.png', mime: 'image/png',
          kind: 'image', size: 123, createdAt: new Date().toISOString(), url: '/uploads/a.png'
        }],
        nextCursor: null
      })
    }))

    render(<Gallery />)
    const item = await screen.findByText('testikuva.png', {}, { timeout: 1000 })
    expect(item).toBeInTheDocument()
  })
})
