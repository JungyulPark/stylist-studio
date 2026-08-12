import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { errors } from '../lib/errors'
import { listStyleRefKeys, type StyleTier } from '../lib/style-refs'

/**
 * 시즌 컬렉션 관리 (오너 전용 — CRON_SECRET 필요).
 *
 * GET    /api/style-refs?secret=...                 → 티어별 레퍼런스 목록
 * POST   /api/style-refs?secret=...                 → { import_url, tier, name? }
 *          서버가 URL을 직접 fetch해 R2에 저장 (로컬 다운로드 불필요)
 * DELETE /api/style-refs?secret=...                 → { key }
 *
 * 시즌 교체: 새 룩들을 POST로 넣고 이전 시즌 key들을 DELETE — 코드 배포 없이
 * 서비스 전체의 스타일 방향이 바뀐다.
 */

interface Env {
  CRON_SECRET: string
  DAILY_IMAGES_BUCKET: R2Bucket
}

const MAX_IMPORT_BYTES = 8 * 1024 * 1024

function authorized(context: { request: Request; env: Env }): boolean {
  const url = new URL(context.request.url)
  const secret = url.searchParams.get('secret') || context.request.headers.get('x-cron-secret') || ''
  return Boolean(context.env.CRON_SECRET) && secret === context.env.CRON_SECRET
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)
  if (!authorized(context)) return errors.unauthorized(corsHeaders)

  const [premium, casual] = await Promise.all([
    listStyleRefKeys(context.env.DAILY_IMAGES_BUCKET, 'premium'),
    listStyleRefKeys(context.env.DAILY_IMAGES_BUCKET, 'casual'),
  ])
  return new Response(JSON.stringify({ premium, casual }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)
  if (!authorized(context)) return errors.unauthorized(corsHeaders)

  try {
    let body: { import_url?: string; tier?: string; name?: string }
    try {
      body = await context.request.json()
    } catch {
      return errors.invalidJson(corsHeaders)
    }

    const tier = body.tier as StyleTier
    if (tier !== 'premium' && tier !== 'casual') {
      return errors.validation("tier must be 'premium' or 'casual'", corsHeaders)
    }
    if (!body.import_url || !body.import_url.startsWith('https://')) {
      return errors.validation('import_url (https) is required', corsHeaders)
    }

    const res = await fetch(body.import_url)
    if (!res.ok) {
      return errors.validation(`import_url fetch failed: ${res.status}`, corsHeaders)
    }
    const buf = await res.arrayBuffer()
    if (buf.byteLength > MAX_IMPORT_BYTES) {
      return errors.validation('image too large (max 8MB)', corsHeaders)
    }
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
    const safeName = (body.name || crypto.randomUUID()).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || crypto.randomUUID()
    const key = `style-refs/${tier}/${safeName}.${ext}`

    await context.env.DAILY_IMAGES_BUCKET.put(key, buf, {
      httpMetadata: { contentType },
    })

    return new Response(JSON.stringify({ success: true, key }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (e) {
    console.error('[style-refs] POST error:', e)
    return errors.internal(corsHeaders)
  }
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)
  if (!authorized(context)) return errors.unauthorized(corsHeaders)

  try {
    let body: { key?: string }
    try {
      body = await context.request.json()
    } catch {
      return errors.invalidJson(corsHeaders)
    }
    if (!body.key || !body.key.startsWith('style-refs/')) {
      return errors.validation('key must start with style-refs/', corsHeaders)
    }
    await context.env.DAILY_IMAGES_BUCKET.delete(body.key)
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (e) {
    console.error('[style-refs] DELETE error:', e)
    return errors.internal(corsHeaders)
  }
}

export const onRequestOptions: PagesFunction = async (context) => {
  return createCorsPreflightResponse(context.request)
}
