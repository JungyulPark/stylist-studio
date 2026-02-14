import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { errors } from '../lib/errors'
import { editPhotoWithGemini } from '../lib/gemini-image'
import { getDailyScenarios, dailyScenarioLabels } from '../lib/daily-style-scenarios'
import { Resend } from 'resend'

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  OPENWEATHER_API_KEY: string
  OPENAI_API_KEY: string
  GEMINI_API_KEY: string
  RESEND_API_KEY: string
  CRON_SECRET: string
  PHOTOS_BUCKET: R2Bucket
  DAILY_IMAGES_BUCKET: R2Bucket
}

interface Subscriber {
  id: string
  email: string
  height_cm: number | null
  weight_kg: number | null
  gender: string | null
  photo_r2_key: string | null
  profile_complete: boolean
  city: string
  timezone: string
  latitude: number | null
  longitude: number | null
  preferred_language: string
  style_preferences: Record<string, unknown>
  canceled_at: string | null
  current_period_end: string | null
  trial_ends_at: string | null
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

interface OutfitImage {
  id: string
  label: string
  url: string
}

function getLocalHour(timezone: string): number {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    })
    return parseInt(formatter.format(now), 10)
  } catch {
    return -1
  }
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

interface RecommendationResult {
  text: string
  source: 'gpt' | 'fallback'
  error?: string
}

async function generateStyleRecommendation(
  subscriber: Subscriber,
  weather: WeatherData,
  apiKey: string
): Promise<RecommendationResult> {
  const lang = subscriber.preferred_language || 'en'
  const langName: Record<string, string> = {
    ko: 'Korean', en: 'English', ja: 'Japanese', zh: 'Chinese', es: 'Spanish'
  }

  const profileDesc = [
    subscriber.gender ? `Gender: ${subscriber.gender}` : '',
    subscriber.height_cm ? `Height: ${subscriber.height_cm}cm` : '',
    subscriber.weight_kg ? `Weight: ${subscriber.weight_kg}kg` : '',
  ].filter(Boolean).join(', ')

  const prompt = `You are an expert personal stylist trusted by celebrities. Generate a warm, detailed daily outfit recommendation email.

CONTEXT:
- City: ${subscriber.city}
- Weather: ${weather.temp}°C (feels like ${weather.feels_like}°C), ${weather.description}, humidity ${weather.humidity}%, wind ${weather.wind_speed}m/s
- Profile: ${profileDesc || 'Not specified'}
- Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}

RULES:
1. Write ENTIRELY in ${langName[lang] || 'English'}
2. Write 150-200 words — NOT shorter
3. Suggest a COMPLETE outfit with specific colors and materials: top, bottom, shoes, outerwear (if needed), accessories
4. Consider the weather practically (temperature, rain, wind)
5. Include a style tip of the day
6. Be warm, friendly, and encouraging
7. Format with clear sections using line breaks — each outfit item on its own line with a dash (-) prefix
8. Do NOT use markdown headers or asterisks — use plain text with emoji sparingly

REQUIRED OUTPUT FORMAT (follow this structure exactly):
1. Friendly greeting with today's weather summary (2-3 sentences)
2. "Here's your outfit recommendation:" followed by each item on its own line:
   - Top item with color and material
   - Bottom item with color and material
   - Shoes with specific style
   - Outerwear (if weather requires)
   - Accessories (bag, watch, scarf, etc.)
3. Style tip of the day (1-2 sentences with practical advice)
4. Warm closing line

IMPORTANT: Your response must be at LEAST 120 words. Never give a one-line answer.`

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [
          { role: 'system', content: 'You are an expert personal stylist writing a daily outfit recommendation email. Always write detailed, warm, helpful responses with at least 150 words. Never give short or one-line answers.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 800,
        temperature: 0.8,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[cron] OpenAI error:', errText)
      return { text: getFallbackRecommendation(weather, lang), source: 'fallback', error: `OpenAI ${res.status}: ${errText.substring(0, 200)}` }
    }

    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>
    }
    const content = data.choices[0]?.message?.content
    if (!content) {
      return { text: getFallbackRecommendation(weather, lang), source: 'fallback', error: 'Empty GPT response' }
    }
    return { text: content, source: 'gpt' }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e)
    console.error('[cron] AI generation error:', e)
    return { text: getFallbackRecommendation(weather, lang), source: 'fallback', error: errMsg }
  }
}

