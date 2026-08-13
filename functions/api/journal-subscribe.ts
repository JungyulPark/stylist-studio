import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { errors } from '../lib/errors'
import { verifyUnsubscribeToken, createUnsubscribeToken } from '../lib/unsubscribe-token'

/**
 * The Journal 뉴스레터 — 무료 사용자의 재방문 훅.
 *
 * POST { email, lang?, source?, season_label? }  → 구독 등록
 * GET  ?token=<signed>                          → 원클릭 해지 (이메일 링크)
 *
 * 결제도 로그인도 요구하지 않는다. 분석을 마친 사람이 이메일 하나만 남기면
 * 매주 저널이 가고, 그 메일이 사이트로 돌아오는 통로가 된다.
 */

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  CRON_SECRET: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function supabaseHeaders(serviceKey: string) {
  return {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    if (!context.env.SUPABASE_URL || !context.env.SUPABASE_SERVICE_KEY) {
      return errors.configError(corsHeaders)
    }

    let body: { email?: string; lang?: string; source?: string; season_label?: string }
    try {
      body = await context.request.json()
    } catch {
      return errors.invalidJson(corsHeaders)
    }

    const email = (body.email || '').trim().toLowerCase()
    if (!EMAIL_RE.test(email) || email.length > 200) {
      return errors.validation('A valid email is required', corsHeaders)
    }

    const res = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/journal_subscribers?on_conflict=email`,
      {
        method: 'POST',
        headers: {
          ...supabaseHeaders(context.env.SUPABASE_SERVICE_KEY),
          'Prefer': 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({
          email,
          lang: body.lang === 'ko' ? 'ko' : 'en',
          source: (body.source || 'unknown').slice(0, 40),
          season_label: (body.season_label || '').slice(0, 60) || null,
          status: 'active',
          unsubscribed_at: null,
        }),
      }
    )

    if (!res.ok) {
      console.error('[journal-subscribe] Supabase error:', res.status, await res.text())
      return errors.externalApi('Supabase', corsHeaders)
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (e) {
    console.error('[journal-subscribe] Error:', e)
    return errors.internal(corsHeaders)
  }
}

/** 뉴스레터 원클릭 해지 — 수신거부 토큰 형식을 재사용 (id 자리에 'journal') */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)
  const token = url.searchParams.get('token') || ''
  const payload = await verifyUnsubscribeToken(token, context.env.CRON_SECRET)

  const page = (ok: boolean) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${ok ? 'Unsubscribed' : 'Link expired'} — ATELIER HUE</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#101018;color:#F5F2E9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.card{max-width:400px;padding:40px 24px;text-align:center}.mark{font-size:12px;letter-spacing:.3em;color:#c9a962;font-weight:700}
h1{font-size:21px;margin:16px 0 10px}p{color:rgba(245,242,233,.7);line-height:1.65;margin:0 0 26px}
a{display:inline-block;background:linear-gradient(160deg,#e6cb84,#c9a962);color:#14120c;text-decoration:none;font-weight:600;padding:12px 28px;border-radius:999px}</style>
</head><body><div class="card"><div class="mark">ATELIER HUE</div>
<h1>${ok ? 'Unsubscribed from The Journal' : 'This link has expired'}</h1>
<p>${ok ? 'You will no longer receive the weekly journal.' : 'Open the newest email and try again.'}</p>
<a href="https://kstylist.cc">Back to Atelier Hue</a></div></body></html>`

  if (!payload) {
    return new Response(page(false), { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  await fetch(
    `${context.env.SUPABASE_URL}/rest/v1/journal_subscribers?email=eq.${encodeURIComponent(payload.email)}`,
    {
      method: 'PATCH',
      headers: { ...supabaseHeaders(context.env.SUPABASE_SERVICE_KEY), 'Prefer': 'return=minimal' },
      body: JSON.stringify({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() }),
    }
  )

  return new Response(page(true), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

/** 이메일 본문에 넣을 해지 링크 (발송기에서 사용) */
export async function journalUnsubscribeUrl(email: string, secret: string | undefined): Promise<string> {
  const token = await createUnsubscribeToken('journal', email, secret)
  return `https://kstylist.cc/api/journal-subscribe?token=${encodeURIComponent(token)}`
}

export const onRequestOptions: PagesFunction = async (context) => {
  return createCorsPreflightResponse(context.request)
}
