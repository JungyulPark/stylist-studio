import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { errors } from '../lib/errors'

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  OPENWEATHER_API_KEY: string
  OPENAI_API_KEY: string
}

interface Subscriber {
  id: string
  email: string
  height_cm: number | null
  weight_kg: number | null
  gender: string | null
  city: string
  timezone: string
  latitude: number | null
  longitude: number | null
  preferred_language: string
}

interface WeatherData {
  temp: number
  feels_like: number
  humidity: number
  condition: string
  description: string
  icon: string
  wind_speed: number
}

interface DailyRecommendation {
  id: string
  recommendation_html: string
  temperature_c: number
  weather_condition: string
  humidity: number
  weather_data: WeatherData
  sent_date: string
}

async function getWeather(lat: number, lon: number, apiKey: string): Promise<WeatherData | null> {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
    )
    if (!res.ok) return null
    const data = await res.json() as {
      main: { temp: number; feels_like: number; humidity: number }
      weather: Array<{ main: string; description: string; icon: string }>
      wind: { speed: number }
    }
    return {
      temp: Math.round(data.main.temp),
      feels_like: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      condition: data.weather[0]?.main || 'Clear',
      description: data.weather[0]?.description || '',
      icon: data.weather[0]?.icon || '01d',
      wind_speed: data.wind.speed,
    }
  } catch {
    return null
  }
}

async function generateStyleRecommendation(
  subscriber: Subscriber,
  weather: WeatherData,
  apiKey: string
): Promise<string> {
  const lang = subscriber.preferred_language || 'en'
  const langName: Record<string, string> = {
    ko: 'Korean', en: 'English', ja: 'Japanese', zh: 'Chinese', es: 'Spanish'
  }

  const profileDesc = [
    subscriber.gender ? `Gender: ${subscriber.gender}` : '',
    subscriber.height_cm ? `Height: ${subscriber.height_cm}cm` : '',
    subscriber.weight_kg ? `Weight: ${subscriber.weight_kg}kg` : '',
  ].filter(Boolean).join(', ')

  const prompt = `You are an expert personal stylist. Generate a daily outfit recommendation.

CONTEXT:
- City: ${subscriber.city}
- Weather: ${weather.temp}°C (feels like ${weather.feels_like}°C), ${weather.description}, humidity ${weather.humidity}%, wind ${weather.wind_speed}m/s
- Profile: ${profileDesc || 'Not specified'}
- Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}

RULES:
1. Write in ${langName[lang] || 'English'}
2. Keep it concise — max 200 words
3. Suggest a complete outfit: top, bottom, shoes, outerwear (if needed), accessories
4. Consider the weather practically (temperature, rain, wind)
5. Include a style tip of the day
6. Be warm, friendly, and encouraging
7. Format with clear sections using line breaks
8. Do NOT use markdown headers — use plain text with emoji sparingly

OUTPUT FORMAT:
- Greeting with today's weather summary
- Outfit recommendation (each item on its own line)
- Style tip of the day
- Closing line`

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.8,
      }),
    })

    if (!res.ok) return getFallback(weather, lang)
    const data = await res.json() as { choices: Array<{ message: { content: string } }> }
    return data.choices[0]?.message?.content || getFallback(weather, lang)
  } catch {
    return getFallback(weather, lang)
  }
}

