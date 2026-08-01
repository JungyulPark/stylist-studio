import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { verifySupabaseUser } from '../lib/auth'
import { errors } from '../lib/errors'

/**
 * 아웃핏 피드백 — 구독자가 오늘의 룩에 좋아요/별로예요를 남기면
 * 다음 데일리 추천이 이 기록을 학습한다 (크론이 최근 피드백을
 * 프롬프트에 주입). 벤치마크: Alta의 wear-tracking 루프.
 */

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}

function supabaseHeaders(serviceKey: string) {
  return {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  }
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

    // 서버에서 그날의 추천 설명을 찾아 스냅샷으로 저장 — 학습 품질을 위해
    let outfitDesc = (body.outfit_label || '').slice(0, 120)
    try {
      const subRes = await fetch(
        `${context.env.SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(verified.email)}&select=id&limit=1`,
        { headers: supabaseHeaders(context.env.SUPABASE_SERVICE_KEY) }
      )
      const subs = subRes.ok ? await subRes.json() as Array<{ id: string }> : []
      if (subs[0]) {
        const recRes = await fetch(
          `${context.env.SUPABASE_URL}/rest/v1/daily_recommendations?subscriber_id=eq.${subs[0].id}&sent_date=eq.${sent_date}&select=outfit_description,weather_condition,temperature_c&limit=1`,
          { headers: supabaseHeaders(context.env.SUPABASE_SERVICE_KEY) }
        )
        const recs = recRes.ok ? await recRes.json() as Array<{ outfit_description: string | null; weather_condition: string | null; temperature_c: number | null }> : []
        if (recs[0]?.outfit_description) {
          outfitDesc = `[${scenario_id}${recs[0].weather_condition ? `, ${recs[0].weather_condition} ${recs[0].temperature_c}°C` : ''}] ${recs[0].outfit_description}`.slice(0, 400)
        }
      }
    } catch { /* 스냅샷 없이도 verdict 자체는 저장 */ }

    const res = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/outfit_feedback?on_conflict=email,sent_date,scenario_id`,
      {
        method: 'POST',
        headers: {
          ...supabaseHeaders(context.env.SUPABASE_SERVICE_KEY),
          'Prefer': 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({
          email: verified.email,
          sent_date,
          scenario_id,
          verdict,
          outfit_desc: outfitDesc || null,
        }),
      }
    )

    if (!res.ok) {
      console.error('[outfit-feedback] Supabase error:', res.status, await res.text())
      return errors.externalApi('Supabase', corsHeaders)
    }

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
