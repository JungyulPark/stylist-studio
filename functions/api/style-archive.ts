import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { verifySupabaseUser } from '../lib/auth'
import { errors } from '../lib/errors'
import { buildArchive, type ArchiveRow, type FeedbackRow } from '../lib/style-archive'

/**
 * GET /api/style-archive — 로그인한 구독자의 지난 룩 (최근 약 6개월, 월별).
 */

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}

const ROW_LIMIT = 200

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)
  try {
    const verified = await verifySupabaseUser(context.request, context.env)
    if (!verified) return errors.unauthorized(corsHeaders)

    const headers = {
      'apikey': context.env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
    }
    const email = encodeURIComponent(verified.email)

    const subRes = await fetch(`${context.env.SUPABASE_URL}/rest/v1/subscribers?email=eq.${email}&select=id`, { headers })
    if (!subRes.ok) return errors.externalApi('Supabase', corsHeaders)
    const subs = await subRes.json() as Array<{ id: string }>
    if (subs.length === 0) {
      return new Response(JSON.stringify({ months: [] }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    const ids = subs.map(s => s.id).join(',')
    const [recRes, fbRes] = await Promise.all([
      fetch(
        `${context.env.SUPABASE_URL}/rest/v1/daily_recommendations?subscriber_id=in.(${ids})&select=sent_date,created_at,outfit_images&order=sent_date.desc&limit=${ROW_LIMIT}`,
        { headers }
      ),
      fetch(
        `${context.env.SUPABASE_URL}/rest/v1/outfit_feedback?email=eq.${email}&select=sent_date,scenario_id,verdict&order=sent_date.desc&limit=${ROW_LIMIT * 2}`,
        { headers }
      ),
    ])
    if (!recRes.ok) return errors.externalApi('Supabase', corsHeaders)
    const rows = await recRes.json() as ArchiveRow[]
    const feedback = fbRes.ok ? await fbRes.json() as FeedbackRow[] : []

    return new Response(JSON.stringify({ months: buildArchive(rows, feedback) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=300', ...corsHeaders },
    })
  } catch (e) {
    console.error('[style-archive] Error:', e)
    return errors.internal(corsHeaders)
  }
}

export const onRequestOptions: PagesFunction = async (context) => {
  return createCorsPreflightResponse(context.request)
}
