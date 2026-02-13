import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { errors } from '../lib/errors'

interface Env {
  POLAR_API_KEY: string
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    const polarToken = context.env.POLAR_API_KEY
    if (!polarToken) {
      return errors.configError(corsHeaders)
    }

    const url = new URL(context.request.url)
    const checkoutId = url.searchParams.get('checkout_id')

    if (!checkoutId) {
      return errors.validation('checkout_id parameter is required', corsHeaders)
    }

    // Polar API로 checkout 정보 조회하여 subscription 상태 확인
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

    // subscription_id가 있으면 구독 상세 정보 조회
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

    // subscription_id가 없는 경우 (아직 구독 시작 안됨)
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
