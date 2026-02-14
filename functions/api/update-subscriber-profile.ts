import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { errors } from '../lib/errors'

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  PHOTOS_BUCKET: R2Bucket
}

interface ProfileUpdateRequest {
  email: string
  user_id?: string
  height_cm?: number
  weight_kg?: number
  gender?: string
  photo?: string // base64 data URI
  preferred_language?: string
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    if (!context.env.SUPABASE_URL || !context.env.SUPABASE_SERVICE_KEY) {
      return errors.configError(corsHeaders)
    }

    let body: ProfileUpdateRequest
    try {
      body = await context.request.json() as ProfileUpdateRequest
    } catch {
      return errors.invalidRequest('Invalid JSON body', corsHeaders)
    }

    if (!body.email) {
      return errors.validation('email is required', corsHeaders)
    }

    // Look up subscriber — prefer profile_complete record if duplicates exist
    const subRes = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(body.email)}&select=id,photo_r2_key,profile_complete&order=profile_complete.desc`,
      {
        headers: {
          'apikey': context.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
        },
      }
    )

    if (!subRes.ok) return errors.externalApi('Supabase', corsHeaders)
    const subscribers = await subRes.json() as Array<{ id: string; photo_r2_key: string | null; profile_complete: boolean }>

    if (!subscribers || subscribers.length === 0) {
      return errors.notFound('Subscriber', corsHeaders)
    }

    // Use profile_complete record first (sorted desc), fallback to first
    const subscriber = subscribers[0]

    // Upload photo to R2 if provided
    let photoR2Key = subscriber.photo_r2_key
    if (body.photo && context.env.PHOTOS_BUCKET) {
      try {
        const base64Match = body.photo.match(/^data:image\/\w+;base64,(.+)/)
        const base64Data = base64Match ? base64Match[1] : body.photo
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))

        photoR2Key = `photos/${subscriber.id}.jpg`
        await context.env.PHOTOS_BUCKET.put(photoR2Key, binaryData, {
          httpMetadata: {
            contentType: 'image/jpeg',
            cacheControl: 'no-cache, must-revalidate',
          },
        })
      } catch (e) {
        console.error('[update-profile] R2 upload error:', e)
      }
    }

    // Determine if profile is complete
    const hasHeight = !!(body.height_cm || body.height_cm === 0)
    const hasWeight = !!(body.weight_kg || body.weight_kg === 0)
    const hasGender = !!body.gender
    const hasPhoto = !!photoR2Key || !!subscriber.photo_r2_key
    const profileComplete = hasHeight && hasWeight && hasGender && hasPhoto

    // Update subscriber in Supabase
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      profile_complete: profileComplete,
    }

    if (body.height_cm !== undefined) updateData.height_cm = body.height_cm
    if (body.weight_kg !== undefined) updateData.weight_kg = body.weight_kg
    if (body.gender !== undefined) updateData.gender = body.gender
    if (photoR2Key) updateData.photo_r2_key = photoR2Key
    const supportedLangs = ['ko', 'en', 'ja', 'zh', 'es']
    if (body.preferred_language && supportedLangs.includes(body.preferred_language)) {
      updateData.preferred_language = body.preferred_language
    }

    // Update ALL records for this email (handles duplicates)
    await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(body.email)}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': context.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      }
    )

    // Also update any other records with same user_id (cross-email sync)
    if (body.user_id) {
      await fetch(
        `${context.env.SUPABASE_URL}/rest/v1/subscribers?user_id=eq.${body.user_id}&email=neq.${encodeURIComponent(body.email)}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': context.env.SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        }
      )
    }

    const updateRes = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(body.email)}&order=profile_complete.desc&limit=1`,
      {
        headers: {
          'apikey': context.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
        },
      }
    )

    if (!updateRes.ok) {
      console.error('[update-profile] Supabase update error:', await updateRes.text())
      return errors.externalApi('Supabase', corsHeaders)
    }

    const result = await updateRes.json()

    return new Response(
      JSON.stringify({ success: true, profile_complete: profileComplete, subscriber: Array.isArray(result) ? result[0] : result }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (error) {
    console.error('[update-profile] Error:', error)
    return errors.internal(corsHeaders)
  }
}

export const onRequestOptions: PagesFunction = async (context) => {
  return createCorsPreflightResponse(context.request)
}