function getFallback(weather: WeatherData, lang: string): string {
  const isCold = weather.temp < 10
  const isHot = weather.temp > 25
  const isRainy = ['Rain', 'Drizzle', 'Thunderstorm'].includes(weather.condition)

  if (lang === 'ko') {
    let msg = `오늘 날씨는 ${weather.temp}°C, ${weather.description}입니다.\n\n`
    if (isCold) msg += '따뜻한 코트와 니트를 추천합니다. 목도리도 잊지 마세요!'
    else if (isHot) msg += '시원한 린넨 셔츠와 면바지를 추천합니다. 선글라스 필수!'
    else if (isRainy) msg += '방수 재킷과 부츠를 추천합니다. 우산 챙기세요!'
    else msg += '가벼운 레이어드 스타일을 추천합니다. 가디건이나 얇은 재킷이 딱이에요!'
    return msg
  }

  let msg = `Today's weather: ${weather.temp}°C, ${weather.description}.\n\n`
  if (isCold) msg += 'Stay warm with a cozy coat and knitwear. Don\'t forget your scarf!'
  else if (isHot) msg += 'Keep cool with a linen shirt and light pants. Sunglasses are a must!'
  else if (isRainy) msg += 'Grab a waterproof jacket and boots. Don\'t forget your umbrella!'
  else msg += 'Perfect layering weather! A cardigan or light jacket works great.'
  return msg
}

// GET /api/daily-style?email=xxx
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    if (!context.env.SUPABASE_URL || !context.env.SUPABASE_SERVICE_KEY) {
      return errors.configError(corsHeaders)
    }

    const url = new URL(context.request.url)
    const email = url.searchParams.get('email')
    const langOverride = url.searchParams.get('lang')
    if (!email) {
      return errors.validation('email parameter is required', corsHeaders)
    }

    // 1. 구독자 조회
    const subRes = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(email)}&status=in.(trialing,active)&select=*&limit=1`,
      {
        headers: {
          'apikey': context.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
        },
      }
    )

    if (!subRes.ok) return errors.externalApi('Supabase', corsHeaders)
    const subscribers = await subRes.json() as Subscriber[]

    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No active subscription found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const sub = subscribers[0]
    // 프론트엔드 언어 설정 우선 사용
    if (langOverride && ['ko', 'en', 'ja', 'zh', 'es'].includes(langOverride)) {
      sub.preferred_language = langOverride
    }
    const today = new Date().toISOString().split('T')[0]

    // 2. 오늘 이미 생성된 추천이 있는지 확인
    const existRes = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/daily_recommendations?subscriber_id=eq.${sub.id}&sent_date=eq.${today}&select=*&limit=1`,
      {
        headers: {
          'apikey': context.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
        },
      }
    )

    if (existRes.ok) {
      const existing = await existRes.json() as DailyRecommendation[]
      if (existing && existing.length > 0) {
        return new Response(
          JSON.stringify({
            recommendation: existing[0].recommendation_html,
            weather: existing[0].weather_data,
            city: sub.city,
            date: today,
            cached: true,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        )
      }
    }

    // 3. 날씨 조회
    let weather: WeatherData | null = null
    if (sub.latitude && sub.longitude && context.env.OPENWEATHER_API_KEY) {
      weather = await getWeather(sub.latitude, sub.longitude, context.env.OPENWEATHER_API_KEY)
    }
    if (!weather) {
      weather = {
        temp: 20, feels_like: 20, humidity: 50,
        condition: 'Clear', description: 'clear sky',
        icon: '01d', wind_speed: 3,
      }
    }

    // 4. AI 추천 생성
    const recommendation = await generateStyleRecommendation(sub, weather, context.env.OPENAI_API_KEY)

    // 5. DB에 저장
    await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/daily_recommendations`,
      {
        method: 'POST',
        headers: {
          'apikey': context.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          subscriber_id: sub.id,
          sent_date: today,
          weather_data: weather,
          temperature_c: weather.temp,
          weather_condition: weather.condition,
          humidity: weather.humidity,
          recommendation_html: recommendation,
          outfit_description: recommendation.substring(0, 500),
        }),
      }
    )

    return new Response(
      JSON.stringify({
        recommendation,
        weather,
        city: sub.city,
        date: today,
        cached: false,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )

  } catch (error) {
    console.error('[daily-style] Error:', error)
    return errors.internal(corsHeaders)
  }
}

export const onRequestOptions: PagesFunction = async (context) => {
  return createCorsPreflightResponse(context.request)
}
