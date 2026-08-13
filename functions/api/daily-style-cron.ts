import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { errors } from '../lib/errors'
import { editPhotoWithGemini, type ImageScenario } from '../lib/gemini-image'
import { getDailyScenarios, dailyScenarioLabels } from '../lib/daily-style-scenarios'
import { createUnsubscribeToken } from '../lib/unsubscribe-token'
import { createFeedbackToken } from '../lib/feedback-token'
import { sendEmptyPush } from '../lib/web-push'
import { logOpsEvent, notifyOwner } from '../lib/ops-log'
import { getStyleRef } from '../lib/style-refs'
import { Resend } from 'resend'

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  OPENWEATHER_API_KEY: string
  GEMINI_API_KEY: string
  OPENAI_API_KEY: string
  RESEND_API_KEY: string
  CRON_SECRET: string
  VAPID_PRIVATE_JWK?: string
  VAPID_SUBJECT?: string
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
  updated_at: string | null
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

function getLocalDate(timezone: string): string {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    return formatter.format(now) // returns YYYY-MM-DD
  } catch {
    return new Date().toISOString().split('T')[0]
  }
}

async function getWeather(lat: number, lon: number, apiKey: string, timezone: string): Promise<WeatherData | null> {
  try {
    // Use forecast API to get DAYTIME temperature (12-15h local) instead of current (7AM) temp.
    // At 7AM the temperature is often much lower than actual activity hours.
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&cnt=8&appid=${apiKey}`
    )
    if (!res.ok) {
      // Fallback to current weather API if forecast fails
      return getWeatherCurrent(lat, lon, apiKey)
    }
    const data = await res.json() as {
      list: Array<{
        dt: number
        main: { temp: number; feels_like: number; humidity: number }
        weather: Array<{ main: string; description: string; icon: string }>
        wind: { speed: number }
      }>
    }

    if (!data.list || data.list.length === 0) {
      return getWeatherCurrent(lat, lon, apiKey)
    }

    // Find the forecast entry closest to midday (12-15h) in the subscriber's local timezone
    let bestEntry = data.list[0]
    let bestDiff = Infinity

    for (const entry of data.list) {
      const entryDate = new Date(entry.dt * 1000)
      let localHour: number
      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: 'numeric',
          hour12: false,
        })
        localHour = parseInt(formatter.format(entryDate), 10)
      } catch {
        localHour = entryDate.getUTCHours()
      }
      // Target 13h (1PM) — peak activity time
      const diff = Math.abs(localHour - 13)
      if (diff < bestDiff) {
        bestDiff = diff
        bestEntry = entry
      }
    }

    return {
      temp: Math.round(bestEntry.main.temp),
      feels_like: Math.round(bestEntry.main.feels_like),
      humidity: bestEntry.main.humidity,
      condition: bestEntry.weather[0]?.main || 'Clear',
      description: bestEntry.weather[0]?.description || '',
      icon: bestEntry.weather[0]?.icon || '01d',
      wind_speed: bestEntry.wind.speed,
    }
  } catch {
    return getWeatherCurrent(lat, lon, apiKey)
  }
}

// Fallback: current weather (used if forecast API fails)
async function getWeatherCurrent(lat: number, lon: number, apiKey: string): Promise<WeatherData | null> {
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
  openaiApiKey: string,
  scenarioPrompts?: { id: string; prompt: string }[]
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

  // Build outfit descriptions from the same scenarios used for image generation
  let outfitSection = ''
  if (scenarioPrompts && scenarioPrompts.length > 0) {
    const dressyPrompt = scenarioPrompts.find(s => s.id === 'dressy')?.prompt || ''
    const casualPrompt = scenarioPrompts.find(s => s.id === 'casual')?.prompt || ''
    outfitSection = `
OUTFITS TO DESCRIBE (the email includes images of these EXACT outfits — your text MUST match them):
- Dressy Look: ${dressyPrompt}
- Casual Look: ${casualPrompt}

You MUST describe these two specific outfits. Do NOT invent different outfits.`
  }

  const prompt = `You are an expert personal stylist. Write a daily outfit recommendation email (150-200 words) entirely in ${langName[lang] || 'English'}.

CONTEXT:
- City: ${subscriber.city}
- Weather: ${weather.temp}°C (feels like ${weather.feels_like}°C), ${weather.description}, humidity ${weather.humidity}%, wind ${weather.wind_speed}m/s
- Profile: ${profileDesc || 'Not specified'}
- Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
${outfitSection}

STYLING EXPERTISE:
- If height < 165cm: recommend high-waisted bottoms, vertical lines, pointed shoes to elongate
- If height > 180cm: relaxed proportions and layering look elegant
- For fuller builds: structured fabrics, monochromatic, defined waistlines
- ALWAYS explain WHY a color/item works (e.g. "Navy complements warm skin tone")

INSTRUCTIONS:
1. Start with a friendly greeting mentioning today's weather (2-3 sentences)
2. Present TWO outfit recommendations — "Dressy" and "Casual" — each with specific items (top, bottom, shoes, outerwear if needed, accessories) on their own lines with a dash (-) prefix, including colors and materials. For each outfit, add a brief note about WHY the colors and silhouette suit the wearer.
3. Add a style tip of the day (1-2 sentences)
4. End with a warm closing line
5. Use plain text with line breaks — no markdown headers or asterisks, emoji sparingly
6. Be warm, practical, and weather-appropriate`

  // Use OpenAI gpt-5-mini via Responses API (reasoning model, pay-as-you-go)
  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        input: [{ role: 'user', content: prompt }],
        reasoning: { effort: 'low' },
        max_output_tokens: 2048,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[cron] OpenAI text error:', errText)
      return { text: getFallbackRecommendation(weather, lang), source: 'fallback', error: `OpenAI ${res.status}: ${errText.substring(0, 200)}` }
    }

    const data = await res.json() as {
      output?: Array<{
        type?: string
        content?: Array<{ type?: string; text?: string }>
      }>
    }

    const content = data.output
      ?.find(o => o.type === 'message')
      ?.content?.find(c => c.type === 'output_text')
      ?.text
    if (!content) {
      return { text: getFallbackRecommendation(weather, lang), source: 'fallback', error: 'Empty OpenAI text response' }
    }
    return { text: content, source: 'gpt' }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e)
    console.error('[cron] OpenAI text error:', e)
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
  imagesBucket: R2Bucket,
  precomputedScenarios?: ImageScenario[],
  openaiApiKey?: string
): Promise<{ images: OutfitImage[]; photoSizeBytes: number; scenarioErrors: string[] }> {
  if (!subscriber.photo_r2_key || !subscriber.gender) {
    console.log(`[cron] Skipping image gen for ${subscriber.email}: no photo or gender`)
    return { images: [], photoSizeBytes: 0, scenarioErrors: ['no photo or gender'] }
  }

  // Fetch subscriber's photo from R2
  let photoDataUri: string
  try {
    console.log(`[cron] Fetching photo from R2: ${subscriber.photo_r2_key}`)
    const photoObj = await photosBucket.get(subscriber.photo_r2_key)
    if (!photoObj) {
      console.error(`[cron] Photo not found in R2: ${subscriber.photo_r2_key}`)
      return { images: [], photoSizeBytes: 0, scenarioErrors: ['photo not found in R2'] }
    }
    const photoBuffer = await photoObj.arrayBuffer()
    console.log(`[cron] Photo loaded: ${photoBuffer.byteLength} bytes for ${subscriber.email}`)
    // Convert to base64 using array join (faster than repeated string concat)
    const bytes = new Uint8Array(photoBuffer)
    const chunks: string[] = []
    const chunkSize = 8192
    for (let i = 0; i < bytes.length; i += chunkSize) {
      chunks.push(String.fromCharCode(...bytes.subarray(i, i + chunkSize)))
    }
    const base64 = btoa(chunks.join(''))
    photoDataUri = `data:image/jpeg;base64,${base64}`
  } catch (e) {
    console.error(`[cron] Failed to read photo from R2:`, e)
    return { images: [], photoSizeBytes: 0, scenarioErrors: [`R2 read error: ${e instanceof Error ? e.message : String(e)}`] }
  }

  const photoSizeBytes = photoDataUri.length  // approximate size for debug
  const scenarios = precomputedScenarios || getDailyScenarios(weather, subscriber.gender)
  const today = getLocalDate(subscriber.timezone)
  const lang = subscriber.preferred_language || 'en'
  const outfitImages: OutfitImage[] = []
  const scenarioErrors: string[] = []
  const gender = subscriber.gender as string

  // 시즌 컬렉션 레퍼런스: dressy→premium, casual→casual. 날짜 시드로 매일 회전.
  // 폴더가 비어 있으면 null → 기존 텍스트 프롬프트 방식 그대로.
  const daySeed = Math.floor(Date.now() / 86_400_000)
  const [premiumRef, casualRef] = await Promise.all([
    getStyleRef(imagesBucket, 'premium', daySeed, weather.temp),
    getStyleRef(imagesBucket, 'casual', daySeed, weather.temp),
  ])
  if (premiumRef || casualRef) {
    console.log(`[cron] Style refs: premium=${premiumRef?.key || 'none'}, casual=${casualRef?.key || 'none'}`)
  }

  // Generate images in parallel for speed
  const runTs = Date.now()
  const results = await Promise.allSettled(
    scenarios.map(async (scenario) => {
      console.log(`[cron] Generating image ${scenario.id} for ${subscriber.email}`)
      const resultDataUri = await editPhotoWithGemini(
        photoDataUri,
        scenario,
        gender,
        geminiApiKey,
        openaiApiKey,
        0,
        // Daily emails render images at 240px — economy tier (Gemini Flash
        // first, OpenAI medium fallback) keeps the subscription margin-positive
        { tier: 'economy', styleRef: scenario.id === 'dressy' ? premiumRef : casualRef }
      )

      if (!resultDataUri) {
        const msg = `${scenario.id}: returned null (OpenAI+Gemini both failed)`
        console.warn(`[cron] ${msg}`)
        scenarioErrors.push(msg)
        return null
      }

      const base64Match = resultDataUri.match(/^data:image\/\w+;base64,(.+)/)
      if (!base64Match) return null

      const binaryData = Uint8Array.from(atob(base64Match[1]), c => c.charCodeAt(0))
      const r2Key = `daily/${subscriber.id}/${today}/${scenario.id}-${runTs}.jpg`

      await imagesBucket.put(r2Key, binaryData, {
        httpMetadata: {
          contentType: 'image/jpeg',
          cacheControl: 'public, max-age=604800, immutable',
        },
        customMetadata: { generated: new Date().toISOString() },
      })

      const publicUrl = `https://pub-80118c62e29d4373b70d5e0fe9503ff0.r2.dev/${r2Key}`
      const label = dailyScenarioLabels[scenario.id]?.[lang] || scenario.id
      console.log(`[cron] Image ${scenario.id} uploaded for ${subscriber.email}`)
      return { id: scenario.id, label, url: publicUrl } as OutfitImage
    })
  )

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      outfitImages.push(result.value)
    } else if (result.status === 'rejected') {
      const errMsg = result.reason instanceof Error ? result.reason.message : String(result.reason)
      console.error(`[cron] Image gen error:`, errMsg)
      scenarioErrors.push(errMsg)
    }
  }

  return { images: outfitImages, photoSizeBytes, scenarioErrors }
}

