/**
 * Money-path handler tests — 결제·환불·웹훅·인증 게이트를 핸들러 직접
 * 호출 + fetch 목으로 검증한다. 이 경로들이 곧 매출이다.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { onRequestPost as refundPost } from './refund'
import { onRequestPost as checkoutPost } from './create-checkout'
import { onRequestPost as webhookPost } from './polar-webhook'
import { onRequestPost as feedbackPost } from './outfit-feedback'
import { onRequestPost as portalPost } from './customer-portal'

type FetchCall = { url: string; init?: RequestInit }

let fetchCalls: FetchCall[] = []
let fetchRoutes: Array<{ match: (url: string) => boolean; respond: (url: string, init?: RequestInit) => Response | Promise<Response> }> = []

function route(match: (url: string) => boolean, respond: (url: string, init?: RequestInit) => Response) {
  fetchRoutes.push({ match, respond })
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

beforeEach(() => {
  fetchCalls = []
  fetchRoutes = []
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    fetchCalls.push({ url, init })
    for (const r of fetchRoutes) {
      if (r.match(url)) return r.respond(url, init)
    }
    return json({}, 200)
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const BASE_ENV = {
  POLAR_API_KEY: 'test-polar-key',
  RESEND_API_KEY: '',
  SUPABASE_URL: 'https://supabase.test',
  SUPABASE_SERVICE_KEY: 'test-service-key',
}

function makeContext(env: Record<string, unknown>, body: unknown, headers: Record<string, string> = {}) {
  const request = new Request('https://kstylist.cc/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'https://kstylist.cc', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { request, env } as any
}

describe('refund guards (money leak protection)', () => {
  const OLD_DATE = new Date(Date.now() - 48 * 3600_000).toISOString()
  const FRESH_DATE = new Date(Date.now() - 10 * 60_000).toISOString()

  it('rejects orders older than the 24h auto-refund window', async () => {
    route(u => u.includes('/v1/checkouts/'), () => json({ id: 'chk1', status: 'succeeded', customer_email: 'a@b.c' }))
    route(u => u.includes('/v1/orders?'), () => json({ items: [{ id: 'ord1', amount: 499, currency: 'usd', created_at: OLD_DATE }] }))

    const res = await refundPost(makeContext(BASE_ENV, { checkoutId: 'chk1' }))
    expect(res.status).toBe(403)
    // 환불 API가 절대 호출되지 않아야 한다
    expect(fetchCalls.some(c => c.url.includes('/refund'))).toBe(false)
    // 거부는 감사 기록에 남는다
    expect(fetchCalls.some(c => c.url.includes('ops_events'))).toBe(true)
  })

  it('rejects checkouts that never completed', async () => {
    route(u => u.includes('/v1/checkouts/'), () => json({ id: 'chk2', status: 'open' }))
    const res = await refundPost(makeContext(BASE_ENV, { checkoutId: 'chk2' }))
    expect(res.status).toBe(400)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('CHECKOUT_NOT_COMPLETED')
  })

  it('issues refund for a fresh failed order and records it', async () => {
    route(u => u.includes('/v1/checkouts/'), () => json({ id: 'chk3', status: 'succeeded', customer_email: 'a@b.c' }))
    route(u => u.includes('/v1/orders?'), () => json({ items: [{ id: 'ord3', amount: 499, currency: 'usd', created_at: FRESH_DATE }] }))
    route(u => u.includes('/refund'), () => json({ id: 'ref3' }))

    const res = await refundPost(makeContext(BASE_ENV, { checkoutId: 'chk3', reason: 'generation failed' }))
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean }
    expect(body.success).toBe(true)
    expect(fetchCalls.some(c => c.url.includes('/v1/orders/ord3/refund'))).toBe(true)
    expect(fetchCalls.some(c => c.url.includes('ops_events'))).toBe(true)
  })
})

describe('create-checkout pricing rules', () => {
  const env = { ...BASE_ENV }

  function captureCheckoutBody(): { body?: Record<string, unknown> } {
    const captured: { body?: Record<string, unknown> } = {}
    route(u => u.includes('/v1/checkouts/'), (_u, init) => {
      captured.body = JSON.parse(String(init?.body)) as Record<string, unknown>
      return json({ id: 'chk', url: 'https://polar.sh/checkout/x' })
    })
    return captured
  }

  it('never applies COMEBACK50 to the subscription product', async () => {
    const captured = captureCheckoutBody()
    const res = await checkoutPost(makeContext(env, { productType: 'daily_style', isRepeatCustomer: true }))
    expect(res.status).toBe(200)
    expect(captured.body?.discount_code).toBeUndefined()
  })

  it('applies COMEBACK50 for repeat one-time customers', async () => {
    const captured = captureCheckoutBody()
    const res = await checkoutPost(makeContext(env, { productType: 'full', isRepeatCustomer: true }))
    expect(res.status).toBe(200)
    expect(captured.body?.discount_code).toBe('COMEBACK50')
  })

  it('accepts chat_tokens and rejects unknown products', async () => {
    const captured = captureCheckoutBody()
    const ok = await checkoutPost(makeContext(env, { productType: 'chat_tokens' }))
    expect(ok.status).toBe(200)
    expect((captured.body?.products as string[])[0]).toBe('32416265-c924-4176-be02-cbe49bf1294c')

    const bad = await checkoutPost(makeContext(env, { productType: 'hair' }))
    expect(bad.status).toBe(400)
  })
})

describe('polar-webhook', () => {
  const SECRET = 'whsec-test'
  const env = { ...BASE_ENV, POLAR_WEBHOOK_SECRET: SECRET }

  async function sign(payload: string): Promise<string> {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey('raw', encoder.encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
    return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  it('rejects invalid signatures', async () => {
    const payload = JSON.stringify({ type: 'subscription.active', data: { id: 's1', customer_email: 'a@b.c' } })
    const res = await webhookPost(makeContext(env, payload, { 'webhook-signature': 'v1,deadbeef' }))
    expect(res.status).toBe(401)
    expect(fetchCalls.some(c => c.url.includes('subscribers'))).toBe(false)
  })

  it('activates the subscriber on a signed subscription.active event', async () => {
    const payload = JSON.stringify({
      type: 'subscription.active',
      data: { id: 's2', customer_email: 'sub@kstylist.cc', current_period_end: '2027-01-01T00:00:00Z' },
    })
    const res = await webhookPost(makeContext(env, payload, { 'webhook-signature': `v1,${await sign(payload)}` }))
    expect(res.status).toBe(200)

    const patch = fetchCalls.find(c => c.url.includes('subscribers?email=eq.sub%40kstylist.cc'))
    expect(patch).toBeDefined()
    const patchBody = JSON.parse(String(patch!.init?.body)) as { status: string }
    expect(patchBody.status).toBe('active')
    expect(fetchCalls.some(c => c.url.includes('ops_events'))).toBe(true)
  })
})

describe('auth gates on account-scoped endpoints', () => {
  it('outfit-feedback requires a session token', async () => {
    const res = await feedbackPost(makeContext(BASE_ENV, { sent_date: '2026-07-13', scenario_id: 'dressy', verdict: 'like' }))
    expect(res.status).toBe(401)
  })

  it('customer-portal requires a session token', async () => {
    const res = await portalPost(makeContext(BASE_ENV, {}))
    expect(res.status).toBe(401)
  })
})
