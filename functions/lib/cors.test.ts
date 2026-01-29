import { describe, it, expect } from 'vitest'
import { isOriginAllowed, getCorsHeaders, createCorsPreflightResponse } from './cors'

describe('isOriginAllowed', () => {
  it('allows localhost development URLs', () => {
    expect(isOriginAllowed('http://localhost:5173')).toBe(true)
    expect(isOriginAllowed('http://localhost:4173')).toBe(true)
    expect(isOriginAllowed('http://127.0.0.1:5173')).toBe(true)
  })

  it('allows Cloudflare Pages URLs', () => {
    expect(isOriginAllowed('https://stylist-studio.pages.dev')).toBe(true)
    expect(isOriginAllowed('https://personal-stylist-studio.pages.dev')).toBe(true)
    expect(isOriginAllowed('https://preview-123.stylist-studio.pages.dev')).toBe(true)
  })

  it('rejects unknown origins', () => {
    expect(isOriginAllowed('https://evil-site.com')).toBe(false)
    expect(isOriginAllowed('https://example.com')).toBe(false)
    expect(isOriginAllowed(null)).toBe(false)
    expect(isOriginAllowed('')).toBe(false)
  })
})

describe('getCorsHeaders', () => {
  it('returns headers with allowed origin', () => {
    const request = new Request('https://api.example.com', {
      headers: { Origin: 'http://localhost:5173' },
    })

    const headers = getCorsHeaders(request)

    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173')
    expect(headers['Access-Control-Allow-Methods']).toContain('POST')
    expect(headers['Access-Control-Allow-Headers']).toContain('Content-Type')
  })

  it('returns default origin for disallowed origin', () => {
    const request = new Request('https://api.example.com', {
      headers: { Origin: 'https://evil-site.com' },
    })

    const headers = getCorsHeaders(request)

    expect(headers['Access-Control-Allow-Origin']).toBe('https://stylist-studio.pages.dev')
  })
})

describe('createCorsPreflightResponse', () => {
  it('creates 204 response with CORS headers', () => {
    const request = new Request('https://api.example.com', {
      headers: { Origin: 'http://localhost:5173' },
    })

    const response = createCorsPreflightResponse(request)

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173')
  })
})
