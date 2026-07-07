import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { verifySupabaseUser } from '../lib/auth'
import { errors } from '../lib/errors'

/**
 * 내 옷장 — 구독자가 실제 보유한 옷을 등록하면 데일리 추천이 그 옷들
 * 위주로 조합된다. 업로드 시 gpt-4o-mini 비전으로 아이템을 한 줄
 * 텍스트로 증류해 저장하고, 크론은 그 텍스트만 프롬프트에 주입한다
 * (매일 이미지를 다시 보는 비용 없음).
 */

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  OPENAI_API_KEY: string
  DAILY_IMAGES_BUCKET: R2Bucket
}

const R2_PUBLIC_BASE = 'https://pub-80118c62e29d4373b70d5e0fe9503ff0.r2.dev'
const MAX_ITEMS = 12
const MAX_PHOTO_BYTES = 8 * 1024 * 1024

function supabaseHeaders(serviceKey: string) {
  return {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  }
}

// GET /api/wardrobe → 내 아이템 목록
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)
  try {
    const verified = await verifySupabaseUser(context.request, context.env)
    if (!verified) return errors.unauthorized(corsHeaders)

    const res = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/wardrobe_items?email=eq.${encodeURIComponent(verified.email)}&select=id,r2_key,description,category,created_at&order=created_at.desc`,
      { headers: supabaseHeaders(context.env.SUPABASE_SERVICE_KEY) }
    )
    if (!res.ok) return errors.externalApi('Supabase', corsHeaders)

    const rows = await res.json() as Array<{ id: string; r2_key: string; description: string; category: string | null; created_at: string }>
    const items = rows.map(r => ({
      id: r.id,
      description: r.description,
      category: r.category,
      image_url: `${R2_PUBLIC_BASE}/${r.r2_key}`,
    }))

    return new Response(JSON.stringify({ items, max: MAX_ITEMS }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (e) {
    console.error('[wardrobe] GET error:', e)
    return errors.internal(corsHeaders)
  }
}

// POST /api/wardrobe { photo: dataURI } → 비전 설명 생성 + 저장
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)
  try {
    const verified = await verifySupabaseUser(context.request, context.env)
    if (!verified) return errors.unauthorized(corsHeaders)

    if (!context.env.OPENAI_API_KEY || !context.env.DAILY_IMAGES_BUCKET) {
      return errors.configError(corsHeaders)
    }

    let body: { photo?: string }
    try {
      body = await context.request.json()
    } catch {
      return errors.invalidJson(corsHeaders)
    }

    const match = body.photo?.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!match) {
      return errors.validation('photo must be a base64 image data URI', corsHeaders)
    }
    if (body.photo!.length > MAX_PHOTO_BYTES * 1.4) {
      return errors.validation('photo too large (max 8MB)', corsHeaders)
    }

    // 아이템 수 제한 — "옷장 전체 등록"의 피로를 원천 차단하는 설계
    const countRes = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/wardrobe_items?email=eq.${encodeURIComponent(verified.email)}&select=id`,
      { headers: { ...supabaseHeaders(context.env.SUPABASE_SERVICE_KEY), 'Prefer': 'count=exact' } }
    )
    const count = parseInt(countRes.headers.get('content-range')?.split('/')[1] || '0', 10)
    if (count >= MAX_ITEMS) {
      return errors.validation(`Wardrobe is full (max ${MAX_ITEMS} items)`, corsHeaders)
    }

    // gpt-4o-mini 비전으로 아이템 한 줄 증류
    const visionRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${context.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this single garment for a stylist in ONE line: color, material (if visible), garment type, notable cut/details. Also classify it. Return JSON only: {"description":"...","category":"top|bottom|outer|dress|shoes|accessory"}' },
            { type: 'image_url', image_url: { url: body.photo, detail: 'low' } },
          ],
        }],
        max_completion_tokens: 150,
        response_format: { type: 'json_object' },
      }),
    })
    if (!visionRes.ok) {
      console.error('[wardrobe] Vision error:', await visionRes.text())
      return errors.externalApi('OpenAI', corsHeaders)
    }
    const visionData = await visionRes.json() as { choices: Array<{ message: { content: string } }> }
    let description = ''
    let category: string | null = null
    try {
      const parsed = JSON.parse(visionData.choices[0]?.message?.content || '{}') as { description?: string; category?: string }
      description = (parsed.description || '').slice(0, 200)
      category = parsed.category || null
    } catch { /* fall through */ }
    if (!description) {
      return errors.externalApi('OpenAI', corsHeaders)
    }

    // R2 업로드
    const ext = match[1] === 'png' ? 'png' : 'jpg'
    const r2Key = `wardrobe/${crypto.randomUUID()}.${ext}`
    const bin = atob(match[2])
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    await context.env.DAILY_IMAGES_BUCKET.put(r2Key, bytes, {
      httpMetadata: { contentType: `image/${match[1]}` },
    })

    // DB 저장
    const insertRes = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/wardrobe_items`,
      {
        method: 'POST',
        headers: { ...supabaseHeaders(context.env.SUPABASE_SERVICE_KEY), 'Prefer': 'return=representation' },
        body: JSON.stringify({
          email: verified.email,
          user_id: verified.id,
          r2_key: r2Key,
          description,
          category,
        }),
      }
    )
    if (!insertRes.ok) {
      console.error('[wardrobe] Insert error:', await insertRes.text())
      return errors.externalApi('Supabase', corsHeaders)
    }
    const inserted = await insertRes.json() as Array<{ id: string }>

    return new Response(
      JSON.stringify({
        item: {
          id: inserted[0]?.id,
          description,
          category,
          image_url: `${R2_PUBLIC_BASE}/${r2Key}`,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (e) {
    console.error('[wardrobe] POST error:', e)
    return errors.internal(corsHeaders)
  }
}

// DELETE /api/wardrobe { id }
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)
  try {
    const verified = await verifySupabaseUser(context.request, context.env)
    if (!verified) return errors.unauthorized(corsHeaders)

    let body: { id?: string }
    try {
      body = await context.request.json()
    } catch {
      return errors.invalidJson(corsHeaders)
    }
    if (!body.id) return errors.validation('id is required', corsHeaders)

    // 소유 확인 후 R2 정리 + 행 삭제
    const rowRes = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/wardrobe_items?id=eq.${encodeURIComponent(body.id)}&email=eq.${encodeURIComponent(verified.email)}&select=r2_key`,
      { headers: supabaseHeaders(context.env.SUPABASE_SERVICE_KEY) }
    )
    const rows = rowRes.ok ? await rowRes.json() as Array<{ r2_key: string }> : []
    if (rows.length === 0) return errors.notFound('Wardrobe item', corsHeaders)

    try {
      await context.env.DAILY_IMAGES_BUCKET.delete(rows[0].r2_key)
    } catch { /* R2 정리는 실패해도 무방 */ }

    await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/wardrobe_items?id=eq.${encodeURIComponent(body.id)}&email=eq.${encodeURIComponent(verified.email)}`,
      { method: 'DELETE', headers: supabaseHeaders(context.env.SUPABASE_SERVICE_KEY) }
    )

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (e) {
    console.error('[wardrobe] DELETE error:', e)
    return errors.internal(corsHeaders)
  }
}

export const onRequestOptions: PagesFunction = async (context) => {
  return createCorsPreflightResponse(context.request)
}
