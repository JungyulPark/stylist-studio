import { errors } from '../lib/errors'

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  POLAR_WEBHOOK_SECRET: string
}

interface PolarWebhookEvent {
  type: string
  data: {
    id: string
    status: string
    customer_email?: string
    customer?: { email: string }
    product?: { id: string; name: string }
    subscription?: { id: string; status: string }
    subscription_id?: string
    current_period_end?: string
    metadata?: Record<string, string>
    // Subscription fields
    started_at?: string
    ended_at?: string
    cancel_at_period_end?: boolean
    // Order fields
    billing_address?: { country: string }
  }
}

// Verify Polar webhook signature using HMAC-SHA256
async function verifySignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
    const computed = Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    return computed === signature
  } catch {
    return false
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    if (!context.env.SUPABASE_URL || !context.env.SUPABASE_SERVICE_KEY) {
      return errors.configError({})
    }

    const rawBody = await context.request.text()

    // Verify webhook signature if secret is configured
    if (context.env.POLAR_WEBHOOK_SECRET) {
      const signature = context.request.headers.get('webhook-signature') ||
                       context.request.headers.get('x-polar-signature') || ''

      // Extract the hex signature (format: "v1,<hex>")
      const sigPart = signature.includes(',') ? signature.split(',')[1] : signature

      if (!sigPart || !(await verifySignature(rawBody, sigPart, context.env.POLAR_WEBHOOK_SECRET))) {
        console.error('[polar-webhook] Invalid signature')
        return new Response('Invalid signature', { status: 401 })
      }
    }

    const event: PolarWebhookEvent = JSON.parse(rawBody)
    console.log(`[polar-webhook] Event: ${event.type}`)

    const email = event.data.customer_email || event.data.customer?.email
    if (!email) {
      console.log('[polar-webhook] No email in event, skipping')
      return new Response('OK', { status: 200 })
    }

    switch (event.type) {
      case 'subscription.created':
      case 'subscription.active': {
        await updateSubscriberStatus(context.env, email, {
          status: 'active',
          polar_subscription_id: event.data.id,
          current_period_end: event.data.current_period_end || null,
        })
        break
      }

      case 'subscription.updated': {
        if (event.data.cancel_at_period_end) {
          // User requested cancellation but still has access until period end
          await updateSubscriberStatus(context.env, email, {
            canceled_at: new Date().toISOString(),
            current_period_end: event.data.current_period_end || null,
          })
        } else {
          // Subscription renewed or updated
          await updateSubscriberStatus(context.env, email, {
            status: 'active',
            canceled_at: null,
            current_period_end: event.data.current_period_end || null,
          })
        }
        break
      }

      case 'subscription.canceled':
      case 'subscription.revoked': {
        await updateSubscriberStatus(context.env, email, {
          status: 'canceled',
          canceled_at: event.data.ended_at || new Date().toISOString(),
        })
        break
      }

      case 'order.created': {
        // One-time purchase (hair/full) — just log
        console.log(`[polar-webhook] Order created for ${email}: ${event.data.product?.name}`)
        break
      }

      default:
        console.log(`[polar-webhook] Unhandled event: ${event.type}`)
    }

    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('[polar-webhook] Error:', error)
    return new Response('Internal error', { status: 500 })
  }
}

async function updateSubscriberStatus(
  env: Env,
  email: string,
  data: Record<string, unknown>
): Promise<void> {
  const updateData = {
    ...data,
    updated_at: new Date().toISOString(),
  }

  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(email)}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(updateData),
    }
  )

  if (!res.ok) {
    console.error(`[polar-webhook] Supabase update failed for ${email}:`, res.status)
  } else {
    console.log(`[polar-webhook] Updated ${email}:`, JSON.stringify(data))
  }
}
