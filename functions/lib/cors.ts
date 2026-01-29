/**
 * CORS (Cross-Origin Resource Sharing) utilities
 *
 * This module provides centralized CORS handling for all API endpoints.
 * Only allowed origins can access the API.
 */

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://stylist-studio.pages.dev',
  'https://personal-stylist-studio.pages.dev',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
]

/**
 * Check if an origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false
  return ALLOWED_ORIGINS.some(allowed =>
    origin === allowed || origin.endsWith('.pages.dev')
  )
}

/**
 * Get CORS headers for a request
 * Returns headers with the appropriate Access-Control-Allow-Origin
 */
export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin')

  // Use the request origin if allowed, otherwise use the first allowed origin
  const allowedOrigin = origin && isOriginAllowed(origin)
    ? origin
    : ALLOWED_ORIGINS[0]

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400', // 24 hours
  }
}

/**
 * Create a CORS preflight response (for OPTIONS requests)
 */
export function createCorsPreflightResponse(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  })
}

/**
 * Add CORS headers to an existing response
 */
export function withCors(response: Response, request: Request): Response {
  const corsHeaders = getCorsHeaders(request)
  const newHeaders = new Headers(response.headers)

  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value)
  })

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  })
}
