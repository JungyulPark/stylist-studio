import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { errors } from '../lib/errors'

interface Env {
  OPENWEATHER_API_KEY: string
}

// Cloudflare enriches every request with approximate geo data — no
// browser permission prompt needed for a landing-page weather teaser.
interface CfGeo {
  city?: string
  latitude?: string
  longitude?: string
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    if (!context.env.OPENWEATHER_API_KEY) {
      return errors.configError(corsHeaders)
    }

    const cf = (context.request as Request & { cf?: CfGeo }).cf
    const lat = cf?.latitude
    const lon = cf?.longitude
    if (!lat || !lon) {
      return errors.serviceUnavailable(corsHeaders)
    }

    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${context.env.OPENWEATHER_API_KEY}`
    )
    if (!res.ok) {
      return errors.externalApi('OpenWeatherMap', corsHeaders)
    }

    const data = await res.json() as {
      name?: string
      main?: { temp?: number }
      weather?: Array<{ main?: string }>
    }

    if (typeof data.main?.temp !== 'number') {
      return errors.externalApi('OpenWeatherMap', corsHeaders)
    }

    return new Response(
      JSON.stringify({
        city: cf?.city || data.name || '',
        temp: Math.round(data.main.temp),
        condition: data.weather?.[0]?.main || 'Clear',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          // Weather barely changes minute-to-minute — let Cloudflare's edge
          // cache absorb repeat landing hits
          'Cache-Control': 'public, max-age=900',
          ...corsHeaders,
        },
      }
    )
  } catch (e) {
    console.error('[weather-preview] Error:', e)
    return errors.internal(corsHeaders)
  }
}

export const onRequestOptions: PagesFunction = async (context) => {
  return createCorsPreflightResponse(context.request)
}