// Build email HTML with outfit images
async function buildEmailHtml(
  recommendation: string,
  weather: WeatherData,
  subscriber: Subscriber,
  outfitImages: OutfitImage[],
  unsubLink: string,
  cronSecret: string | undefined,
  sentDate: string
): Promise<string> {
  const weatherEmoji: Record<string, string> = {
    'Clear': '☀️', 'Clouds': '☁️', 'Rain': '🌧️', 'Drizzle': '🌦️',
    'Thunderstorm': '⛈️', 'Snow': '❄️', 'Mist': '🌫️', 'Fog': '🌫️',
  }
  const emoji = weatherEmoji[weather.condition] || '🌤️'

  const unsubscribeText: Record<string, string> = {
    ko: '구독 해지',
    en: 'Unsubscribe',
    ja: '購読解除',
    zh: '取消订阅',
    es: 'Cancelar suscripción',
  }

  const outfitTitle: Record<string, string> = {
    ko: '오늘의 스타일 이미지',
    en: "Today's Style Looks",
    ja: '今日のスタイルイメージ',
    zh: '今日穿搭图',
    es: 'Looks de Hoy',
  }

  const lang = subscriber.preferred_language || 'en'

  // Build outfit images HTML section — use table layout for email client compatibility
  let imagesHtml = ''
  if (outfitImages.length > 0) {
    const feedbackLabels: Record<string, [string, string]> = {
      ko: ['좋아요', '별로예요'], en: ['Love it', 'Not for me'],
    }
    const [likeLabel, dislikeLabel] = feedbackLabels[lang] || feedbackLabels.en

    const cells = await Promise.all(outfitImages.map(async img => {
      const likeUrl = `https://kstylist.cc/api/outfit-feedback?t=${encodeURIComponent(
        await createFeedbackToken({ email: subscriber.email, sentDate, scenarioId: img.id, verdict: 'like' }, cronSecret)
      )}`
      const dislikeUrl = `https://kstylist.cc/api/outfit-feedback?t=${encodeURIComponent(
        await createFeedbackToken({ email: subscriber.email, sentDate, scenarioId: img.id, verdict: 'dislike' }, cronSecret)
      )}`
      return `
          <td width="${Math.floor(100 / outfitImages.length)}%" style="text-align:center;padding:0 6px;vertical-align:top;">
            <img src="${img.url}" alt="${img.label}" style="width:100%;max-width:240px;border-radius:12px;border:1px solid rgba(201,169,98,0.3);margin-bottom:8px;display:block;margin-left:auto;margin-right:auto;" />
            <p style="color:#c9a962;font-size:12px;font-weight:600;margin:0 0 8px;text-align:center;">${img.label}</p>
            <a href="${likeUrl}" style="display:inline-block;color:#c9a962;font-size:11px;text-decoration:none;border:1px solid rgba(201,169,98,0.45);border-radius:999px;padding:5px 11px;margin:0 2px;">${likeLabel}</a>
            <a href="${dislikeUrl}" style="display:inline-block;color:#8a8aa0;font-size:11px;text-decoration:none;border:1px solid rgba(138,138,160,0.4);border-radius:999px;padding:5px 11px;margin:0 2px;">${dislikeLabel}</a>
          </td>
    `}))
    const imageCells = cells.join('')

    imagesHtml = `
    <!-- Outfit Images -->
    <div style="margin-bottom:24px;">
      <h2 style="color:#c9a962;font-size:14px;letter-spacing:2px;text-align:center;margin-bottom:6px;">${outfitTitle[lang] || outfitTitle.en}</h2>
      <p style="color:#8a8aa0;font-size:11px;text-align:center;margin:0 0 16px;">${lang === 'ko' ? '한 번 눌러주시면 내일 추천이 더 정확해져요' : 'One tap makes tomorrow\'s look more yours'}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 auto;">
        <tr>
          ${imageCells}
        </tr>
      </table>
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
              <h1 style="color:#c9a962;font-size:14px;letter-spacing:3px;margin:0;font-family:Georgia,serif;">ATELIER HUE</h1>
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
                <a href="${unsubLink}" style="color:#888888;text-decoration:underline;">${unsubscribeText[lang] || unsubscribeText.en}</a>
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
    image_status?: string; image_conditions?: Record<string, boolean>; image_error?: string; scenario_errors?: string[];
    text_source?: string; text_error?: string;
    preferred_language?: string; photo_r2_key?: string | null;
    subscriber_id?: string; updated_at?: string | null;
    photo_size_bytes?: number;
    image_urls?: string[];
    error?: string
  }> = []

  // force=true: bypass 6AM check & already-sent check (for testing)
  const forceTest = url.searchParams.get('force') === 'true'

  try {
    // 1. Fetch all subscribers (including canceled — period check happens later)
    const subRes = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/subscribers?status=in.(trialing,active,canceled)&select=*`,
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
      } else if (sub.profile_complete && !existing.profile_complete) {
        emailMap.set(sub.email, sub)
      } else if (sub.profile_complete && existing.profile_complete) {
        // Both profile_complete: prefer most recently updated
        const subTime = sub.updated_at ? new Date(sub.updated_at).getTime() : 0
        const existTime = existing.updated_at ? new Date(existing.updated_at).getTime() : 0
        if (subTime > existTime) {
          emailMap.set(sub.email, sub)
        }
      }
    }
    const subscribers = Array.from(emailMap.values())
    const rawCount = rawSubscribers.length
    console.log(`[cron] ${rawCount} raw subscribers → ${subscribers.length} after dedup`)

    // 2. Filter subscribers at 7AM local time (skip if force=true)
    let eligibleSubscribers: Subscriber[]
    if (forceTest) {
      eligibleSubscribers = subscribers
      console.log(`[cron] FORCE TEST: processing all ${subscribers.length} subscribers`)
    } else {
      const targetHour = 7
      eligibleSubscribers = subscribers.filter(sub => {
        const localHour = getLocalHour(sub.timezone)
        return localHour === targetHour
      })
    }

    if (eligibleSubscribers.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No subscribers at 7AM right now',
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
        // Use subscriber's LOCAL date (not UTC) — fixes timezone mismatch for UTC+ zones
        const today = getLocalDate(sub.timezone)
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

        // Fetch weather — uses forecast API to get DAYTIME (midday) temperature
        let weather: WeatherData | null = null
        if (sub.latitude && sub.longitude && context.env.OPENWEATHER_API_KEY) {
          weather = await getWeather(sub.latitude, sub.longitude, context.env.OPENWEATHER_API_KEY, sub.timezone)
        }
        if (!weather) {
          weather = {
            temp: 20, feels_like: 20, humidity: 50,
            condition: 'Clear', description: 'clear sky',
            icon: '01d', wind_speed: 3,
          }
        }

        // Pre-compute scenarios so text and images use the SAME outfits
        const scenarios = (sub.gender && sub.profile_complete)
          ? getDailyScenarios(weather, sub.gender)
          : undefined

        // 내 옷장: 구독자가 실제 보유한 옷이 등록돼 있으면 시나리오에 주입 —
        // 텍스트와 이미지가 같은 시나리오를 쓰므로 둘 다 자동 반영된다.
        // (경쟁 앱 최대 불만: "내가 없는 옷을 추천한다")
        if (scenarios) {
          try {
            const wRes = await fetch(
              `${context.env.SUPABASE_URL}/rest/v1/wardrobe_items?email=eq.${encodeURIComponent(sub.email)}&select=description&order=created_at.desc&limit=12`,
              {
                headers: {
                  'apikey': context.env.SUPABASE_SERVICE_KEY,
                  'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
                },
              }
            )
            if (wRes.ok) {
              const items = await wRes.json() as Array<{ description: string }>
              if (items.length > 0) {
                const owned = items.map(i => i.description).join('; ')
                const wardrobeDirective = `\n\nOWNED WARDROBE (IMPORTANT): The wearer owns these garments: ${owned}. Build the outfit PRIMARILY from these owned pieces whenever they suit today's weather and the look — you may add at most one or two complementary items they don't own, and clearly favor owned items for the main pieces.`
                for (const s of scenarios) {
                  s.prompt += wardrobeDirective
                }
                console.log(`[cron] Injected ${items.length} wardrobe items for ${sub.email}`)
              }
            }
          } catch (e) {
            console.warn(`[cron] Wardrobe fetch failed for ${sub.email} (non-blocking):`, e)
          }
        }

        // 학습된 취향: 최근 좋아요/별로예요 피드백을 시나리오에 주입 —
        // 추천이 매일 조금씩 그 사람에게 수렴한다 (Alta식 루프)
        if (scenarios) {
          try {
            const fbRes = await fetch(
              `${context.env.SUPABASE_URL}/rest/v1/outfit_feedback?email=eq.${encodeURIComponent(sub.email)}&select=verdict,outfit_desc&order=created_at.desc&limit=12`,
              {
                headers: {
                  'apikey': context.env.SUPABASE_SERVICE_KEY,
                  'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
                },
              }
            )
            if (fbRes.ok) {
              const rows = await fbRes.json() as Array<{ verdict: string; outfit_desc: string | null }>
              const liked = rows.filter(r => r.verdict === 'like' && r.outfit_desc).slice(0, 4).map(r => r.outfit_desc)
              const disliked = rows.filter(r => r.verdict === 'dislike' && r.outfit_desc).slice(0, 4).map(r => r.outfit_desc)
              if (liked.length || disliked.length) {
                let pref = '\n\nLEARNED PREFERENCES (from this subscriber\'s own feedback):'
                if (liked.length) pref += `\n- They LIKED these past outfits — lean toward similar silhouettes, colors, and formality: ${liked.join(' | ')}`
                if (disliked.length) pref += `\n- They DISLIKED these — avoid repeating similar looks: ${disliked.join(' | ')}`
                for (const s of scenarios) {
                  s.prompt += pref
                }
                console.log(`[cron] Injected feedback for ${sub.email}: ${liked.length} liked, ${disliked.length} disliked`)
              }
            }
          } catch (e) {
            console.warn(`[cron] Feedback fetch failed for ${sub.email} (non-blocking):`, e)
          }
        }

        // Generate text recommendation with OpenAI gpt-5-mini
        const recResult = await generateStyleRecommendation(sub, weather, context.env.OPENAI_API_KEY || '', scenarios)
        const recommendation = recResult.text

        // Generate outfit images for profile-complete subscribers
        let outfitImages: OutfitImage[] = []
        let imageStatus = 'skipped'

        // Debug: log which conditions are met for image generation
        const imgConditions = {
          profile_complete: !!sub.profile_complete,
          has_photo_key: !!sub.photo_r2_key,
          has_gender: !!sub.gender,
          has_openai_key: !!context.env.OPENAI_API_KEY,
          has_gemini_key: !!context.env.GEMINI_API_KEY,
          has_images_bucket: !!context.env.DAILY_IMAGES_BUCKET,
          has_photos_bucket: !!context.env.PHOTOS_BUCKET,
        }
        console.log(`[cron] Image conditions for ${sub.email}:`, JSON.stringify(imgConditions))

        let imageError: string | undefined
        let photoSizeBytes: number | undefined
        let scenarioErrors: string[] = []
        if (sub.profile_complete && sub.photo_r2_key && sub.gender && (context.env.GEMINI_API_KEY || context.env.OPENAI_API_KEY) && context.env.DAILY_IMAGES_BUCKET) {
          try {
            imageStatus = 'generating'
            // 120-second timeout to allow for slow image generation (gpt-image-1.5 can take 30-60s per image)
            const IMAGE_TIMEOUT_MS = 120_000
            const imgPromise = generateOutfitImages(
              sub,
              weather,
              context.env.GEMINI_API_KEY,
              context.env.PHOTOS_BUCKET,
              context.env.DAILY_IMAGES_BUCKET,
              scenarios,
              context.env.OPENAI_API_KEY
            )
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Image generation timed out after 90s')), IMAGE_TIMEOUT_MS)
            )
            const imgResult = await Promise.race([imgPromise, timeoutPromise])
            outfitImages = imgResult.images
            photoSizeBytes = imgResult.photoSizeBytes
            scenarioErrors = imgResult.scenarioErrors || []
            imageStatus = outfitImages.length > 0 ? 'generated' : 'no_images_returned'
            if (outfitImages.length === 0 && scenarioErrors.length > 0) {
              imageError = scenarioErrors.join('; ')
            }
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
            const unsubToken = await createUnsubscribeToken(sub.id, sub.email, context.env.CRON_SECRET)
            const unsubUrl = `https://kstylist.cc/api/unsubscribe?token=${encodeURIComponent(unsubToken)}`

            const html = await buildEmailHtml(recommendation, weather, sub, outfitImages, unsubUrl, context.env.CRON_SECRET, today)
            const subject = emailSubjects[sub.preferred_language] || emailSubjects.en

            await resend.emails.send({
              from: 'ATELIER HUE <noreply@kstylist.cc>',
              to: sub.email,
              subject: `${subject} — ${sub.city} ${weather.temp}°C`,
              html,
              headers: {
                'List-Unsubscribe': `<${unsubUrl}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
              },
            })
            emailSent = true
          } catch (e) {
            emailError = e instanceof Error ? e.message : 'Email send failed'
            console.error(`[cron] Email failed for ${sub.email}:`, e)
          }
        }

        // 체험 종료 D-3 알림 — 지금은 체험이 조용히 끝나고 결제된다.
        // 그동안 받은 룩 수를 세어 가치를 상기시키고, 대시보드로 부른다.
        if (emailSent && sub.trial_ends_at && !sub.current_period_end) {
          try {
            const daysLeft = Math.ceil(
              (new Date(sub.trial_ends_at).getTime() - Date.now()) / 86_400_000
            )
            if (daysLeft === 3) {
              const noticeUnsubUrl = `https://kstylist.cc/api/unsubscribe?token=${encodeURIComponent(
                await createUnsubscribeToken(sub.id, sub.email, context.env.CRON_SECRET)
              )}`
              const cntRes = await fetch(
                `${context.env.SUPABASE_URL}/rest/v1/daily_recommendations?subscriber_id=eq.${sub.id}&select=id`,
                {
                  headers: {
                    'apikey': context.env.SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
                    'Prefer': 'count=exact',
                  },
                }
              )
              const looksSoFar = parseInt(cntRes.headers.get('content-range')?.split('/')[1] || '0', 10) * 2
              const isKo = sub.preferred_language === 'ko'
              if (resend) {
                await resend.emails.send({
                  from: 'ATELIER HUE <noreply@kstylist.cc>',
                  to: sub.email,
                  subject: isKo ? '무료 체험이 3일 남았어요' : 'Three days left in your free trial',
                  html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;background:#1a1a2e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a2e;padding:40px 16px;"><tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
      <tr><td align="center" style="padding-bottom:24px;">
        <div style="color:#c9a962;font-size:14px;letter-spacing:3px;font-family:Georgia,serif;">ATELIER HUE</div>
      </td></tr>
      <tr><td style="color:#ffffff;font-size:20px;font-weight:700;padding-bottom:14px;text-align:center;">
        ${isKo ? '무료 체험이 3일 남았습니다' : 'Three days left in your free trial'}
      </td></tr>
      <tr><td style="color:#b8b8c8;font-size:14px;line-height:1.75;padding-bottom:22px;text-align:center;">
        ${isKo
          ? `지금까지 ${sub.city} 날씨에 맞춘 코디 ${looksSoFar}벌을 보내드렸어요. 4일째부터 $6.99/월로 이어집니다 — 원하지 않으시면 언제든 해지할 수 있고, 지금 해지해도 체험 기간은 그대로 유지됩니다.`
          : `We've sent you ${looksSoFar} looks matched to ${sub.city}'s weather so far. From day four it continues at $6.99/month — cancel any time, and cancelling now still keeps your trial running to the end.`}
      </td></tr>
      <tr><td align="center" style="padding-bottom:18px;">
        <a href="https://kstylist.cc/#subscription-dashboard" style="display:inline-block;background:#c9a962;color:#1a1a2e;text-decoration:none;font-weight:700;font-size:14px;padding:13px 30px;border-radius:12px;">
          ${isKo ? '내 스타일 보기' : 'See my looks'}
        </a>
      </td></tr>
      <tr><td align="center" style="border-top:1px solid #3a3a5c;padding-top:18px;">
        <a href="${noticeUnsubUrl}" style="color:#888888;font-size:11px;">${isKo ? '구독 해지' : 'Unsubscribe'}</a>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`,
                })
                console.log(`[cron] Trial D-3 notice sent to ${sub.email} (${looksSoFar} looks)`)
              }
            }
          } catch (e) {
            console.warn(`[cron] Trial notice failed for ${sub.email} (non-blocking):`, e)
          }
        }

        // 아침 푸시 알림 (있으면) — 실패해도 이메일 발송에 영향 없음
        if (emailSent) {
          try {
            const pushRes = await fetch(
              `${context.env.SUPABASE_URL}/rest/v1/push_subscriptions?email=eq.${encodeURIComponent(sub.email)}&select=endpoint`,
              {
                headers: {
                  'apikey': context.env.SUPABASE_SERVICE_KEY,
                  'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
                },
              }
            )
            if (pushRes.ok) {
              const rows = await pushRes.json() as Array<{ endpoint: string }>
              for (const row of rows) {
                const status = await sendEmptyPush(row.endpoint, context.env)
                // 404/410 = 만료된 구독 — 정리
                if (status === 404 || status === 410) {
                  await fetch(
                    `${context.env.SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(row.endpoint)}`,
                    {
                      method: 'DELETE',
                      headers: {
                        'apikey': context.env.SUPABASE_SERVICE_KEY,
                        'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
                      },
                    }
                  )
                }
              }
            }
          } catch (e) {
            console.warn(`[cron] Push failed for ${sub.email} (non-blocking):`, e)
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
          scenario_errors: scenarioErrors.length > 0 ? scenarioErrors : undefined,
          text_source: recResult.source,
          text_error: recResult.error,
          preferred_language: sub.preferred_language,
          photo_r2_key: sub.photo_r2_key,
          subscriber_id: sub.id,
          updated_at: sub.updated_at,
          photo_size_bytes: photoSizeBytes,
          image_urls: outfitImages.map(img => img.url),
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

    const sentCount = results.filter(r => r.status === 'sent').length
    const errorCount = results.filter(r => r.status === 'error').length
    const summary = {
      raw_subscribers: rawCount,
      total_active: subscribers.length,
      eligible_6am: eligibleSubscribers.length,
      sent: sentCount,
      images_generated: results.reduce((sum, r) => sum + (r.images || 0), 0),
    }

    // 크론 요약은 영구 저장 — 로그 증발 방지 (유료 제품의 발송 이력)
    await logOpsEvent(context.env, 'cron.summary', { payload: { ...summary, errors: errorCount } })

    // 사람이 봐야 하는 실패: 보낼 대상이 있는데 전부 실패했거나 실패율 30% 초과
    if (eligibleSubscribers.length > 0 && (sentCount === 0 || errorCount / eligibleSubscribers.length > 0.3)) {
      await notifyOwner(
        context.env,
        `데일리 크론 이상 — ${sentCount}/${eligibleSubscribers.length} 발송`,
        `발송 ${sentCount} / 대상 ${eligibleSubscribers.length} / 오류 ${errorCount}\n\n상세: ${JSON.stringify(results.filter(r => r.status === 'error').slice(0, 5))}`
      )
    }

    return new Response(
      JSON.stringify({ ...summary, results }),
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
