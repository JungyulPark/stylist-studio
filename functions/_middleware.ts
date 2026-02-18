/**
 * Rate limiting middleware for Cloudflare Pages Functions.
 *
 * Uses an in-memory sliding window per worker isolate.
 * Not perfect across distributed instances, but catches burst abuse
 * on expensive AI endpoints — Cloudflare's own DDoS layer handles the rest.
 */

interface RateLimitEntry {
  timestamps: number[]
}

const rateLimitMap = new Map<string, RateLimitEntry>()

// Clean up old entries every 5 minutes to prevent memory leaks
let lastCleanup = Date.now()
const CLEANUP_INTERVAL = 5 * 60 * 1000

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of rateLimitMap) {
    // Remove entries with no recent activity (2 min window)
    if (entry.timestamps.length === 0 || now - entry.timestamps[entry.timestamps.length - 1] > 120_000) {
      rateLimitMap.delete(key)
    }
  }
}

function isRateLimited(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  cleanup(now)

  const entry = rateLimitMap.get(key) || { timestamps: [] }

  // Remove timestamps outside the window
  const cutoff = now - windowMs
  entry.timestamps = entry.timestamps.filter(t => t > cutoff)

  if (entry.timestamps.length >= maxRequests) {
    return true
  }

  entry.timestamps.push(now)
  rateLimitMap.set(key, entry)
  return false
}

// Rate limit tiers: [maxRequests, windowMs]
const RATE_LIMITS: Record<string, [number, number]> = {
  // Expensive AI image generation — 5 requests per minute
  '/api/generate-styles':      [5, 60_000],
  '/api/generate-hair-styles': [5, 60_000],
  '/api/transform-batch':      [5, 60_000],

  // Payment/checkout — 10 per minute
  '/api/create-checkout':      [10, 60_000],
  '/api/subscribe':            [10, 60_000],
  '/api/customer-portal':      [10, 60_000],

  // Auth/profile — 20 per minute
  '/api/update-subscriber-profile': [20, 60_000],
  '/api/cancel-subscription':       [10, 60_000],

  // Read endpoints — 30 per minute
  '/api/subscription-status':  [30, 60_000],
  '/api/daily-style':          [30, 60_000],
  '/api/favorite-image':       [30, 60_000],
}

// Skip rate limiting for these paths
const EXEMPT_PATHS = [
  '/api/polar-webhook',      // Webhooks must always go through
  '/api/daily-style-cron',   // Cron jobs (already protected by CRON_SECRET)
  '/api/unsubscribe',        // Email unsubscribe links must always work
]

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url)
  const path = url.pathname

  // Skip non-API routes and exempt paths
  if (!path.startsWith('/api/') || EXEMPT_PATHS.includes(path)) {
    return context.next()
  }

  // Get client IP from Cloudflare headers
  const clientIp = context.request.headers.get('cf-connecting-ip') ||
                   context.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                   'unknown'

  // Find matching rate limit tier, or use default (60/min)
  const [maxReqs, windowMs] = RATE_LIMITS[path] || [60, 60_000]
  const key = `${clientIp}:${path}`

  if (isRateLimited(key, maxReqs, windowMs)) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT',
        retry_after_seconds: Math.ceil(windowMs / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil(windowMs / 1000)),
        },
      }
    )
  }

  return context.next()
}
