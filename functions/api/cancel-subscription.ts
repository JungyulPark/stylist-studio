import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { errors } from '../lib/errors'

interface Env {
  POLAR_API_KEY: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    const body = await context.request.json() as { email?: string }
    const email = body.email

    if (!email) {
      return errors.validation('email is required', corsHeaders)
    }

    const { POLAR_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY } = context.env
    if (!POLAR_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return errors.configError(corsHeaders)
    }

    // 1. Look up subscriber in Supabase
    const subRes = await fetch(
      `${SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(email)}&select=id,polar_checkout_id,status&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    )

    if (!subRes.ok) {
      return errors.externalApi('Supabase', corsHeaders)
    }

    const subscribers = await subRes.json() as Array<{
      id: string
      polar_checkout_id: string | null
      status: string
    }>

    if (subscribers.length === 0) {
      return errors.validation('No subscription found for this email', corsHeaders)
    }

    const subscriber = subscribers[0]

    // 2. Find Polar subscription ID via checkout
    let polarSubscriptionId: string | null = null

    if (subscriber.polar_checkout_id) {
      try {
        const checkoutRes = await fetch(
          `https://api.polar.sh/v1/checkouts/${subscriber.polar_checkout_id}`,
          {
            headers: { 'Authorization': `Bearer ${POLAR_API_KEY}` },
          }
        )
        if (checkoutRes.ok) {
          const checkout = await checkoutRes.json() as { subscription_id?: string }
          polarSubscriptionId = checkout.subscription_id || null
        }
      } catch (e) {
        console.error('[cancel] Polar checkout lookup error:', e)
      }
    }

    // 3. Cancel on Polar (if subscription found)
    let polarCanceled = false
    if (polarSubscriptionId) {
      try {
        const cancelRes = await fetch(
          `https://api.polar.sh/v1/subscriptions/${polarSubscriptionId}`,
          {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${POLAR_API_KEY}` },
          }
        )
        if (cancelRes.ok || cancelRes.status === 204) {
          polarCanceled = true
          console.log(`[cancel] Polar subscription ${polarSubscriptionId} canceled`)
        } else {
          // Try PATCH with cancel_at_period_end as fallback
          const patchRes = await fetch(
            `https://api.polar.sh/v1/subscriptions/${polarSubscriptionId}`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${POLAR_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ cancel_at_period_end: true }),
            }
          )
          polarCanceled = patchRes.ok
          if (polarCanceled) {
            console.log(`[cancel] Polar subscription ${polarSubscriptionId} set to cancel at period end`)
          } else {
            console.error('[cancel] Polar cancel failed:', await patchRes.text())
          }
        }
      } catch (e) {
        console.error('[cancel] Polar cancel error:', e)
      }
    }

    // 4. Update Supabase status to canceled
    const updateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(email)}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'canceled',
          updated_at: new Date().toISOString(),
        }),
      }
    )

    const supabaseUpdated = updateRes.ok

    return new Response(
      JSON.stringify({
        success: true,
        polar_canceled: polarCanceled,
        supabase_updated: supabaseUpdated,
        message: polarCanceled
          ? 'Subscription canceled. Access continues until the end of current billing period.'
          : 'Subscription marked as canceled.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )

  } catch (error) {
    console.error('[cancel-subscription] Error:', error)
    return errors.internal(corsHeaders)
  }
}

export const onRequestOptions: PagesFunction = async (context) => {
  return createCorsPreflightResponse(context.request)
}
