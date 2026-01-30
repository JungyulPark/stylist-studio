import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { errors } from '../lib/errors'

interface Env {
  POLAR_API_KEY: string
  RESEND_API_KEY: string
}

interface RefundRequest {
  checkoutId: string
  reason?: string
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const corsHeaders = getCorsHeaders(request)

  try {
    if (!env.POLAR_API_KEY) {
      return errors.configError(corsHeaders)
    }

    let body: RefundRequest
    try {
      body = await request.json() as RefundRequest
    } catch {
      return errors.invalidJson(corsHeaders)
    }

    const { checkoutId, reason } = body

    if (!checkoutId) {
      return errors.validation('Checkout ID is required', corsHeaders)
    }

    // Step 1: Get checkout info to find the order
    const checkoutResponse = await fetch(`https://api.polar.sh/v1/checkouts/${checkoutId}`, {
      headers: {
        'Authorization': `Bearer ${env.POLAR_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!checkoutResponse.ok) {
      console.error('[refund] Failed to get checkout:', checkoutResponse.status)
      return errors.externalApi('Polar', corsHeaders)
    }

    const checkout = await checkoutResponse.json() as {
      id: string
      status: string
      order_id?: string
      customer_email?: string
    }

    // Check if checkout was successful and has an order
    if (checkout.status !== 'succeeded' && checkout.status !== 'confirmed') {
      return new Response(
        JSON.stringify({
          error: 'Cannot refund',
          code: 'CHECKOUT_NOT_COMPLETED',
          message: 'Checkout was not completed successfully'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Step 2: Find the order associated with this checkout
    // Polar API: GET /v1/orders with checkout_id filter
    const ordersResponse = await fetch(`https://api.polar.sh/v1/orders?checkout_id=${checkoutId}`, {
      headers: {
        'Authorization': `Bearer ${env.POLAR_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!ordersResponse.ok) {
      console.error('[refund] Failed to get orders:', ordersResponse.status)
      return errors.externalApi('Polar', corsHeaders)
    }

    const ordersData = await ordersResponse.json() as {
      items: Array<{ id: string; amount: number; currency: string }>
    }

    if (!ordersData.items || ordersData.items.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No order found',
          code: 'ORDER_NOT_FOUND',
          message: 'No order found for this checkout'
        }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const order = ordersData.items[0]

    // Step 3: Issue refund
    const refundResponse = await fetch(`https://api.polar.sh/v1/orders/${order.id}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.POLAR_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: reason || 'Service generation failed - automatic refund'
      })
    })

    if (!refundResponse.ok) {
      const refundError = await refundResponse.text()
      console.error('[refund] Refund failed:', refundError)

      // Check if already refunded
      if (refundResponse.status === 400 && refundError.includes('already')) {
        return new Response(
          JSON.stringify({
            success: true,
            alreadyRefunded: true,
            message: 'Order was already refunded'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        )
      }

      return errors.externalApi('Polar', corsHeaders)
    }

    const refundResult = await refundResponse.json()
    console.log('[refund] Refund successful:', order.id)

    // Step 4: Send refund notification email if we have customer email
    if (checkout.customer_email && env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(env.RESEND_API_KEY)

        await resend.emails.send({
          from: 'PERSONAL STYLIST <noreply@kstylist.cc>',
          to: checkout.customer_email,
          subject: 'Refund Processed - PERSONAL STYLIST',
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#111;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:40px;text-align:center;border-bottom:1px solid #222;">
          <div style="font-size:24px;font-weight:bold;color:#c9a962;letter-spacing:2px;">PERSONAL STYLIST</div>
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="color:#fff;font-size:1.5em;margin:0 0 20px;">Refund Processed</h1>
          <p style="color:#e0e0e0;line-height:1.7;">
            We're sorry that we couldn't complete your style analysis. Your payment has been fully refunded.
          </p>
          <p style="color:#e0e0e0;line-height:1.7;">
            <strong>Refund Amount:</strong> $${(order.amount / 100).toFixed(2)} ${order.currency.toUpperCase()}<br>
            <strong>Reason:</strong> ${reason || 'Service generation failed'}
          </p>
          <p style="color:#888;font-size:0.9em;margin-top:30px;">
            The refund will appear on your statement within 5-10 business days.
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px;background-color:#0a0a0a;text-align:center;">
          <p style="color:#555;font-size:11px;margin:0;">© 2026 PERSONAL STYLIST. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
          `
        })
      } catch (emailErr) {
        console.error('[refund] Failed to send refund email:', emailErr)
        // Don't fail the refund if email fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        refundId: refundResult.id,
        amount: order.amount,
        currency: order.currency,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (err) {
    console.error('[refund] Unexpected error:', err)
    return errors.internal(corsHeaders)
  }
}

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return createCorsPreflightResponse(request)
}
