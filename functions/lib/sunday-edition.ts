/**
 * The Sunday Edition — 주간 리캡 메일.
 *
 * 매주 일요일 오전 10시(구독자 현지): 이번 주 받은 룩, 가장 사랑받은 룩,
 * 다음 주 날씨와 옷차림 메모. 이미지를 새로 만들지 않아 추가 생성 비용이 없다.
 * 데일리 크론(매시 실행)이 함께 돌린다 — 별도 스케줄 설정이 필요 없다.
 */
import {
  EMAIL_COLORS as C,
  EMAIL_SERIF as SERIF,
  EMAIL_SANS as SANS,
  EMAIL_LOCALES,
  EMAIL_KEEP as KEEP,
  emailTrack as track,
  emailItalic as italic,
  emailRule as rule,
  conditionLabel,
  escapeHtml,
} from './daily-email'
import { buildArchive, type ArchiveLook, type ArchiveRow, type FeedbackRow } from './style-archive'
import { createShareToken } from './feedback-token'
import { createUnsubscribeToken } from './unsubscribe-token'
import { logOpsEvent } from './ops-log'

export const EDITION_LOCAL_HOUR = 10
const MIN_MORNINGS = 3
const GRID_MAX = 6

// ─── Pure: week summary ──────────────────────────────────────────

export interface WeekSummary {
  mornings: number
  looks: ArchiveLook[]
  loved: number
  featured: ArchiveLook | null
}

export function summarizeWeek(rows: ArchiveRow[], feedback: FeedbackRow[]): WeekSummary {
  const looks = buildArchive(rows, feedback).flatMap(m => m.items)
  const mornings = new Set(rows.map(r => r.sent_date)).size
  const featured = looks.find(l => l.loved) || looks[0] || null
  return { mornings, looks, loved: looks.filter(l => l.loved).length, featured }
}

// ─── Pure: forecast ──────────────────────────────────────────────

export interface ForecastEntry {
  dt: number
  main: { temp: number; temp_max?: number; temp_min?: number }
  weather: Array<{ main: string }>
}

export interface DayForecast {
  date: string
  high: number
  low: number
  condition: string
}

export function localParts(epochSec: number, timezone: string): { date: string; hour: number } {
  const d = new Date(epochSec * 1000)
  try {
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
    const hour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', hour12: false }).format(d), 10) % 24
    return { date, hour }
  } catch {
    return { date: d.toISOString().slice(0, 10), hour: d.getUTCHours() }
  }
}

/** 3시간 단위 예보 → 내일부터 하루 단위 (최고/최저, 한낮 날씨) */
export function aggregateForecast(list: ForecastEntry[], timezone: string, today: string, maxDays = 5): DayForecast[] {
  const days = new Map<string, { high: number; low: number; condition: string; bestDiff: number }>()
  for (const e of list) {
    const { date, hour } = localParts(e.dt, timezone)
    if (date <= today) continue
    const hi = Math.round(e.main.temp_max ?? e.main.temp)
    const lo = Math.round(e.main.temp_min ?? e.main.temp)
    const diff = Math.abs(hour - 13)
    const cur = days.get(date)
    if (!cur) {
      days.set(date, { high: hi, low: lo, condition: e.weather[0]?.main || 'Clear', bestDiff: diff })
      continue
    }
    cur.high = Math.max(cur.high, hi)
    cur.low = Math.min(cur.low, lo)
    if (diff < cur.bestDiff) {
      cur.bestDiff = diff
      cur.condition = e.weather[0]?.main || cur.condition
    }
  }
  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, maxDays)
    .map(([date, d]) => ({ date, high: d.high, low: d.low, condition: d.condition }))
}

// ─── Pure: copy ──────────────────────────────────────────────────

