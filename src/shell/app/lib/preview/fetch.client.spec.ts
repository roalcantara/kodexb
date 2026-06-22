import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { fetchPreviewImageFromUrl } from './fetch.client'

const originalFetch = globalThis.fetch

function stubFetch(body: string, ok = true) {
  globalThis.fetch = mock(async () => new Response(body, { status: ok ? 200 : 500 })) as unknown as typeof fetch
}

function stubFailingFetch() {
  globalThis.fetch = mock(() => Promise.reject(new Error('network error'))) as unknown as typeof fetch
}

beforeEach(() => {
  globalThis.fetch = originalFetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('fetchPreviewImageFromUrl', () => {
  it('returns null for malformed URL', async () => {
    const result = await fetchPreviewImageFromUrl('not-a-url')
    expect(result).toBeNull()
  })

  it('returns null for file: protocol', async () => {
    const result = await fetchPreviewImageFromUrl('file:///etc/passwd')
    expect(result).toBeNull()
  })

  it('returns null for data: protocol', async () => {
    const result = await fetchPreviewImageFromUrl('data:text/html,<p>hi</p>')
    expect(result).toBeNull()
  })

  it('returns null for ftp: protocol', async () => {
    const result = await fetchPreviewImageFromUrl('ftp://example.com/file')
    expect(result).toBeNull()
  })

  it('preserves http: behavior', async () => {
    stubFetch('<html><head><meta property="og:image" content="https://img.example.com/thumb.jpg"></head></html>')
    const result = await fetchPreviewImageFromUrl('http://example.com/page')
    expect(result).not.toBeNull()
    expect(result?.url).toContain('img.example.com')
  })

  it('preserves https: behavior', async () => {
    stubFetch('<html><head><meta property="og:image" content="https://cdn.example.com/pic.png"></head></html>')
    const result = await fetchPreviewImageFromUrl('https://example.com/page')
    expect(result).not.toBeNull()
    expect(result?.url).toContain('cdn.example.com')
  })

  it('returns null on failed fetch', async () => {
    stubFailingFetch()
    const result = await fetchPreviewImageFromUrl('https://down.example.com')
    expect(result).toBeNull()
  })

  it('returns null on non-ok response', async () => {
    stubFetch('', false)
    const result = await fetchPreviewImageFromUrl('https://error.example.com')
    expect(result).toBeNull()
  })
})
