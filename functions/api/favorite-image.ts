import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { errors } from '../lib/errors'

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}

interface FavoriteRequest {
  user_id: string
  image_url: string
  image_type: 'style' | 'hair' | 'daily'
  label?: string
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

    // Check if already favorited
    const checkRes = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/favorite_images?user_id=eq.${body.user_id}&image_url=eq.${encodeURIComponent(body.image_url)}&select=id&limit=1`,
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

    // Add favorite
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
          image_url: body.image_url,
          image_type: body.image_type,
          label: body.label || null,
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
