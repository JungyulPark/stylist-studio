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
        `${env.SUPABASE_URL}/rest/v1/daily_recommendations?subscriber_id=eq.${subs[0].id}&sent_date=eq.${sentDate}&select=outfit_description,outfit_images,weather_condition,temperature_c&limit=1`,
        { headers: supabaseHeaders(env.SUPABASE_SERVICE_KEY) }
      )
      const recs = recRes.ok ? await recRes.json() as Array<{
        outfit_description: string | null
        outfit_images: Array<{ id: string; name?: string; items?: string[] }> | null
        weather_condition: string | null
        temperature_c: number | null
      }> : []
      const rec = recs[0]
      // 평가한 바로 그 룩의 아이템을 기록해야 학습이 정확하다 (구버전 기록은 전체 설명으로)
      const look = rec?.outfit_images?.find(img => img.id === scenarioId)
      const desc = look?.items?.length
        ? `${look.name ? `${look.name}: ` : ''}${look.items.join(', ')}`
        : rec?.outfit_description
      if (desc) {
        outfitDesc = `[${scenarioId}${rec.weather_condition ? `, ${rec.weather_condition} ${rec.temperature_c}°C` : ''}] ${desc}`.slice(0, 400)
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
  const lang = url.searchParams.get('l') || 'en'
  const payload = await verifyFeedbackToken(token, context.env.CRON_SECRET)

  if (!payload) {
    return new Response(feedbackPage('invalid', 'like', lang), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const ok = await saveFeedback(context.env, payload.email, payload.sentDate, payload.scenarioId, payload.verdict)
  return new Response(feedbackPage(ok ? 'ok' : 'error', payload.verdict, lang), {
    status: ok ? 200 : 500,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

const FEEDBACK_COPY: Record<string, {
  like: string; dislike: string; okBody: string
  invalid: string; invalidBody: string; error: string; errorBody: string; cta: string
}> = {
  en: {
    like: 'Noted — more looks like this', dislike: 'Noted — we will steer away from this',
    okBody: "Tomorrow's 7am look will take this into account.",
    invalid: 'This link has expired', invalidBody: 'Open the newest email and try again.',
    error: 'Something went wrong', errorBody: 'Please try again from your dashboard.',
    cta: "See today's look",
  },
  ko: {
    like: '기억해둘게요 — 이런 룩을 더 보내드릴게요', dislike: '기억해둘게요 — 이런 방향은 피할게요',
    okBody: '내일 아침 7시 룩부터 반영됩니다.',
    invalid: '링크가 만료되었어요', invalidBody: '가장 최근 메일에서 다시 눌러주세요.',
    error: '잠시 문제가 생겼어요', errorBody: '대시보드에서 다시 시도해주세요.',
    cta: '오늘의 룩 보기',
  },
  ja: {
    like: '承知しました — こういうルックを増やします', dislike: '承知しました — この方向は避けます',
    okBody: '明日朝7時のルックから反映されます。',
    invalid: 'リンクの有効期限が切れています', invalidBody: '最新のメールからもう一度お試しください。',
    error: 'エラーが発生しました', errorBody: 'ダッシュボードからもう一度お試しください。',
    cta: '今日のルックを見る',
  },
  zh: {
    like: '已记下 — 会推荐更多这样的造型', dislike: '已记下 — 会避开这个方向',
    okBody: '明早7点的造型就会体现。',
    invalid: '链接已过期', invalidBody: '请从最新的邮件中重新打开。',
    error: '出了点问题', errorBody: '请在主页重试。',
    cta: '查看今日造型',
  },
  es: {
    like: 'Anotado — más looks como este', dislike: 'Anotado — evitaremos esta dirección',
    okBody: 'El look de mañana a las 7 lo tendrá en cuenta.',
    invalid: 'Este enlace ha caducado', invalidBody: 'Abre el correo más reciente e inténtalo de nuevo.',
    error: 'Algo salió mal', errorBody: 'Inténtalo de nuevo desde tu panel.',
    cta: 'Ver el look de hoy',
  },
}

function feedbackPage(status: 'ok' | 'error' | 'invalid', verdict: 'like' | 'dislike', lang = 'en'): string {
  const c = FEEDBACK_COPY[lang] || FEEDBACK_COPY.en
  const headline = status === 'ok' ? c[verdict] : status === 'invalid' ? c.invalid : c.error
  const body = status === 'ok' ? c.okBody : status === 'invalid' ? c.invalidBody : c.errorBody
  const htmlLang = FEEDBACK_COPY[lang] ? lang : 'en'
  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline} — ATELIER HUE</title>
  <style>
    body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
           background:#101018; color:#F5F2E9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
    .card { max-width:420px; padding:40px 24px; text-align:center; }
    .mark { font-size:12px; letter-spacing:.42em; color:#c9a962; font-family:Georgia,serif; }
    h1 { font-size:22px; font-weight:500; margin:20px 0 12px; line-height:1.4; font-family:Georgia,'Times New Roman',serif; word-break:keep-all; }
    p { color:#A9A497; line-height:1.65; margin:0 0 30px; word-break:keep-all; }
    a { display:inline-block; border:1px solid #c9a962; color:#c9a962; text-decoration:none;
        font-size:12px; letter-spacing:.2em; text-transform:uppercase; padding:14px 30px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="mark">ATELIER HUE</div>
    <h1>${headline}</h1>
    <p>${body}</p>
    <a href="https://kstylist.cc/#subscription-dashboard">${c.cta}</a>
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
