import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { errors } from '../lib/errors'

interface Env {
  POLAR_API_KEY: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    const url = new URL(context.request.url)
    const email = url.searchParams.get('email')
    const checkoutId = url.searchParams.get('checkout_id')

    // 이메일로 Supabase에서 구독 상태 확인
    if (email) {
      const supabaseUrl = context.env.SUPABASE_URL
      const supabaseKey = context.env.SUPABASE_SERVICE_KEY
      if (!supabaseUrl || !supabaseKey) {
        return errors.configError(corsHeaders)
      }

      const res = await fetch(
        `${supabaseUrl}/rest/v1/subscribers?email=eq.${encodeURIComponent(email)}&select=id,status,trial_ends_at,current_period_end,profile_complete,height_cm,weight_kg,gender,photo_r2_key&limit=1`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      )

      if (res.ok) {
        const rows = await res.json() as Array<{
          id: string; status: string; trial_ends_at: string | null; current_period_end: string | null;
          profile_complete: boolean; height_cm: number | null; weight_kg: number | null; gender: string | null; photo_r2_key: string | null
        }>
        if (rows.length > 0) {
          const sub = rows[0]
          return new Response(
            JSON.stringify({
              active: sub.status === 'active' || sub.status === 'trialing',
              status: sub.status,
              current_period_end: sub.current_period_end || sub.trial_ends_at,
              profile_complete: sub.profile_complete || false,
              height_cm: sub.height_cm,
              weight_kg: sub.weight_kg,
              gender: sub.gender,
              has_photo: !!sub.photo_r2_key,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          )
        }
      }

      return new Response(
        JSON.stringify({ active: false, status: 'none', current_period_end: null, profile_complete: false }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // checkout_id로 Polar에서 확인 (기존 로직)
    if (!checkoutId) {
      return errors.validation('email or checkout_id parameter is required', corsHeaders)
    }

    const polarToken = context.env.POLAR_API_KEY
    if (!polarToken) {
      return errors.configError(corsHeaders)
    }

    const checkoutRes = await fetch(`https://api.polar.sh/v1/checkouts/${checkoutId}`, {
      headers: {
        'Authorization': `Bearer ${polarToken}`,
      },
    })

    if (!checkoutRes.ok) {
      console.error('[subscription-status] Polar checkout lookup failed:', await checkoutRes.text())
      return errors.externalApi('Polar', corsHeaders)
    }

    const checkout = await checkoutRes.json() as {
      subscription_id?: string
      status?: string
    }

    if (checkout.subscription_id) {
      const subRes = await fetch(`https://api.polar.sh/v1/subscriptions/${checkout.subscription_id}`, {
        headers: {
          'Authorization': `Bearer ${polarToken}`,
        },
      })

      if (subRes.ok) {
        const subscription = await subRes.json() as {
          id: string
          status: string
          current_period_end?: string
        }

        return new Response(
          JSON.stringify({
            active: subscription.status === 'active',
            subscription_id: subscription.id,
            status: subscription.status,
            current_period_end: subscription.current_period_end,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        )
      }
    }

    return new Response(
      JSON.stringify({
        active: false,
        subscription_id: null,
        status: checkout.status || 'unknown',
        current_period_end: null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )

  } catch (error) {
    console.error('[subscription-status] Error:', error)
    return errors.internal(corsHeaders)
  }
}

export const onRequestOptions: PagesFunction = async (context) => {
  return createCorsPreflightResponse(context.request)
}
