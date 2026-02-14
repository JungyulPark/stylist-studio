import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { errors } from '../lib/errors'

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  PHOTOS_BUCKET: R2Bucket
}

// GET /api/profile-photo?email=xxx → serves the subscriber's profile photo from R2
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    if (!context.env.SUPABASE_URL || !context.env.SUPABASE_SERVICE_KEY) {
      return errors.configError(corsHeaders)
    }

    const url = new URL(context.request.url)
    const email = url.searchParams.get('email')
    if (!email) {
      return errors.validation('email parameter is required', corsHeaders)
    }

    // Look up subscriber's photo_r2_key
    const subRes = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(email)}&select=photo_r2_key&order=profile_complete.desc&limit=1`,
      {
        headers: {
          'apikey': context.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
        },
      }
    )

    if (!subRes.ok) return errors.externalApi('Supabase', corsHeaders)
    const rows = await subRes.json() as Array<{ photo_r2_key: string | null }>

    if (!rows.length || !rows[0].photo_r2_key) {
      return new Response(null, { status: 404, headers: corsHeaders })
    }

    // Fetch photo from R2
    const photoObj = await context.env.PHOTOS_BUCKET.get(rows[0].photo_r2_key)
    if (!photoObj) {
      return new Response(null, { status: 404, headers: corsHeaders })
    }

    return new Response(photoObj.body, {
      status: 200,
      headers: {
        'Content-Type': photoObj.httpMetadata?.contentType || 'image/jpeg',
        'Cache-Control': 'no-cache, must-revalidate',
        ...corsHeaders,
      },
    })
  } catch (error) {
    console.error('[profile-photo] Error:', error)
    return errors.internal(corsHeaders)
  }
}

export const onRequestOptions: PagesFunction = async (context) => {
  return createCorsPreflightResponse(context.request)
}
