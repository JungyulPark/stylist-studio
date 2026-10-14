import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { errors } from '../lib/errors'
import { editPhotoWithGemini, type ImageScenario } from '../lib/gemini-image'
import { getDailyScenarios, getDailyLookNames, dailyScenarioLabels } from '../lib/daily-style-scenarios'
import { createUnsubscribeToken } from '../lib/unsubscribe-token'
import { createFeedbackToken, createShareToken } from '../lib/feedback-token'
import {
  buildDailyEmailHtml,
  buildSubject,
  fallbackStyleNote,
  neutralizeBrands,
  sanitizeStyleNote,
  styleNoteToPlainText,
  type EmailLook,
  type StyleNote,
} from '../lib/daily-email'
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
  /** 노출용 룩 이름 (예: "Porcelain Sand") — 대시보드·공유 카드도 이 값을 쓴다 */
  name?: string
  /** 그날 노트의 아이템 목록 — 피드백 학습 스냅샷의 근거 */
  items?: string[]
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
  note: StyleNote
  source: 'gpt' | 'fallback'
  error?: string
}

/** 구독자에 대해 실제로 알고 있는 사실 — "당신을 기억한다" 문장의 유일한 근거 */
interface PersonalContext {
  wardrobe: string[]
  liked: string[]
  disliked: string[]
}

const STYLE_NOTE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['subject', 'preheader', 'greeting', 'personal_note', 'dressy', 'casual', 'tip'],
  properties: {
    subject: { type: 'string' },
    preheader: { type: 'string' },
    greeting: { type: 'string' },
    personal_note: { type: 'string' },
    dressy: {
      type: 'object',
      additionalProperties: false,
      required: ['items', 'why'],
      properties: { items: { type: 'array', items: { type: 'string' } }, why: { type: 'string' } },
    },
    casual: {
      type: 'object',
      additionalProperties: false,
      required: ['items', 'why'],
      properties: { items: { type: 'array', items: { type: 'string' } }, why: { type: 'string' } },
    },
    tip: { type: 'string' },
  },
}