function getFallbackRecommendation(weather: WeatherData, lang: string): string {
  const isKo = lang === 'ko'
  const isCold = weather.temp < 10
  const isHot = weather.temp > 25
  const isRainy = ['Rain', 'Drizzle', 'Thunderstorm'].includes(weather.condition)

  if (isKo) {
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

// Generate outfit images for a subscriber with a complete profile
async function generateOutfitImages(
  subscriber: Subscriber,
  weather: WeatherData,
  geminiApiKey: string,
  photosBucket: R2Bucket,
  imagesBucket: R2Bucket
): Promise<OutfitImage[]> {
  if (!subscriber.photo_r2_key || !subscriber.gender) {
    console.log(`[cron] Skipping image gen for ${subscriber.email}: no photo or gender`)
    return []
  }

  // Fetch subscriber's photo from R2
  let photoDataUri: string
  try {
    const photoObj = await photosBucket.get(subscriber.photo_r2_key)
    if (!photoObj) {
      console.error(`[cron] Photo not found in R2: ${subscriber.photo_r2_key}`)
      return []
    }
    const photoBuffer = await photoObj.arrayBuffer()
    // Convert to base64 in chunks to avoid stack overflow on large photos
    const bytes = new Uint8Array(photoBuffer)
    let binary = ''
    const chunkSize = 8192
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
    }
    const base64 = btoa(binary)
    photoDataUri = `data:image/jpeg;base64,${base64}`
  } catch (e) {
    console.error(`[cron] Failed to read photo from R2:`, e)
    return []
  }

  const scenarios = getDailyScenarios(weather, subscriber.gender)
  const today = new Date().toISOString().split('T')[0]
  const lang = subscriber.preferred_language || 'en'
  const outfitImages: OutfitImage[] = []

  // Generate images sequentially with stagger to avoid rate limits
  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i]

    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    try {
      console.log(`[cron] Generating image ${scenario.id} for ${subscriber.email}`)
      const resultDataUri = await editPhotoWithGemini(
        photoDataUri,
        scenario,
        subscriber.gender,
        geminiApiKey
      )

      if (resultDataUri) {
        // Upload to public R2 bucket
        const base64Match = resultDataUri.match(/^data:image\/\w+;base64,(.+)/)
        if (base64Match) {
          const binaryData = Uint8Array.from(atob(base64Match[1]), c => c.charCodeAt(0))
          const r2Key = `daily/${subscriber.id}/${today}/${scenario.id}.jpg`

          await imagesBucket.put(r2Key, binaryData, {
            httpMetadata: { contentType: 'image/jpeg' },
          })

          // Public URL from R2
          const publicUrl = `https://pub-80118c62e29d4373b70d5e0fe9503ff0.r2.dev/${r2Key}`
          const label = dailyScenarioLabels[scenario.id]?.[lang] || scenario.id

          outfitImages.push({ id: scenario.id, label, url: publicUrl })
          console.log(`[cron] Image ${scenario.id} uploaded for ${subscriber.email}`)
        }
      } else {
        console.warn(`[cron] Image generation returned null for ${scenario.id}`)
      }
    } catch (e) {
      console.error(`[cron] Image gen error for ${scenario.id}:`, e)
    }
  }

  return outfitImages
}