const COPY: Record<string, {
  title: string; intro: string; lookOfWeek: string; yourWeek: string; weekAhead: string
  share: string; cta: string; unsubscribe: string
  stats: (m: number, n: number, l: number) => string
  subject: (n: number, city: string) => string
  rain: (days: string) => string; swing: (d: number) => string
  cold: string; warm: string; steady: string; daySep: string
}> = {
  en: {
    title: 'The Sunday Edition',
    intro: 'Your week in looks, and how to dress for the one ahead.',
    lookOfWeek: 'Look of the week', yourWeek: 'Your week', weekAhead: 'The week ahead',
    share: 'Share this look', cta: 'Open the archive', unsubscribe: 'Unsubscribe',
    stats: (m, n, l) => `${m} mornings · ${n} looks${l ? ` · ${l} loved` : ''}`,
    subject: (n, city) => (n > 0 ? `The Sunday Edition — your week in ${n} looks` : `The Sunday Edition — the week ahead in ${city}`),
    rain: d => `Rain is due on ${d} — keep a water-resistant layer close.`,
    swing: d => `Temperatures swing ${d}° across the week — dress in layers you can shed.`,
    cold: 'A cold week — one serious coat will do most of the work.',
    warm: 'A warm week — breathable linen and cotton, and fewer layers.',
    steady: 'A steady week — a good moment to repeat a look you loved.',
    daySep: ', ',
  },
  ko: {
    title: '선데이 에디션',
    intro: '이번 주에 받은 룩과, 다음 주를 위한 옷차림을 정리했어요.',
    lookOfWeek: '이번 주의 룩', yourWeek: '이번 주 기록', weekAhead: '다음 주 날씨',
    share: '이 룩 공유하기', cta: '아카이브 보기', unsubscribe: '구독 해지',
    stats: (m, n, l) => `아침 ${m}번 · 룩 ${n}개${l ? ` · 좋아요 ${l}` : ''}`,
    subject: (n, city) => (n > 0 ? `선데이 에디션 — 이번 주 ${n}개의 룩` : `선데이 에디션 — ${city}의 다음 주`),
    rain: d => `${d}에 비 소식이 있어요. 방수 아우터를 가까이 두세요.`,
    swing: d => `한 주 동안 기온 차가 ${d}°나 돼요. 입고 벗기 쉬운 레이어드가 답입니다.`,
    cold: '추운 한 주예요. 제대로 된 코트 한 벌이 대부분을 해결해줍니다.',
    warm: '따뜻한 한 주예요. 통기성 좋은 리넨과 코튼으로 가볍게 입으세요.',
    steady: '날씨가 고른 한 주예요. 마음에 들었던 룩을 다시 입어보기 좋은 때입니다.',
    daySep: ', ',
  },
  ja: {
    title: 'サンデー・エディション',
    intro: '今週のルックと、来週の装いのヒントをまとめました。',
    lookOfWeek: '今週のルック', yourWeek: '今週の記録', weekAhead: '来週の天気',
    share: 'このルックをシェア', cta: 'アーカイブを見る', unsubscribe: '購読解除',
    stats: (m, n, l) => `${m}回の朝 · ${n}ルック${l ? ` · 好き ${l}` : ''}`,
    subject: (n, city) => (n > 0 ? `サンデー・エディション — 今週の${n}ルック` : `サンデー・エディション — ${city}の来週`),
    rain: d => `${d}は雨の予報。撥水のアウターを手元に。`,
    swing: d => `週の寒暖差は${d}°。脱ぎ着しやすい重ね着を。`,
    cold: '寒い一週間。しっかりしたコート一着が頼りになります。',
    warm: '暖かい一週間。通気性のよいリネンとコットンで軽やかに。',
    steady: '穏やかな一週間。気に入ったルックをもう一度着るのに良いタイミングです。',
    daySep: '、',
  },
  zh: {
    title: '周日特刊',
    intro: '回顾本周造型，并为下周的穿搭做好准备。',
    lookOfWeek: '本周造型', yourWeek: '本周记录', weekAhead: '下周天气',
    share: '分享这套造型', cta: '查看造型档案', unsubscribe: '取消订阅',
    stats: (m, n, l) => `${m}个早晨 · ${n}套造型${l ? ` · 喜欢 ${l}` : ''}`,
    subject: (n, city) => (n > 0 ? `周日特刊 — 本周${n}套造型` : `周日特刊 — ${city}下周天气`),
    rain: d => `${d}有雨，记得备好防水外套。`,
    swing: d => `本周温差达${d}°，选择方便增减的叠穿。`,
    cold: '寒冷的一周，一件好大衣就能解决大部分问题。',
    warm: '温暖的一周，选择透气的亚麻与棉，少穿几层。',
    steady: '天气平稳的一周，正适合重穿你喜欢的造型。',
    daySep: '、',
  },
  es: {
    title: 'The Sunday Edition',
    intro: 'Tu semana en looks y cómo vestir para la que viene.',
    lookOfWeek: 'El look de la semana', yourWeek: 'Tu semana', weekAhead: 'La semana que viene',
    share: 'Compartir este look', cta: 'Abrir el archivo', unsubscribe: 'Cancelar suscripción',
    stats: (m, n, l) => `${m} mañanas · ${n} looks${l ? ` · ${l} favoritos` : ''}`,
    subject: (n, city) => (n > 0 ? `The Sunday Edition — tu semana en ${n} looks` : `The Sunday Edition — la semana en ${city}`),
    rain: d => `Se espera lluvia el ${d}: ten a mano una capa impermeable.`,
    swing: d => `La temperatura varía ${d}° esta semana: capas que puedas quitarte.`,
    cold: 'Una semana fría: un buen abrigo hará casi todo el trabajo.',
    warm: 'Una semana cálida: lino y algodón transpirables, y menos capas.',
    steady: 'Una semana estable: buen momento para repetir un look que te encantó.',
    daySep: ', ',
  },
}