async function generateStyleRecommendation(
  subscriber: Subscriber,
  weather: WeatherData,
  openaiApiKey: string,
  scenarioPrompts: { id: string; prompt: string }[] | undefined,
  lookNames: { dressy: string; casual: string },
  personal: PersonalContext
): Promise<RecommendationResult> {
  const lang = subscriber.preferred_language || 'en'
  const langName: Record<string, string> = {
    ko: 'Korean', en: 'English', ja: 'Japanese', zh: 'Chinese', es: 'Spanish'
  }
  const fallback = (error: string): RecommendationResult => ({
    note: fallbackStyleNote(getFallbackRecommendation(weather, lang)),
    source: 'fallback',
    error,
  })
  if (!openaiApiKey) return fallback('OPENAI_API_KEY missing')

  const profileDesc = [
    subscriber.gender ? `Gender: ${subscriber.gender}` : '',
    subscriber.height_cm ? `Height: ${subscriber.height_cm}cm` : '',
    subscriber.weight_kg ? `Weight: ${subscriber.weight_kg}kg` : '',
  ].filter(Boolean).join(', ')

  // 이미지 생성과 같은 시나리오를 묘사해야 글과 사진이 일치한다.
  // 아키타입의 실제 하우스명은 여기서 중립어로 바꿔 문장에 새지 않게 한다.
  const dressyPrompt = neutralizeBrands(scenarioPrompts?.find(s => s.id === 'dressy')?.prompt || '')
  const casualPrompt = neutralizeBrands(scenarioPrompts?.find(s => s.id === 'casual')?.prompt || '')
  const outfitSection = dressyPrompt || casualPrompt
    ? `OUTFITS (the email shows images of these EXACT outfits — describe them faithfully, never invent different ones):
- dressy, named "${lookNames.dressy}": ${dressyPrompt}
- casual, named "${lookNames.casual}": ${casualPrompt}`
    : `No outfit images today. Suggest a dressy and a casual outfit suited to the weather.`

  const hasPersonal = personal.wardrobe.length + personal.liked.length + personal.disliked.length > 0
  const personalSection = hasPersonal
    ? `PERSONAL CONTEXT (real data — the ONLY facts you may state about this person):
- Garments they own: ${personal.wardrobe.join('; ') || 'none registered'}
- Past looks they loved: ${personal.liked.join(' | ') || 'none yet'}
- Past looks they disliked: ${personal.disliked.join(' | ') || 'none yet'}`
    : 'PERSONAL CONTEXT: none yet.'

  const prompt = `You are the head stylist at ATELIER HUE, a quiet-luxury personal styling atelier. Write today's styling note for one subscriber, entirely in ${langName[lang] || 'English'}.

CONTEXT:
- City: ${subscriber.city}
- Weather at midday: ${weather.temp}°C (feels like ${weather.feels_like}°C), ${weather.description}, humidity ${weather.humidity}%, wind ${weather.wind_speed}m/s
- Profile: ${profileDesc || 'Not specified'}
- Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}

${outfitSection}

${personalSection}

FIELDS:
- subject: email subject, at most 55 characters. Specific to today: weave in the dressy look's name or mood and the temperature written like "${weather.temp}°". No emoji, no exclamation marks.
- preheader: at most 90 characters, a quiet tease of the casual look or the tip.
- greeting: 1-2 sentences — a stylist's morning note on the weather and how dressing should feel today.
- personal_note: ONE sentence proving you remember this person — a specific owned garment used today, or a concrete preference you are leaning into or steering away from. Use ONLY facts from PERSONAL CONTEXT. If there are none, return an empty string.
- dressy.items, casual.items: 3-5 short lines each, one garment per line with color and fabric (e.g. "Oatmeal cashmere crewneck").
- dressy.why, casual.why: 1-2 sentences on why the colors and silhouette suit this person today. If height < 165cm favor elongating notes; fuller builds favor structure and tonal dressing.
- tip: one memorable styling tip, at most 25 words.

VOICE: an editor at a luxury fashion magazine — precise, sensory, assured, never gushing. No emoji, no markdown. Never name any fashion brand, designer or label. Never mention AI.`

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
        text: { format: { type: 'json_schema', name: 'style_note', strict: true, schema: STYLE_NOTE_SCHEMA } },
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[cron] OpenAI text error:', errText)
      return fallback(`OpenAI ${res.status}: ${errText.substring(0, 200)}`)
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
    if (!content) return fallback('Empty OpenAI text response')

    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch {
      return fallback('Unparseable style note JSON')
    }
    const note = sanitizeStyleNote(parsed)
    if (!note) return fallback('Style note missing content')
    // 근거 없는 "기억"은 신뢰를 깎는다 — 데이터가 없으면 문장 자체를 버린다
    if (!hasPersonal) note.personal_note = ''
    return { note, source: 'gpt' }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e)
    console.error('[cron] OpenAI text error:', e)
    return fallback(errMsg)
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

        const personal: PersonalContext = { wardrobe: [], liked: [], disliked: [] }

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
                personal.wardrobe = items.map(i => i.description)
                const owned = personal.wardrobe.join('; ')
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
              const liked = rows.filter(r => r.verdict === 'like' && r.outfit_desc).slice(0, 4).map(r => r.outfit_desc as string)
              const disliked = rows.filter(r => r.verdict === 'dislike' && r.outfit_desc).slice(0, 4).map(r => r.outfit_desc as string)
              personal.liked = liked
              personal.disliked = disliked
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

        // 스타일리스트 노트 (gpt-5-mini, 구조화 JSON) — 룩 이름은 팔레트에서 결정적으로
        const lookNames = getDailyLookNames(sub.gender || '')
        const recResult = await generateStyleRecommendation(
          sub, weather, context.env.OPENAI_API_KEY || '', scenarios, lookNames, personal
        )
        const note = recResult.note

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

        // 룩 이름·아이템을 이미지 기록에 붙인다 — 대시보드, 공유 카드, 학습 스냅샷이 모두 이 값을 쓴다
        const lang = sub.preferred_language || 'en'
        outfitImages = outfitImages.map(img => ({
          ...img,
          name: img.id === 'dressy' ? lookNames.dressy : img.id === 'casual' ? lookNames.casual : img.label,
          items: img.id === 'dressy' ? note.dressy.items : img.id === 'casual' ? note.casual.items : [],
        }))
        const plainLooks = (outfitImages.length > 0
          ? outfitImages
          : (['dressy', 'casual'] as const).map(id => ({ id, label: dailyScenarioLabels[id][lang] || id, name: lookNames[id] }))
        ).map(img => ({ id: img.id, label: img.label, name: img.name || img.label }))
        const recommendation = styleNoteToPlainText(note, plainLooks)

        // Send email
        let emailSent = false
        let emailError: string | null = null

        if (resend) {
          try {
            const unsubToken = await createUnsubscribeToken(sub.id, sub.email, context.env.CRON_SECRET)
            const unsubUrl = `https://kstylist.cc/api/unsubscribe?token=${encodeURIComponent(unsubToken)}`

            // 호수(No.) = 지금까지 받은 아침 수 + 1 — "쌓이는" 감각
            let issueNo = 1
            try {
              const cntRes = await fetch(
                `${context.env.SUPABASE_URL}/rest/v1/daily_recommendations?subscriber_id=eq.${sub.id}&select=id`,
                {
                  method: 'HEAD',
                  headers: {
                    'apikey': context.env.SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
                    'Prefer': 'count=exact',
                  },
                }
              )
              const total = parseInt(cntRes.headers.get('content-range')?.split('/')[1] || '0', 10)
              if (Number.isFinite(total)) issueNo = total + 1
            } catch { /* 호수 없이도 발송 */ }

            const secret = context.env.CRON_SECRET
            const fbLang = encodeURIComponent(lang)
            const looks: EmailLook[] = await Promise.all(outfitImages.map(async img => ({
              id: img.id,
              label: img.label,
              name: img.name || img.label,
              url: img.url,
              likeUrl: `https://kstylist.cc/api/outfit-feedback?l=${fbLang}&t=${encodeURIComponent(
                await createFeedbackToken({ email: sub.email, sentDate: today, scenarioId: img.id, verdict: 'like' }, secret)
              )}`,
              dislikeUrl: `https://kstylist.cc/api/outfit-feedback?l=${fbLang}&t=${encodeURIComponent(
                await createFeedbackToken({ email: sub.email, sentDate: today, scenarioId: img.id, verdict: 'dislike' }, secret)
              )}`,
              shareUrl: `https://kstylist.cc/api/share-look?t=${encodeURIComponent(
                await createShareToken({ email: sub.email, sentDate: today, scenarioId: img.id }, secret)
              )}`,
            })))

            const html = buildDailyEmailHtml({
              lang,
              city: sub.city,
              timezone: sub.timezone,
              temp: weather.temp,
              condition: weather.condition,
              issueNo,
              note,
              looks,
              unsubUrl,
            })
            const subject = buildSubject(note, lang, sub.city, weather.temp, lookNames.dressy)

            await resend.emails.send({
              from: 'ATELIER HUE <noreply@kstylist.cc>',
              to: sub.email,
              subject,
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
                  html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"></head>
<body style="margin:0;background:#101018;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#101018;padding:40px 16px;"><tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
      <tr><td align="center" style="padding-bottom:24px;">
        <div style="color:#c9a962;font-size:14px;letter-spacing:7px;font-family:Georgia,serif;">ATELIER HUE</div>
      </td></tr>
      <tr><td style="color:#F5F2E9;font-size:21px;font-weight:500;font-family:Georgia,'Times New Roman',serif;padding-bottom:14px;text-align:center;">
        ${isKo ? '무료 체험이 3일 남았습니다' : 'Three days left in your free trial'}
      </td></tr>
      <tr><td style="color:#A9A497;font-size:14px;line-height:1.75;padding-bottom:22px;text-align:center;">
        ${isKo
          ? `지금까지 ${sub.city} 날씨에 맞춘 코디 ${looksSoFar}벌을 보내드렸어요. 4일째부터 $6.99/월로 이어집니다 — 원하지 않으시면 언제든 해지할 수 있고, 지금 해지해도 체험 기간은 그대로 유지됩니다.`
          : `We've sent you ${looksSoFar} looks matched to ${sub.city}'s weather so far. From day four it continues at $6.99/month — cancel any time, and cancelling now still keeps your trial running to the end.`}
      </td></tr>
      <tr><td align="center" style="padding-bottom:18px;">
        <a href="https://kstylist.cc/#subscription-dashboard" style="display:inline-block;border:1px solid #C9A962;color:#C9A962;text-decoration:none;font-size:12px;letter-spacing:3px;text-transform:uppercase;padding:14px 30px;">
          ${isKo ? '내 스타일 보기' : 'See my looks'}
        </a>
      </td></tr>
      <tr><td align="center" style="border-top:1px solid rgba(201,169,98,0.35);padding-top:18px;">
        <a href="${noticeUnsubUrl}" style="color:#77736A;font-size:11px;">${isKo ? '구독 해지' : 'Unsubscribe'}</a>
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
              outfit_description: [
                `${lookNames.dressy}: ${note.dressy.items.join(', ')}`,
                `${lookNames.casual}: ${note.casual.items.join(', ')}`,
              ].join(' | ').substring(0, 500),
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
