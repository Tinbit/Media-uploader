
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import React from 'react'
import UploadArea from '../components/UploadArea'

const origXHR = global.XMLHttpRequest;

class MockXHR {
  static listeners: any = {}
  upload: any
  onload: any
  status = 200
  responseText = JSON.stringify({ results: [{ ok: true }] })
  constructor() {
    this.upload = {}
  }
  open() {}
  send() {
    // simulate progress then load
    setTimeout(() => {
      if (typeof this.upload.onprogress === 'function') {
        this.upload.onprogress({ lengthComputable: true, loaded: 50, total: 100 })
        this.upload.onprogress({ lengthComputable: true, loaded: 100, total: 100 })
      }
      if (typeof this.onload === 'function') this.onload()
    }, 10)
  }
}

describe('UploadArea', () => {
  beforeEach(() => {
    // @ts-ignore
    global.XMLHttpRequest = MockXHR as any
  })
  afterEach(() => {
    // @ts-ignore
    global.XMLHttpRequest = origXHR
  })

  it('shows progress and marks done', async () => {
    render(<UploadArea />)
    const button = screen.getByRole('button', { name: /upload files/i })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    // fire change
    const file = new File(['abc'], 'testikuva.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })
    // progress bars show
    const queued = await screen.findByText('Done', {}, { timeout: 1000 })
    expect(queued).toBeInTheDocument()
  })
})
