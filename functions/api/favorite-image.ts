import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { errors } from '../lib/errors'

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  DAILY_IMAGES_BUCKET: R2Bucket
}

interface FavoriteRequest {
  user_id: string
  image_url: string
  image_type: 'style' | 'hair' | 'daily'
  label?: string
}

// Generate a short hash from a string (for data URI comparison)
async function shortHash(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Upload data URI to R2 and return public URL
async function uploadDataUriToR2(
  dataUri: string,
  bucket: R2Bucket,
  userId: string,
  imageType: string
): Promise<string> {
  const match = dataUri.match(/^data:image\/(\w+);base64,(.+)/)
  if (!match) throw new Error('Invalid data URI')

  const ext = match[1] === 'jpeg' ? 'jpg' : match[1]
  const base64 = match[2]
  const binaryData = Uint8Array.from(atob(base64), c => c.charCodeAt(0))

  const timestamp = Date.now()
  const hash = await shortHash(dataUri)
  const r2Key = `favorites/${userId}/${imageType}-${timestamp}-${hash.slice(0, 8)}.${ext}`

  await bucket.put(r2Key, binaryData, {
    httpMetadata: { contentType: `image/${match[1]}` },
  })

  return `https://pub-80118c62e29d4373b70d5e0fe9503ff0.r2.dev/${r2Key}`
}

// POST: Add favorite
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    if (!context.env.SUPABASE_URL || !context.env.SUPABASE_SERVICE_KEY) {
      return errors.configError(corsHeaders)
    }

    let body: FavoriteRequest
    try {
      body = await context.request.json() as FavoriteRequest
    } catch {
      return errors.invalidRequest('Invalid JSON body', corsHeaders)
    }

    if (!body.user_id || !body.image_url || !body.image_type) {
      return errors.validation('user_id, image_url, and image_type are required', corsHeaders)
    }

    if (!['style', 'hair', 'daily'].includes(body.image_type)) {
      return errors.validation('image_type must be style, hair, or daily', corsHeaders)
    }

    // If image_url is a data URI, upload to R2 first
    let permanentUrl = body.image_url
    if (body.image_url.startsWith('data:') && context.env.DAILY_IMAGES_BUCKET) {
      try {
        permanentUrl = await uploadDataUriToR2(
          body.image_url,
          context.env.DAILY_IMAGES_BUCKET,
          body.user_id,
          body.image_type
        )
      } catch (e) {
        console.error('[favorite] R2 upload error:', e)
        return errors.internal(corsHeaders)
      }
    }

    // Generate hash for duplicate check (works for both short URLs and data URIs)
    const urlHash = await shortHash(body.image_url)

    // Check if already favorited using url_hash
    const checkRes = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/favorite_images?user_id=eq.${body.user_id}&url_hash=eq.${urlHash}&select=id&limit=1`,
      {
        headers: {
          'apikey': context.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
        },
      }
    )

    if (checkRes.ok) {
      const existing = await checkRes.json() as Array<{ id: string }>
      if (existing && existing.length > 0) {
        // Already favorited - remove it (toggle)
        await fetch(
          `${context.env.SUPABASE_URL}/rest/v1/favorite_images?id=eq.${existing[0].id}`,
          {
            method: 'DELETE',
            headers: {
              'apikey': context.env.SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
            },
          }
        )
        return new Response(
          JSON.stringify({ success: true, action: 'removed' }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        )
      }
    }

    // Add favorite with permanent URL
    const insertRes = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/favorite_images`,
      {
        method: 'POST',
        headers: {
          'apikey': context.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          user_id: body.user_id,
          image_url: permanentUrl,
          image_type: body.image_type,
          label: body.label || null,
          url_hash: urlHash,
        }),
      }
    )

    if (!insertRes.ok) {
      console.error('[favorite] Insert error:', await insertRes.text())
      return errors.externalApi('Supabase', corsHeaders)
    }

    const result = await insertRes.json()

    return new Response(
      JSON.stringify({ success: true, action: 'added', favorite: Array.isArray(result) ? result[0] : result }),
      { status: 201, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (error) {
    console.error('[favorite] Error:', error)
    return errors.internal(corsHeaders)
  }
}

// GET: List favorites for a user
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    if (!context.env.SUPABASE_URL || !context.env.SUPABASE_SERVICE_KEY) {
      return errors.configError(corsHeaders)
    }

    const url = new URL(context.request.url)
    const userId = url.searchParams.get('user_id')

    if (!userId) {
      return errors.validation('user_id parameter is required', corsHeaders)
    }

    const res = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/favorite_images?user_id=eq.${userId}&select=*&order=created_at.desc`,
      {
        headers: {
          'apikey': context.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
        },
      }
    )

    if (!res.ok) return errors.externalApi('Supabase', corsHeaders)

    const favorites = await res.json()

    return new Response(
      JSON.stringify({ favorites }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (error) {
    console.error('[favorite] GET Error:', error)
    return errors.internal(corsHeaders)
  }
}

export const onRequestOptions: PagesFunction = async (context) => {
  return createCorsPreflightResponse(context.request)
}
