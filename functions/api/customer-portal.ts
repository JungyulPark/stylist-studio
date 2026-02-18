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

    // 1. Find Polar customer ID
    //    Try: Supabase subscriber → checkout → customer, or direct Polar customer lookup by email
    let polarCustomerId: string | null = null

    // First, try looking up via Polar customers API by email
    const customersRes = await fetch(
      `https://api.polar.sh/v1/customers/?email=${encodeURIComponent(email)}&limit=1`,
      {
        headers: { 'Authorization': `Bearer ${POLAR_API_KEY}` },
      }
    )

    if (customersRes.ok) {
      const customersData = await customersRes.json() as {
        items?: Array<{ id: string; email: string }>
      }
      if (customersData.items && customersData.items.length > 0) {
        polarCustomerId = customersData.items[0].id
      }
    }

    // Fallback: look up via checkout_id in Supabase → Polar checkout → customer
    if (!polarCustomerId) {
      const subRes = await fetch(
        `${SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(email)}&select=polar_checkout_id&limit=1`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
        }
      )

      if (subRes.ok) {
        const rows = await subRes.json() as Array<{ polar_checkout_id: string | null }>
        if (rows.length > 0 && rows[0].polar_checkout_id) {
          const checkoutRes = await fetch(
            `https://api.polar.sh/v1/checkouts/${rows[0].polar_checkout_id}`,
            {
              headers: { 'Authorization': `Bearer ${POLAR_API_KEY}` },
            }
          )
          if (checkoutRes.ok) {
            const checkout = await checkoutRes.json() as { customer_id?: string }
            polarCustomerId = checkout.customer_id || null
          }
        }
      }
    }

    if (!polarCustomerId) {
      return errors.notFound('Polar customer', corsHeaders)
    }

    // 2. Create a Customer Session → get portal URL
    const origin = new URL(context.request.url).origin
    const sessionRes = await fetch('https://api.polar.sh/v1/customer-sessions/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${POLAR_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_id: polarCustomerId,
      }),
    })

    if (!sessionRes.ok) {
      console.error('[customer-portal] Polar session creation failed:', await sessionRes.text())
      return errors.externalApi('Polar', corsHeaders)
    }

    const session = await sessionRes.json() as Record<string, unknown>
    // Polar API may return camelCase (SDK) or snake_case (REST) — handle both
    const portalUrl = (session.customer_portal_url || session.customerPortalUrl) as string | undefined

    if (!portalUrl) {
      console.error('[customer-portal] No portal URL in response:', JSON.stringify(session))
      return errors.externalApi('Polar', corsHeaders)
    }

    return new Response(
      JSON.stringify({ url: portalUrl }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )

  } catch (error) {
    console.error('[customer-portal] Error:', error)
    return errors.internal(corsHeaders)
  }
}

export const onRequestOptions: PagesFunction = async (context) => {
  return createCorsPreflightResponse(context.request)
}
