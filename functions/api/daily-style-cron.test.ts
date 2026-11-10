/**
 * 데일리 크론 전체 흐름 스모크 테스트 — 핸들러를 실제로 한 바퀴 돌린다.
 * 단위 테스트는 조각만 본다. 이 테스트는 발송 자격, 스타일 노트, 메일 조립, 이미지 실패 기록,
 * 뉴스레터가 한 요청 안에서 함께 동작하는지 확인한다.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const sends: Array<{ to: string; subject: string; html: string }> = []
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: async (m: { to: string; subject: string; html: string }) => { sends.push(m); return { id: 'x' } } }
  },
}))

import { onRequestGet } from './daily-style-cron'

const NOTE = {
  subject: 'Porcelain sand for a clear 12° morning',
  preheader: 'A softer casual look for later',
  greeting: 'A clear, cool morning in Seoul.',
  personal_note: 'Your grey merino knit anchors the casual look today.',
  dressy: { items: ['Oatmeal cashmere crewneck', 'Stone wool trousers'], why: 'Tonal layers lengthen the line.' },
  casual: { items: ['Grey merino knit', 'Ecru denim'], why: 'Soft texture keeps it easy.' },
  tip: 'Match your belt to your shoes.',
}

const BASE_SUB = {
  height_cm: 175, weight_kg: 70, gender: 'male', photo_r2_key: 'photos/a.jpg', profile_complete: true,
  city: 'Seoul', timezone: 'Asia/Seoul', latitude: 37.57, longitude: 126.98, preferred_language: 'en',
  style_preferences: {}, canceled_at: null, current_period_end: null, trial_ends_at: null, updated_at: null,
}

type Call = { url: string; method: string; body?: string }
let calls: Call[] = []

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })
}

beforeEach(() => {
  calls = []
  sends.length = 0
  // 2026-11-10 22:10 UTC = 서울 11-11(수) 07:10 → 7시 발송 대상, 일요일 에디션은 아님
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-10T22:10:00Z'))
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method || 'GET'
    calls.push({ url, method, body: typeof init?.body === 'string' ? init.body : undefined })
    if (url.includes('/rest/v1/subscribers?status=in.')) {
      return json([
        { ...BASE_SUB, id: 'sub-active', email: 'active@x.co', status: 'active' },
        // 운영에서 발견된 형태: canceled인데 canceled_at이 비어 있음 → 발송되면 안 된다
        { ...BASE_SUB, id: 'sub-gone', email: 'gone@x.co', status: 'canceled', trial_ends_at: '2026-02-21T10:00:00Z' },
      ])
    }
    if (url.includes('/rest/v1/daily_recommendations') && method === 'HEAD') return new Response(null, { headers: { 'content-range': '0-0/22' } })
    if (url.includes('/rest/v1/daily_recommendations') && method === 'POST') return new Response(null, { status: 201 })
    if (url.includes('/rest/v1/daily_recommendations')) return json([])
    if (url.includes('/rest/v1/wardrobe_items')) return json([{ description: 'grey merino knit' }])
    if (url.includes('/rest/v1/journal_subscribers')) return json([{ email: 'reader@x.co', lang: 'ko' }])
    if (url.includes('/rest/v1/ops_events') && method === 'POST') return new Response(null, { status: 201 })
    if (url.includes('/rest/v1/')) return json([])
    if (url.includes('openweathermap.org')) {
      return json({ list: [{ dt: Date.parse('2026-11-11T04:00:00Z') / 1000, main: { temp: 12.2, feels_like: 10, humidity: 40 }, weather: [{ main: 'Clear', description: 'clear sky', icon: '01d' }], wind: { speed: 2 } }] })
    }
    if (url.includes('api.openai.com/v1/responses')) {
      return json({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(NOTE) }] }] })
    }
    if (url.includes('api.resend.com')) return json({ id: 'owner' })
    return json({})
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

const ENV = {
  SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_KEY: 'svc', OPENWEATHER_API_KEY: 'ow', GEMINI_API_KEY: 'g',
  OPENAI_API_KEY: 'o', RESEND_API_KEY: 're', CRON_SECRET: 'secret',
  PHOTOS_BUCKET: { get: async () => null }, // 원본 사진이 사라진 상황
  DAILY_IMAGES_BUCKET: { get: async () => null, put: async () => undefined, list: async () => ({ objects: [] }) },
}

function run(query = 'secret=secret') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return onRequestGet({ request: new Request(`https://kstylist.cc/api/daily-style-cron?${query}`), env: ENV } as any)
}

describe('daily cron, end to end', () => {
  it('rejects a wrong secret before touching anything', async () => {
    const res = await run('secret=wrong')
    expect(res.status).toBe(401)
    expect(calls.length).toBe(0)
  })

  it('sends the daily email to entitled subscribers only, with the editorial note', async () => {
    const res = await run()
    expect(res.status).toBe(200)
    const body = await res.json() as { sent: number; results: Array<{ email: string; status: string; text_source: string }>; journal: { sent: number } }

    expect(body.results.map(r => r.email)).toEqual(['active@x.co'])
    expect(body.results[0]).toMatchObject({ status: 'sent', text_source: 'gpt' })
    expect(sends.some(s => s.to === 'gone@x.co')).toBe(false)

    const daily = sends.find(s => s.to === 'active@x.co')!
    expect(daily.subject).toBe('Porcelain sand for a clear 12° morning')
    expect(daily.html).toContain('No. 23') // 22 past mornings + today
    expect(daily.html).toContain('From your notes')
    expect(daily.html).toContain('Your grey merino knit anchors the casual look today.')
    expect(/\p{Extended_Pictographic}/u.test(daily.html)).toBe(false)

    const saved = JSON.parse(calls.find(c => c.url.includes('daily_recommendations') && c.method === 'POST')!.body!)
    expect(saved).toMatchObject({ subscriber_id: 'sub-active', sent_date: '2026-11-11', email_sent: true, temperature_c: 12 })
    expect(saved.recommendation_html).toContain('LOOK 01')
  })

  it('records and alerts when every image fails (missing source photo)', async () => {
    await run()
    const events = calls.filter(c => c.url.includes('/ops_events') && c.method === 'POST').map(c => JSON.parse(c.body!))
    const failed = events.find(e => e.event_type === 'cron.image_failed')
    expect(failed.actor_email).toBe('active@x.co')
    expect(JSON.stringify(failed.payload)).toContain('photo not found in R2')
    expect(events.some(e => e.event_type === 'cron.summary')).toBe(true)

    const alert = calls.find(c => c.url.includes('api.resend.com'))
    expect(alert).toBeTruthy()
    expect(alert!.body).toContain('이미지')
    // 이미지 모델은 호출되지 않아야 한다 (사진이 없는데 비용을 쓰면 안 됨)
    expect(calls.some(c => c.url.includes('/v1/images') || c.url.includes('generativelanguage'))).toBe(false)
  })

  it('sends this week\'s Edit to journal subscribers in the same run', async () => {
    const body = await (await run()).json() as { journal_sent: number }
    expect(body.journal_sent).toBe(1)
    const edit = sends.find(s => s.to === 'reader@x.co')!
    expect(edit.subject).toBe('이번 주 트렌드 에디트: 조용하게, 그러나 눈에 띄게')
    const ledger = calls.filter(c => c.url.includes('/ops_events') && c.method === 'POST').map(c => JSON.parse(c.body!))
    expect(ledger.some(e => e.event_type === 'journal.sent' && e.actor_email === 'reader@x.co' && e.ref_id === 'quiet-but-seen')).toBe(true)
  })
})
