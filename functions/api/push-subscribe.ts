import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { verifySupabaseUser } from '../lib/auth'
import { errors } from '../lib/errors'

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}

function supabaseHeaders(serviceKey: string) {
  return {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  }
}

// POST /api/push-subscribe  { subscription: PushSubscriptionJSON }
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    if (!context.env.SUPABASE_URL || !context.env.SUPABASE_SERVICE_KEY) {
      return errors.configError(corsHeaders)
    }

    const verified = await verifySupabaseUser(context.request, context.env)
    if (!verified) {
      return errors.unauthorized(corsHeaders)
    }

    let body: { subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } } }
    try {
      body = await context.request.json()
    } catch {
      return errors.invalidJson(corsHeaders)
    }

    const endpoint = body.subscription?.endpoint
    if (!endpoint || !endpoint.startsWith('https://')) {
      return errors.validation('subscription.endpoint is required', corsHeaders)
    }

    const res = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/push_subscriptions?on_conflict=endpoint`,
      {
        method: 'POST',
        headers: {
          ...supabaseHeaders(context.env.SUPABASE_SERVICE_KEY),
          'Prefer': 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({
          email: verified.email,
          user_id: verified.id,
          endpoint,
          p256dh: body.subscription?.keys?.p256dh || null,
          auth: body.subscription?.keys?.auth || null,
        }),
      }
    )

    if (!res.ok) {
      console.error('[push-subscribe] Supabase error:', res.status, await res.text())
      return errors.externalApi('Supabase', corsHeaders)
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (e) {
    console.error('[push-subscribe] Error:', e)
    return errors.internal(corsHeaders)
  }
}

// DELETE /api/push-subscribe  { endpoint }
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    const verified = await verifySupabaseUser(context.request, context.env)
    if (!verified) {
      return errors.unauthorized(corsHeaders)
    }

    let body: { endpoint?: string }
    try {
      body = await context.request.json()
    } catch {
      return errors.invalidJson(corsHeaders)
    }
    if (!body.endpoint) {
      return errors.validation('endpoint is required', corsHeaders)
    }

    await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(body.endpoint)}&email=eq.${encodeURIComponent(verified.email)}`,
      { method: 'DELETE', headers: supabaseHeaders(context.env.SUPABASE_SERVICE_KEY) }
    )

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (e) {
    console.error('[push-subscribe] Error:', e)
    return errors.internal(corsHeaders)
  }
}

export const onRequestOptions: PagesFunction = async (context) => {
  return createCorsPreflightResponse(context.request)
}
