import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { errors } from '../lib/errors'

interface Env {
  POLAR_API_KEY: string
}

interface PolarCheckout {
  id: string
  status: string
  customer_email: string | null
  customer_name: string | null
  product_id: string
  amount: number
  currency: string
  metadata: Record<string, string>
  created_at: string
  succeeded_at: string | null
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const corsHeaders = getCorsHeaders(request)

  try {
    const url = new URL(request.url)
    const checkoutId = url.searchParams.get('id')

    if (!checkoutId) {
      return errors.validation('Checkout ID is required', corsHeaders)
    }

    if (!env.POLAR_API_KEY) {
      return errors.configError(corsHeaders)
    }

    // Get checkout info from Polar
    const response = await fetch(`https://api.polar.sh/v1/checkouts/${checkoutId}`, {
      headers: {
        'Authorization': `Bearer ${env.POLAR_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('[checkout-info] Polar API error:', response.status)
      return errors.externalApi('Polar', corsHeaders)
    }

    const checkout = await response.json() as PolarCheckout

    return new Response(
      JSON.stringify({
        id: checkout.id,
        status: checkout.status,
        email: checkout.customer_email,
        name: checkout.customer_name,
        amount: checkout.amount,
        currency: checkout.currency,
        productType: checkout.metadata?.product_type || 'full',
        succeededAt: checkout.succeeded_at,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    )
  } catch (err) {
    console.error('[checkout-info] Error:', err)
    return errors.internal(corsHeaders)
  }
}

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return createCorsPreflightResponse(request)
}
