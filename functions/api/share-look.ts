import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { verifySupabaseUser } from '../lib/auth'
import { errors } from '../lib/errors'
import {
  createOwnerSignature,
  verifyOwnerSignature,
  verifyShareToken,
} from '../lib/feedback-token'
import {
  ensureLookShare,
  getLookShare,
  isShareId,
  renderLookGonePage,
  revokeLookShare,
} from '../lib/look-share'

/**
 * 오늘의 룩 공유 API.
 *
 * GET  ?t=<signed>        이메일의 "이 룩 공유하기" → 공유 생성 후 소유자 페이지로 302
 * GET  ?img=<share id>    공유 이미지 (같은 출처 — 카드 캔버스·OG 이미지용)
 * POST {sent_date, scenario_id}  대시보드(세션 인증) → { url, owner_url }
 * DELETE ?id=&o=          소유자 공유 중지
 */

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  CRON_SECRET: string
  DAILY_IMAGES_BUCKET: R2Bucket
}

const SITE = 'https://kstylist.cc'

async function ownerUrl(id: string, secret: string | undefined): Promise<string> {
  return `${SITE}/look/${id}?o=${await createOwnerSignature(id, secret)}`
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)
  const url = new URL(context.request.url)

  const imgId = url.searchParams.get('img')
  if (imgId !== null) {
    if (!isShareId(imgId)) return errors.notFound('Image', corsHeaders)
    const share = await getLookShare(context.env, imgId)
    if (!share || share.revoked_at || !context.env.DAILY_IMAGES_BUCKET) {
      return errors.notFound('Image', corsHeaders)
    }
    const obj = await context.env.DAILY_IMAGES_BUCKET.get(share.image_key)
    if (!obj) return errors.notFound('Image', corsHeaders)
    return new Response(obj.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg',
        // 공유 중지가 빨리 반영되도록 짧게
        'Cache-Control': 'public, max-age=600',
      },
    })
  }

  const html = (body: string, status: number) =>
    new Response(body, { status, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } })

  const payload = await verifyShareToken(url.searchParams.get('t') || '', context.env.CRON_SECRET)
  if (!payload) return html(renderLookGonePage(null), 400)

  try {
    const id = await ensureLookShare(context.env, payload.email, payload.sentDate, payload.scenarioId)
    if (!id) return html(renderLookGonePage(null), 404)
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, 'Location': await ownerUrl(id, context.env.CRON_SECRET), 'Cache-Control': 'no-store' },
    })
  } catch (e) {
    console.error('[share-look] GET error:', e)
    return html(renderLookGonePage(null), 500)
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)
  try {
    const verified = await verifySupabaseUser(context.request, context.env)
    if (!verified) return errors.unauthorized(corsHeaders)

    let body: { sent_date?: string; scenario_id?: string }
    try {
      body = await context.request.json()
    } catch {
      return errors.invalidJson(corsHeaders)
    }
    if (!body.sent_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.sent_date)) {
      return errors.validation('sent_date (YYYY-MM-DD) is required', corsHeaders)
    }
    if (!body.scenario_id || body.scenario_id.length > 40) {
      return errors.validation('scenario_id is required', corsHeaders)
    }

    const id = await ensureLookShare(context.env, verified.email, body.sent_date, body.scenario_id)
    if (!id) return errors.notFound('Look', corsHeaders)

    return new Response(JSON.stringify({
      id,
      url: `${SITE}/look/${id}`,
      owner_url: await ownerUrl(id, context.env.CRON_SECRET),
    }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  } catch (e) {
    console.error('[share-look] POST error:', e)
    return errors.internal(corsHeaders)
  }
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)
  const url = new URL(context.request.url)
  const id = url.searchParams.get('id') || ''
  const sig = url.searchParams.get('o') || ''

  if (!isShareId(id)) return errors.validation('id is required', corsHeaders)
  if (!await verifyOwnerSignature(id, sig, context.env.CRON_SECRET)) return errors.forbidden(corsHeaders)

  const ok = await revokeLookShare(context.env, id)
  if (!ok) return errors.externalApi('Supabase', corsHeaders)
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

export const onRequestOptions: PagesFunction = async (context) => {
  return createCorsPreflightResponse(context.request)
}
