import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { errors } from '../lib/errors'

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}

// GET /api/unsubscribe?token=xxx — browser click from email link
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    const url = new URL(context.request.url)
    const token = url.searchParams.get('token')
    if (!token) {
      return new Response('Missing token', { status: 400, headers: corsHeaders })
    }

    const decoded = atob(token)
    const [subscriberId, email] = decoded.split(':')
    if (!subscriberId || !email) {
      return new Response('Invalid token', { status: 400, headers: corsHeaders })
    }

    // Cancel subscription in Supabase
    const res = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/subscribers?id=eq.${subscriberId}&email=eq.${encodeURIComponent(email)}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': context.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
        }),
      }
    )

    if (!res.ok) {
      console.error('[unsubscribe] Supabase error:', res.status)
      return new Response(unsubPage('error'), {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders },
      })
    }

    return new Response(unsubPage('success'), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders },
    })
  } catch (error) {
    console.error('[unsubscribe] Error:', error)
    return errors.internal(corsHeaders)
  }
}

// POST /api/unsubscribe?token=xxx — one-click unsubscribe (RFC 8058)
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    const url = new URL(context.request.url)
    const token = url.searchParams.get('token')
    if (!token) {
      return new Response('Missing token', { status: 400, headers: corsHeaders })
    }

    const decoded = atob(token)
    const [subscriberId, email] = decoded.split(':')
    if (!subscriberId || !email) {
      return new Response('Invalid token', { status: 400, headers: corsHeaders })
    }

    await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/subscribers?id=eq.${subscriberId}&email=eq.${encodeURIComponent(email)}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': context.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
        }),
      }
    )

    return new Response('Unsubscribed', { status: 200, headers: corsHeaders })
  } catch (error) {
    console.error('[unsubscribe] Error:', error)
    return errors.internal(corsHeaders)
  }
}

export const onRequestOptions: PagesFunction = async (context) => {
  return createCorsPreflightResponse(context.request)
}

function unsubPage(status: 'success' | 'error'): string {
  const isSuccess = status === 'success'
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isSuccess ? 'Unsubscribed' : 'Error'} — PERSONAL STYLIST</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #0a0a0a; color: #fff; }
    .container { text-align: center; max-width: 400px; padding: 40px 20px; }
    h1 { font-size: 24px; margin-bottom: 16px; }
    p { color: #888; line-height: 1.6; }
    a { color: #d4a574; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    ${isSuccess
      ? `<h1>Unsubscribed</h1><p>You've been unsubscribed from daily style emails. We'll miss styling you!</p><p><a href="https://kstylist.cc">Back to PERSONAL STYLIST</a></p>`
      : `<h1>Something went wrong</h1><p>We couldn't process your unsubscribe request. Please try again or contact support.</p><p><a href="https://kstylist.cc">Back to PERSONAL STYLIST</a></p>`
    }
  </div>
</body>
</html>`
}