function copy(lang: string) {
  return COPY[lang] || COPY.en
}

function weekday(date: string, lang: string, style: 'long' | 'short'): string {
  return new Intl.DateTimeFormat(EMAIL_LOCALES[lang] || 'en-US', { weekday: style, timeZone: 'UTC' })
    .format(new Date(`${date}T00:00:00Z`))
}

function shortDate(date: string, lang: string): string {
  return new Intl.DateTimeFormat(EMAIL_LOCALES[lang] || 'en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${date}T00:00:00Z`))
}

/** 다음 주 옷차림 메모 — 규칙 기반이라 항상 나가고 비용이 없다 (최대 2문장) */
export function weekNote(days: DayForecast[], lang: string): string {
  const c = copy(lang)
  if (days.length === 0) return ''
  const notes: string[] = []
  const rainy = days.filter(d => ['Rain', 'Drizzle', 'Thunderstorm', 'Snow'].includes(d.condition))
  if (rainy.length) notes.push(c.rain(rainy.slice(0, 3).map(d => weekday(d.date, lang, 'long')).join(c.daySep)))
  const highs = days.map(d => d.high)
  const swing = Math.max(...highs) - Math.min(...highs)
  if (swing >= 8) notes.push(c.swing(swing))
  else if (Math.max(...highs) < 5) notes.push(c.cold)
  else if (Math.min(...highs) >= 25) notes.push(c.warm)
  if (notes.length === 0) notes.push(c.steady)
  return notes.slice(0, 2).join(' ')
}

export function buildEditionSubject(lang: string, looks: number, city: string): string {
  return copy(lang).subject(looks, city)
}

// ─── Pure: HTML ──────────────────────────────────────────────────

export interface EditionInput {
  lang: string
  city: string
  weekOf: string
  summary: WeekSummary
  forecast: DayForecast[]
  shareUrl: string | null
  unsubUrl: string
}

export function buildSundayEditionHtml(input: EditionInput): string {
  const { lang, summary } = input
  const c = copy(lang)
  const kicker = (text: string) =>
    `<tr><td align="center" style="padding:0 0 8px;font-family:${SANS};font-size:10px;${track(lang, 4)}text-transform:uppercase;color:${C.gold};">${escapeHtml(text)}</td></tr>`

  const f = summary.featured
  const featured = f
    ? `${kicker(c.lookOfWeek)}
          <tr><td align="center" style="padding:0 16px 18px;font-family:${SERIF};font-size:30px;line-height:1.2;color:${C.ink};">${escapeHtml(f.name)}</td></tr>
          <tr><td align="center"><img src="${escapeHtml(f.url)}" width="480" alt="${escapeHtml(f.name)}" style="display:block;width:100%;max-width:480px;height:auto;border:1px solid ${C.rule};" /></td></tr>
          <tr><td align="center" style="padding:14px 0 6px;font-family:${SANS};font-size:12px;color:${C.muted};">${escapeHtml(weekday(f.date, lang, 'long'))}</td></tr>
          ${input.shareUrl ? `<tr><td align="center" style="padding:6px 0 36px;"><a href="${escapeHtml(input.shareUrl)}" style="font-family:${SANS};font-size:11px;${track(lang, 3)}text-transform:uppercase;color:${C.gold};text-decoration:none;border-bottom:1px solid ${C.rule};padding-bottom:3px;">${escapeHtml(c.share)}</a></td></tr>` : '<tr><td style="padding:0 0 30px;"></td></tr>'}`
    : ''

  const rest = summary.looks.filter(l => l !== f).slice(0, GRID_MAX)
  const cells = rest.map(l => `<td width="33%" valign="top" style="padding:0 5px 16px;">
              <img src="${escapeHtml(l.url)}" width="160" alt="${escapeHtml(l.name)}" style="display:block;width:100%;max-width:160px;height:auto;border:1px solid ${l.loved ? C.gold : C.rule};" />
              <div style="padding-top:7px;font-family:${SERIF};font-size:13px;color:${C.ink};">${escapeHtml(l.name)}</div>
              <div style="font-family:${SANS};font-size:10px;color:${C.dim};">${escapeHtml(shortDate(l.date, lang))}</div>
            </td>`)
  const rows: string[] = []
  for (let i = 0; i < cells.length; i += 3) {
    const row = cells.slice(i, i + 3)
    while (row.length < 3) row.push('<td width="33%"></td>')
    rows.push(`<tr>${row.join('')}</tr>`)
  }
  const grid = rows.length
    ? `${rule()}<tr><td style="padding:30px 0 0;"></td></tr>${kicker(c.yourWeek)}
          <tr><td style="padding:10px 0 10px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.join('')}</table></td></tr>`
    : ''

  const note = weekNote(input.forecast, lang)
  const ahead = input.forecast.length
    ? `${rule()}<tr><td style="padding:30px 0 0;"></td></tr>${kicker(c.weekAhead)}
          <tr><td align="center" style="padding:6px 0 0;"><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:400px;">
            ${input.forecast.map(d => `<tr>
              <td style="padding:9px 0;border-bottom:1px solid ${C.rule};font-family:${SANS};font-size:13px;color:${C.ink};">${escapeHtml(weekday(d.date, lang, 'short'))}</td>
              <td align="center" style="padding:9px 0;border-bottom:1px solid ${C.rule};font-family:${SANS};font-size:13px;color:${C.muted};">${escapeHtml(conditionLabel(d.condition, lang))}</td>
              <td align="right" style="padding:9px 0;border-bottom:1px solid ${C.rule};font-family:${SANS};font-size:13px;color:${C.ink};">${d.high}&deg; <span style="color:${C.dim};">/ ${d.low}&deg;</span></td>
            </tr>`).join('')}
          </table></td></tr>
          ${note ? `<tr><td align="center" style="padding:22px 24px 6px;font-family:${SERIF};${italic(lang)}font-size:17px;line-height:1.6;color:${C.ink};${KEEP}">${escapeHtml(note)}</td></tr>` : ''}`
    : ''

  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;1,400&display=swap" rel="stylesheet">
<style>:root{color-scheme:dark;supported-color-schemes:dark;}body{margin:0;padding:0;}</style>
</head>
<body bgcolor="${C.bg}" style="margin:0;padding:0;background-color:${C.bg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg};font-size:1px;line-height:1px;">${escapeHtml(c.intro)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.bg}" style="background-color:${C.bg};">
    <tr>
      <td align="center" style="padding:40px 16px 32px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr><td align="center" style="padding:0 0 22px;font-family:${SERIF};font-size:14px;letter-spacing:7px;color:${C.gold};">ATELIER HUE</td></tr>
          ${rule()}
          <tr><td align="center" style="padding:30px 16px 6px;font-family:${SERIF};font-size:32px;line-height:1.2;color:${C.ink};">${escapeHtml(c.title)}</td></tr>
          <tr><td align="center" style="padding:0 0 6px;font-family:${SANS};font-size:10px;${track(lang, 3)}text-transform:uppercase;color:${C.muted};">${escapeHtml(input.city)} &middot; ${escapeHtml(shortDate(input.weekOf, lang))}</td></tr>
          <tr><td align="center" style="padding:10px 0 4px;font-family:${SANS};font-size:11px;${track(lang, 2)}color:${C.gold};">${escapeHtml(c.stats(summary.mornings, summary.looks.length, summary.loved))}</td></tr>
          <tr><td align="center" style="padding:14px 24px 34px;font-family:${SERIF};${italic(lang)}font-size:18px;line-height:1.6;color:${C.ink};${KEEP}">${escapeHtml(c.intro)}</td></tr>
          ${featured}
          ${grid}
          ${ahead}
          <tr><td align="center" style="padding:36px 0 34px;">
            <a href="https://kstylist.cc/#subscription-dashboard" style="display:inline-block;font-family:${SANS};font-size:12px;${track(lang, 3)}text-transform:uppercase;color:${C.gold};text-decoration:none;border:1px solid ${C.gold};padding:14px 30px;">${escapeHtml(c.cta)}</a>
          </td></tr>
          <tr><td align="center" style="font-family:${SANS};font-size:11px;color:${C.dim};">
            <a href="${escapeHtml(input.unsubUrl)}" style="color:${C.dim};text-decoration:underline;">${escapeHtml(c.unsubscribe)}</a>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Runner (network) ────────────────────────────────────────────

export interface EditionEnv {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  OPENWEATHER_API_KEY?: string
  CRON_SECRET: string
  RESEND_API_KEY?: string
}

export interface EditionSubscriber {
  id: string
  email: string
  city: string
  timezone: string
  latitude: number | null
  longitude: number | null
  preferred_language: string
}

interface Mailer {
  emails: { send: (msg: { from: string; to: string; subject: string; html: string; headers?: Record<string, string> }) => Promise<unknown> }
}

export function localNow(timezone: string, now: Date = new Date()): { date: string; hour: number; weekday: string } {
  try {
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
    const hour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', hour12: false }).format(now), 10) % 24
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(now)
    return { date, hour, weekday }
  } catch {
    return { date: now.toISOString().slice(0, 10), hour: now.getUTCHours(), weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getUTCDay()] }
  }
}

export function isEditionHour(timezone: string, now: Date = new Date()): boolean {
  const l = localNow(timezone, now)
  return l.weekday === 'Sun' && l.hour === EDITION_LOCAL_HOUR
}

function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

async function fetchForecast(sub: EditionSubscriber, apiKey: string | undefined, today: string): Promise<DayForecast[]> {
  if (!apiKey || sub.latitude == null || sub.longitude == null) return []
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${sub.latitude}&lon=${sub.longitude}&units=metric&cnt=40&appid=${apiKey}`
    )
    if (!res.ok) return []
    const data = await res.json() as { list?: ForecastEntry[] }
    return aggregateForecast(data.list || [], sub.timezone, today)
  } catch {
    return []
  }
}

/**
 * 대상: 현지 일요일 10시(또는 forceEmail) + 이번 주 아침 3회 이상 + 이번 주 미발송.
 */
export async function runSundayEditions(
  env: EditionEnv,
  subscribers: EditionSubscriber[],
  mailer: Mailer | null,
  opts: { forceEmail?: string | null; now?: Date } = {}
): Promise<Array<{ email: string; status: string; looks?: number }>> {
  const results: Array<{ email: string; status: string; looks?: number }> = []
  if (!mailer) return results
  const now = opts.now || new Date()
  const force = opts.forceEmail?.toLowerCase() || null
  const targets = subscribers.filter(s => (force ? s.email.toLowerCase() === force : isEditionHour(s.timezone, now)))
  const headers = { 'apikey': env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}` }

  for (const sub of targets) {
    try {
      const today = localNow(sub.timezone, now).date
      const weekStart = addDays(today, -6)
      const email = encodeURIComponent(sub.email)

      if (!force) {
        const dup = await fetch(`${env.SUPABASE_URL}/rest/v1/weekly_editions?email=eq.${email}&week_of=eq.${today}&select=email&limit=1`, { headers })
        if (dup.ok && (await dup.json() as unknown[]).length > 0) {
          results.push({ email: sub.email, status: 'skipped_already_sent' })
          continue
        }
      }

      const subRes = await fetch(`${env.SUPABASE_URL}/rest/v1/subscribers?email=eq.${email}&select=id`, { headers })
      const ids = subRes.ok ? (await subRes.json() as Array<{ id: string }>).map(s => s.id) : [sub.id]
      const [recRes, fbRes] = await Promise.all([
        fetch(`${env.SUPABASE_URL}/rest/v1/daily_recommendations?subscriber_id=in.(${ids.join(',')})&sent_date=gte.${weekStart}&sent_date=lte.${today}&select=sent_date,created_at,outfit_images`, { headers }),
        fetch(`${env.SUPABASE_URL}/rest/v1/outfit_feedback?email=eq.${email}&sent_date=gte.${weekStart}&select=sent_date,scenario_id,verdict`, { headers }),
      ])
      const rows = recRes.ok ? await recRes.json() as ArchiveRow[] : []
      const feedback = fbRes.ok ? await fbRes.json() as FeedbackRow[] : []
      const summary = summarizeWeek(rows, feedback)

      if (summary.mornings < MIN_MORNINGS) {
        results.push({ email: sub.email, status: 'skipped_thin_week' })
        continue
      }

      const lang = sub.preferred_language || 'en'
      const forecast = await fetchForecast(sub, env.OPENWEATHER_API_KEY, today)
      const shareUrl = summary.featured
        ? `https://kstylist.cc/api/share-look?t=${encodeURIComponent(await createShareToken(
            { email: sub.email, sentDate: summary.featured.date, scenarioId: summary.featured.id }, env.CRON_SECRET
          ))}`
        : null
      const unsubUrl = `https://kstylist.cc/api/unsubscribe?token=${encodeURIComponent(
        await createUnsubscribeToken(sub.id, sub.email, env.CRON_SECRET)
      )}`

      await mailer.emails.send({
        from: 'ATELIER HUE <noreply@kstylist.cc>',
        to: sub.email,
        subject: buildEditionSubject(lang, summary.looks.length, sub.city),
        html: buildSundayEditionHtml({ lang, city: sub.city, weekOf: today, summary, forecast, shareUrl, unsubUrl }),
        headers: { 'List-Unsubscribe': `<${unsubUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      })

      await fetch(`${env.SUPABASE_URL}/rest/v1/weekly_editions?on_conflict=email,week_of`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ email: sub.email, week_of: today, looks: summary.looks.length, loved: summary.loved }),
      })
      await logOpsEvent(env, 'edition.sent', { email: sub.email, payload: { week_of: today, looks: summary.looks.length } })
      results.push({ email: sub.email, status: 'sent', looks: summary.looks.length })
    } catch (e) {
      console.error(`[edition] failed for ${sub.email}:`, e)
      results.push({ email: sub.email, status: 'error' })
    }
  }
  return results
}
