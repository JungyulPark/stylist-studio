import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { verifySupabaseUser } from '../lib/auth'
import { errors } from '../lib/errors'
import { verifyFeedbackToken } from '../lib/feedback-token'

/**
 * 아웃핏 피드백 — 구독자가 오늘의 룩에 좋아요/별로예요를 남기면
 * 다음 데일리 추천이 이 기록을 학습한다 (크론이 최근 피드백을
 * 프롬프트에 주입). 벤치마크: Alta의 wear-tracking 루프.
 */

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  CRON_SECRET: string
}

function supabaseHeaders(serviceKey: string) {
  return {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  }
}

async function saveFeedback(
  env: Env,
  email: string,
  sentDate: string,
  scenarioId: string,
  verdict: 'like' | 'dislike',
  label?: string
): Promise<boolean> {
  // 그날의 추천 설명을 스냅샷으로 저장 — 학습 품질을 위해
  let outfitDesc = (label || '').slice(0, 120)
  try {
    const subRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(email)}&select=id&limit=1`,
      { headers: supabaseHeaders(env.SUPABASE_SERVICE_KEY) }
    )
    const subs = subRes.ok ? await subRes.json() as Array<{ id: string }> : []
    if (subs[0]) {
      const recRes = await fetch(
        `${env.SUPABASE_URL}/rest/v1/daily_recommendations?subscriber_id=eq.${subs[0].id}&sent_date=eq.${sentDate}&select=outfit_description,weather_condition,temperature_c&limit=1`,
        { headers: supabaseHeaders(env.SUPABASE_SERVICE_KEY) }
      )
      const recs = recRes.ok ? await recRes.json() as Array<{ outfit_description: string | null; weather_condition: string | null; temperature_c: number | null }> : []
      if (recs[0]?.outfit_description) {
        outfitDesc = `[${scenarioId}${recs[0].weather_condition ? `, ${recs[0].weather_condition} ${recs[0].temperature_c}°C` : ''}] ${recs[0].outfit_description}`.slice(0, 400)
      }
    }
  } catch { /* 스냅샷 없이도 verdict는 저장 */ }

  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/outfit_feedback?on_conflict=email,sent_date,scenario_id`,
    {
      method: 'POST',
      headers: { ...supabaseHeaders(env.SUPABASE_SERVICE_KEY), 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ email, sent_date: sentDate, scenario_id: scenarioId, verdict, outfit_desc: outfitDesc || null }),
    }
  )
  if (!res.ok) console.error('[outfit-feedback] Supabase error:', res.status, await res.text())
  return res.ok
}

/**
 * GET /api/outfit-feedback?t=<signed token>
 * 이메일의 원클릭 피드백. 토큰이 곧 인증이며, 저장 후 재방문을 유도하는
 * 확인 페이지를 보여준다 — 데일리 메일에서 웹으로 들어오는 유일한 경로.
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)
  const token = url.searchParams.get('t') || ''
  const payload = await verifyFeedbackToken(token, context.env.CRON_SECRET)

  if (!payload) {
    return new Response(feedbackPage('invalid', 'like'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const ok = await saveFeedback(context.env, payload.email, payload.sentDate, payload.scenarioId, payload.verdict)
  return new Response(feedbackPage(ok ? 'ok' : 'error', payload.verdict), {
    status: ok ? 200 : 500,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function feedbackPage(status: 'ok' | 'error' | 'invalid', verdict: 'like' | 'dislike'): string {
  const headline = status === 'ok'
    ? (verdict === 'like' ? 'Noted — more looks like this' : 'Noted — we will avoid this direction')
    : status === 'invalid' ? 'This link has expired' : 'Something went wrong'
  const body = status === 'ok'
    ? "Tomorrow's 7am look will take this into account."
    : status === 'invalid' ? 'Open the newest email and try again.' : 'Please try again from your dashboard.'
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline} — ATELIER HUE</title>
  <style>
    body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
           background:#101018; color:#F5F2E9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
    .card { max-width:420px; padding:40px 24px; text-align:center; }
    .mark { font-size:12px; letter-spacing:.3em; color:#c9a962; font-weight:700; }
    h1 { font-size:22px; margin:18px 0 10px; line-height:1.35; }
    p { color:rgba(245,242,233,.7); line-height:1.65; margin:0 0 28px; }
    a { display:inline-block; background:linear-gradient(160deg,#e6cb84,#c9a962); color:#14120c;
        text-decoration:none; font-weight:600; padding:13px 30px; border-radius:999px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="mark">ATELIER HUE</div>
    <h1>${headline}</h1>
    <p>${body}</p>
    <a href="https://kstylist.cc/#subscription-dashboard">See today's look</a>
  </div>
</body>
</html>`
}

// POST { sent_date, scenario_id, verdict: 'like'|'dislike', outfit_label? }
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    const verified = await verifySupabaseUser(context.request, context.env)
    if (!verified) return errors.unauthorized(corsHeaders)

    let body: { sent_date?: string; scenario_id?: string; verdict?: string; outfit_label?: string }
    try {
      body = await context.request.json()
    } catch {
      return errors.invalidJson(corsHeaders)
    }

    const { sent_date, scenario_id, verdict } = body
    if (!sent_date || !/^\d{4}-\d{2}-\d{2}$/.test(sent_date)) {
      return errors.validation('sent_date (YYYY-MM-DD) is required', corsHeaders)
    }
    if (!scenario_id || scenario_id.length > 40) {
      return errors.validation('scenario_id is required', corsHeaders)
    }
    if (verdict !== 'like' && verdict !== 'dislike') {
      return errors.validation("verdict must be 'like' or 'dislike'", corsHeaders)
    }

    const ok = await saveFeedback(context.env, verified.email, sent_date, scenario_id, verdict, body.outfit_label)
    if (!ok) return errors.externalApi('Supabase', corsHeaders)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (e) {
    console.error('[outfit-feedback] Error:', e)
    return errors.internal(corsHeaders)
  }
}

export const onRequestOptions: PagesFunction = async (context) => {
  return createCorsPreflightResponse(context.request)
}
