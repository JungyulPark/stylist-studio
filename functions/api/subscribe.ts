import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { errors } from '../lib/errors'

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  OPENWEATHER_API_KEY: string
  PHOTOS_BUCKET: R2Bucket
}

interface SubscribeRequest {
  email: string
  height_cm?: number
  weight_kg?: number
  gender?: string
  city: string
  timezone: string
  preferred_language?: string
  photo?: string           // base64 data URI
  user_id?: string
  polar_checkout_id?: string
}

interface GeoResult {
  lat: number
  lon: number
  country: string
  name: string
}

// OpenWeatherMap Geocoding API로 도시 → 좌표/국가 변환
async function geocodeCity(city: string, apiKey: string): Promise<GeoResult | null> {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`
    )
    if (!res.ok) return null
    const data = await res.json() as Array<{ lat: number; lon: number; country: string; name: string }>
    if (!data || data.length === 0) return null
    return { lat: data[0].lat, lon: data[0].lon, country: data[0].country, name: data[0].name }
  } catch {
    return null
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    if (!context.env.SUPABASE_URL || !context.env.SUPABASE_SERVICE_KEY) {
      return errors.configError(corsHeaders)
    }

    let body: SubscribeRequest
    try {
      body = await context.request.json() as SubscribeRequest
    } catch {
      return errors.invalidRequest('Invalid JSON body', corsHeaders)
    }

    // 필수 필드 검증
    if (!body.email || !body.city || !body.timezone) {
      return errors.validation('email, city, and timezone are required', corsHeaders)
    }

    // 도시 지오코딩 (좌표 + 국가)
    let latitude: number | null = null
    let longitude: number | null = null
    let country: string | null = null

    if (context.env.OPENWEATHER_API_KEY) {
      const geo = await geocodeCity(body.city, context.env.OPENWEATHER_API_KEY)
      if (geo) {
        latitude = geo.lat
        longitude = geo.lon
        country = geo.country
      }
    }

    // 사진 R2 업로드
    let photoR2Key: string | null = null
    if (body.photo && context.env.PHOTOS_BUCKET) {
      try {
        // base64 data URI → binary
        const base64Match = body.photo.match(/^data:image\/\w+;base64,(.+)/)
        const base64Data = base64Match ? base64Match[1] : body.photo
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))

        const subscriberId = crypto.randomUUID()
        photoR2Key = `photos/${subscriberId}.jpg`

        await context.env.PHOTOS_BUCKET.put(photoR2Key, binaryData, {
          httpMetadata: { contentType: 'image/jpeg' },
        })
      } catch (e) {
        console.error('[subscribe] R2 upload error:', e)
        // 사진 업로드 실패해도 구독은 계속 진행
      }
    }

    // Supabase에 구독자 저장 (upsert by email)
    const subscriberData = {
      email: body.email,
      user_id: body.user_id || null,
      polar_checkout_id: body.polar_checkout_id || null,
      status: 'trialing',
      plan_type: 'daily_style',
      height_cm: body.height_cm || null,
      weight_kg: body.weight_kg || null,
      gender: body.gender || null,
      photo_r2_key: photoR2Key,
      city: body.city,
      country,
      timezone: body.timezone,
      latitude,
      longitude,
      preferred_language: body.preferred_language || 'en',
      trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Supabase REST API (service role)
    const supabaseRes = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/subscribers`,
      {
        method: 'POST',
        headers: {
          'apikey': context.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify(subscriberData),
      }
    )

    if (!supabaseRes.ok) {
      const errText = await supabaseRes.text()
      console.error('[subscribe] Supabase error:', errText)

      // email 중복 시 update 시도
      if (errText.includes('duplicate') || errText.includes('unique')) {
        const updateRes = await fetch(
          `${context.env.SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(body.email)}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': context.env.SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify({
              ...subscriberData,
              status: 'trialing',
            }),
          }
        )

        if (updateRes.ok) {
          const updated = await updateRes.json()
          return new Response(
            JSON.stringify({ success: true, subscriber: Array.isArray(updated) ? updated[0] : updated }),
            { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          )
        }
        console.error('[subscribe] Supabase update error:', await updateRes.text())
      }

      return errors.externalApi('Supabase', corsHeaders)
    }

    const result = await supabaseRes.json()

    return new Response(
      JSON.stringify({ success: true, subscriber: Array.isArray(result) ? result[0] : result }),
      { status: 201, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )

  } catch (error) {
    console.error('[subscribe] Error:', error)
    return errors.internal(corsHeaders)
  }
}

// GET: 구독 상태 조회 (email 기준)
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

    const res = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(email)}&select=id,status,plan_type,city,timezone,trial_ends_at,current_period_end&limit=1`,
      {
        headers: {
          'apikey': context.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
        },
      }
    )

    if (!res.ok) {
      return errors.externalApi('Supabase', corsHeaders)
    }

    const data = await res.json() as Array<Record<string, unknown>>

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({ subscribed: false }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const sub = data[0]
    const isActive = sub.status === 'active' || sub.status === 'trialing'

    return new Response(
      JSON.stringify({ subscribed: isActive, ...sub }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )

  } catch (error) {
    console.error('[subscribe] GET Error:', error)
    return errors.internal(corsHeaders)
  }
}

export const onRequestOptions: PagesFunction = async (context) => {
  return createCorsPreflightResponse(context.request)
}