// Build email HTML with outfit images
function buildEmailHtml(
  recommendation: string,
  weather: WeatherData,
  subscriber: Subscriber,
  outfitImages: OutfitImage[]
): string {
  const weatherEmoji: Record<string, string> = {
    'Clear': '☀️', 'Clouds': '☁️', 'Rain': '🌧️', 'Drizzle': '🌦️',
    'Thunderstorm': '⛈️', 'Snow': '❄️', 'Mist': '🌫️', 'Fog': '🌫️',
  }
  const emoji = weatherEmoji[weather.condition] || '🌤️'

  const unsubscribeNote: Record<string, string> = {
    ko: '구독을 관리하려면 아래 링크를 이용하세요.',
    en: 'To manage your subscription, use the link below.',
    ja: 'サブスクリプションの管理は以下のリンクから。',
    zh: '管理您的订阅，请使用以下链接。',
    es: 'Para gestionar tu suscripción, usa el enlace a continuación.',
  }

  const outfitTitle: Record<string, string> = {
    ko: '오늘의 스타일 이미지',
    en: "Today's Style Looks",
    ja: '今日のスタイルイメージ',
    zh: '今日穿搭图',
    es: 'Looks de Hoy',
  }

  const lang = subscriber.preferred_language || 'en'

  // Build outfit images HTML section
  let imagesHtml = ''
  if (outfitImages.length > 0) {
    const imageCards = outfitImages.map(img => `
      <div style="flex:1;min-width:150px;max-width:180px;text-align:center;">
        <img src="${img.url}" alt="${img.label}" style="width:100%;border-radius:12px;border:1px solid rgba(201,169,98,0.3);margin-bottom:8px;" />
        <p style="color:#c9a962;font-size:12px;font-weight:600;margin:0;">${img.label}</p>
      </div>
    `).join('')

    imagesHtml = `
    <!-- Outfit Images -->
    <div style="margin-bottom:24px;">
      <h2 style="color:#c9a962;font-size:14px;letter-spacing:2px;text-align:center;margin-bottom:16px;">${outfitTitle[lang] || outfitTitle.en}</h2>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
        ${imageCards}
      </div>
    </div>
    `
  }

  // Table-based email HTML for maximum email client compatibility (Naver, Gmail, Outlook)
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#1a1a2e;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1a2e;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#1a1a2e;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding:0 0 28px;">
              <h1 style="color:#c9a962;font-size:14px;letter-spacing:3px;margin:0;font-family:Georgia,serif;">PERSONAL STYLIST</h1>
              <p style="color:#888888;font-size:12px;margin:4px 0 0;">What to Wear Today</p>
            </td>
          </tr>
          <!-- Weather -->
          <tr>
            <td align="center" style="padding:0 0 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="background-color:#252540;border:1px solid #3a3a5c;border-radius:16px;">
                <tr>
                  <td style="padding:14px 28px;text-align:center;">
                    <span style="font-size:28px;">${emoji}</span>
                    <span style="color:#ffffff;font-size:24px;font-weight:700;margin:0 8px;">${weather.temp}&deg;C</span>
                    <span style="color:#aaaaaa;font-size:14px;">${subscriber.city}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${imagesHtml ? `<!-- Outfit Images -->
          <tr>
            <td style="padding:0 0 24px;">
              ${imagesHtml}
            </td>
          </tr>` : ''}
          <!-- Recommendation -->
          <tr>
            <td style="padding:0 0 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#252540;border:1px solid #3a3a5c;border-radius:16px;">
                <tr>
                  <td style="padding:24px;color:#e0e0e0;font-size:15px;line-height:1.7;">
${recommendation.replace(/\n/g, '<br/>')}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td align="center" style="padding:0 0 28px;">
              <a href="https://kstylist.cc" style="display:inline-block;background-color:#c9a962;color:#1a1a2e;text-decoration:none;font-weight:700;font-size:14px;padding:12px 32px;border-radius:12px;">
                kstylist.cc
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="border-top:1px solid #3a3a5c;padding-top:20px;">
              <p style="color:#888888;font-size:11px;margin:0;">
                ${unsubscribeNote[subscriber.preferred_language] || unsubscribeNote.en}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

const emailSubjects: Record<string, string> = {
  ko: '오늘의 스타일 추천',
  en: 'Your Daily Style Pick',
  ja: '今日のスタイル提案',
  zh: '今日穿搭推荐',
  es: 'Tu Estilo del Día',
}

// =============================================================
// Main Cron Handler
// =============================================================

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  const url = new URL(context.request.url)
  const secret = url.searchParams.get('secret') || context.request.headers.get('x-cron-secret')
  if (!context.env.CRON_SECRET || secret !== context.env.CRON_SECRET) {
    return errors.unauthorized(corsHeaders)
  }

  if (!context.env.SUPABASE_URL || !context.env.SUPABASE_SERVICE_KEY) {
    return errors.configError(corsHeaders)
  }

  const results: Array<{
    email: string; status: string; images?: number;
    image_status?: string; image_conditions?: Record<string, boolean>; image_error?: string;
    text_source?: string; text_error?: string;
    preferred_language?: string; photo_r2_key?: string | null;
    error?: string
  }> = []

  // force=true: bypass 6AM check & already-sent check (for testing)
  const forceTest = url.searchParams.get('force') === 'true'

  try {
    // 1. Fetch all active subscribers
    const subRes = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/subscribers?status=in.(trialing,active)&select=*`,
      {
        headers: {
          'apikey': context.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
        },
      }
    )

    if (!subRes.ok) {
      console.error('[cron] Failed to fetch subscribers:', await subRes.text())
      return errors.externalApi('Supabase', corsHeaders)
    }

    const rawSubscribers = await subRes.json() as Subscriber[]

    if (!rawSubscribers || rawSubscribers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active subscribers', sent: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Deduplicate by email: prefer profile_complete record
    // Also skip canceled subscribers whose billing period has ended
    const now = new Date()
    const emailMap = new Map<string, Subscriber>()
    for (const sub of rawSubscribers) {
      // Skip if canceled AND period has ended
      if (sub.canceled_at) {
        const periodEnd = sub.current_period_end || sub.trial_ends_at
        if (periodEnd && new Date(periodEnd) < now) {
          continue // period expired, skip
        }
      }
      const existing = emailMap.get(sub.email)
      if (!existing) {
        emailMap.set(sub.email, sub)
      } else {
        if (sub.profile_complete && !existing.profile_complete) {
          emailMap.set(sub.email, sub)
        }
      }
    }
    const subscribers = Array.from(emailMap.values())
    console.log(`[cron] ${rawSubscribers.length} raw subscribers → ${subscribers.length} after dedup`)

    // 2. Filter subscribers at 6AM local time (skip if force=true)
    let eligibleSubscribers: Subscriber[]
    if (forceTest) {
      eligibleSubscribers = subscribers
      console.log(`[cron] FORCE TEST: processing all ${subscribers.length} subscribers`)
    } else {
      const targetHour = 6
      eligibleSubscribers = subscribers.filter(sub => {
        const localHour = getLocalHour(sub.timezone)
        return localHour === targetHour
      })
    }

    if (eligibleSubscribers.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No subscribers at 6AM right now',
          total_active: subscribers.length,
          sent: 0,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const resend = context.env.RESEND_API_KEY ? new Resend(context.env.RESEND_API_KEY) : null

    // 3. Process each eligible subscriber
    for (const sub of eligibleSubscribers) {
      try {
        const today = new Date().toISOString().split('T')[0]

        // Check if already sent today (skip if force=true)
        if (!forceTest) {
          const checkRes = await fetch(
            `${context.env.SUPABASE_URL}/rest/v1/daily_recommendations?subscriber_id=eq.${sub.id}&sent_date=eq.${today}&limit=1`,
            {
              headers: {
                'apikey': context.env.SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
              },
            }
          )
          const existing = await checkRes.json() as Array<unknown>
          if (existing && existing.length > 0) {
            results.push({ email: sub.email, status: 'skipped_already_sent' })
            continue
          }
        }

        // Fetch weather
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

        // Generate text recommendation
        const recResult = await generateStyleRecommendation(sub, weather, context.env.OPENAI_API_KEY)
        const recommendation = recResult.text

        // Generate outfit images for profile-complete subscribers
        let outfitImages: OutfitImage[] = []
        let imageStatus = 'skipped'

        // Debug: log which conditions are met for image generation
        const imgConditions = {
          profile_complete: !!sub.profile_complete,
          has_photo_key: !!sub.photo_r2_key,
          has_gender: !!sub.gender,
          has_gemini_key: !!context.env.GEMINI_API_KEY,
          has_images_bucket: !!context.env.DAILY_IMAGES_BUCKET,
          has_photos_bucket: !!context.env.PHOTOS_BUCKET,
        }
        console.log(`[cron] Image conditions for ${sub.email}:`, JSON.stringify(imgConditions))

        let imageError: string | undefined
        if (sub.profile_complete && sub.photo_r2_key && sub.gender && context.env.GEMINI_API_KEY && context.env.DAILY_IMAGES_BUCKET) {
          try {
            imageStatus = 'generating'
            outfitImages = await generateOutfitImages(
              sub,
              weather,
              context.env.GEMINI_API_KEY,
              context.env.PHOTOS_BUCKET,
              context.env.DAILY_IMAGES_BUCKET
            )
            imageStatus = outfitImages.length > 0 ? 'generated' : 'no_images_returned'
          } catch (e) {
            const errMsg = e instanceof Error ? e.message : String(e)
            console.error(`[cron] Image generation failed for ${sub.email}:`, errMsg)
            imageStatus = 'error'
            imageError = errMsg
          }
        }

        // Send email
        let emailSent = false
        let emailError: string | null = null

        if (resend) {
          try {
            const html = buildEmailHtml(recommendation, weather, sub, outfitImages)
            const subject = emailSubjects[sub.preferred_language] || emailSubjects.en

            await resend.emails.send({
              from: 'PERSONAL STYLIST <noreply@kstylist.cc>',
              to: sub.email,
              subject: `${subject} — ${sub.city} ${weather.temp}°C`,
              html,
            })
            emailSent = true
          } catch (e) {
            emailError = e instanceof Error ? e.message : 'Email send failed'
            console.error(`[cron] Email failed for ${sub.email}:`, e)
          }
        }

        // Save recommendation to DB
        await fetch(
          `${context.env.SUPABASE_URL}/rest/v1/daily_recommendations`,
          {
            method: 'POST',
            headers: {
              'apikey': context.env.SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json',
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
              outfit_images: outfitImages,
              image_generation_status: imageStatus,
              email_sent: emailSent,
              email_sent_at: emailSent ? new Date().toISOString() : null,
              email_error: emailError,
            }),
          }
        )

        results.push({
          email: sub.email,
          status: emailSent ? 'sent' : 'generated_not_sent',
          images: outfitImages.length,
          image_status: imageStatus,
          image_conditions: imgConditions,
          image_error: imageError,
          text_source: recResult.source,
          text_error: recResult.error,
          preferred_language: sub.preferred_language,
          photo_r2_key: sub.photo_r2_key,
          error: emailError || undefined,
        })

      } catch (e) {
        console.error(`[cron] Error processing ${sub.email}:`, e)
        results.push({
          email: sub.email,
          status: 'error',
          error: e instanceof Error ? e.message : 'Unknown error',
        })
      }
    }

    return new Response(
      JSON.stringify({
        total_active: subscribers.length,
        eligible_6am: eligibleSubscribers.length,
        sent: results.filter(r => r.status === 'sent').length,
        images_generated: results.reduce((sum, r) => sum + (r.images || 0), 0),
        results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )

  } catch (error) {
    console.error('[cron] Fatal error:', error)
    return errors.internal(corsHeaders)
  }
}

export const onRequestOptions: PagesFunction = async (context) => {
  return createCorsPreflightResponse(context.request)
}
