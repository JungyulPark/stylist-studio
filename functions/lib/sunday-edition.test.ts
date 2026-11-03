import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  aggregateForecast,
  buildEditionSubject,
  buildSundayEditionHtml,
  isEditionHour,
  runSundayEditions,
  summarizeWeek,
  weekNote,
  type DayForecast,
} from './sunday-edition'
import { buildArchive } from './style-archive'

const img = (id: string, name: string, url = `https://img/${name}.jpg`) => ({ id, label: id === 'dressy' ? 'Dressy' : 'Casual', name, url })

const WEEK_ROWS = [
  { sent_date: '2026-11-01', created_at: '2026-11-01T07:00:00Z', outfit_images: [img('dressy', 'Porcelain Sand'), img('casual', 'Worn Indigo')] },
  { sent_date: '2026-10-31', created_at: '2026-10-31T07:00:00Z', outfit_images: [img('dressy', 'Alpine Grey')] },
  { sent_date: '2026-10-30', created_at: '2026-10-30T07:00:00Z', outfit_images: [] },
]

describe('archive grouping', () => {
  it('groups by month, newest first, marks loved looks and keeps one record per day', () => {
    const months = buildArchive([
      ...WEEK_ROWS,
      { sent_date: '2026-11-01', created_at: '2026-11-01T06:00:00Z', outfit_images: [img('dressy', 'Older Rerun')] },
    ], [{ sent_date: '2026-10-31', scenario_id: 'dressy', verdict: 'like' }, { sent_date: '2026-11-01', scenario_id: 'casual', verdict: 'dislike' }])
    expect(months.map(m => m.month)).toEqual(['2026-11', '2026-10'])
    expect(months[0].items.map(i => i.name)).toEqual(['Porcelain Sand', 'Worn Indigo'])
    expect(months[1]).toMatchObject({ looks: 1, loved: 1 })
    expect(months[1].items[0].loved).toBe(true)
  })
})

describe('week summary', () => {
  it('features the loved look, counts every morning including text-only days', () => {
    const s = summarizeWeek(WEEK_ROWS, [{ sent_date: '2026-10-31', scenario_id: 'dressy', verdict: 'like' }])
    expect(s.mornings).toBe(3)
    expect(s.looks.length).toBe(3)
    expect(s.loved).toBe(1)
    expect(s.featured?.name).toBe('Alpine Grey')
  })

  it('falls back to the latest look when nothing was loved', () => {
    expect(summarizeWeek(WEEK_ROWS, []).featured?.name).toBe('Porcelain Sand')
  })
})

describe('forecast + week note', () => {
  // Asia/Seoul = UTC+9. 04:00Z = 13:00 local.
  const at = (iso: string, temp: number, main: string) => ({ dt: Date.parse(iso) / 1000, main: { temp, temp_max: temp, temp_min: temp - 4 }, weather: [{ main }] })

  it('aggregates 3-hourly entries into local days after today, using midday weather', () => {
    const days = aggregateForecast([
      at('2026-11-01T04:00:00Z', 15, 'Clear'),   // today → skipped
      at('2026-11-02T01:00:00Z', 9, 'Clouds'),
      at('2026-11-02T04:00:00Z', 14, 'Rain'),
      at('2026-11-02T10:00:00Z', 11, 'Clouds'),
      at('2026-11-03T04:00:00Z', 6, 'Clear'),
    ], 'Asia/Seoul', '2026-11-01')
    expect(days).toEqual([
      { date: '2026-11-02', high: 14, low: 5, condition: 'Rain' },
      { date: '2026-11-03', high: 6, low: 2, condition: 'Clear' },
    ])
  })

  const d = (date: string, high: number, condition = 'Clear'): DayForecast => ({ date, high, low: high - 5, condition })

  it('writes concrete, localized advice', () => {
    expect(weekNote([d('2026-11-02', 14, 'Rain'), d('2026-11-03', 15)], 'en')).toContain('Monday')
    expect(weekNote([d('2026-11-02', 6), d('2026-11-03', 16)], 'en')).toContain('10°')
    expect(weekNote([d('2026-11-02', 2), d('2026-11-03', 3)], 'ko')).toContain('코트')
    expect(weekNote([d('2026-11-02', 15), d('2026-11-03', 16)], 'es')).toContain('semana estable')
    expect(weekNote([], 'en')).toBe('')
  })
})

describe('edition email', () => {
  const summary = summarizeWeek(WEEK_ROWS, [{ sent_date: '2026-10-31', scenario_id: 'dressy', verdict: 'like' }])
  const base = { lang: 'en', city: 'Seoul', weekOf: '2026-11-01', summary, forecast: [{ date: '2026-11-02', high: 14, low: 9, condition: 'Rain' }], shareUrl: 'https://s/1', unsubUrl: 'https://u' }

  it('renders the featured look, the rest of the week and the week ahead', () => {
    const html = buildSundayEditionHtml(base)
    expect(html).toContain('The Sunday Edition')
    expect(html).toContain('Look of the week')
    expect(html).toContain('Alpine Grey')
    expect(html).toContain('Porcelain Sand')
    expect(html).toContain('The week ahead')
    expect(html).toContain('https://s/1')
    expect(html).toContain('3 mornings · 3 looks · 1 loved')
  })

  it('has no emoji or pure white and escapes look names', () => {
    for (const lang of ['ko', 'en', 'ja', 'zh', 'es']) {
      const html = buildSundayEditionHtml({ ...base, lang })
      expect(/\p{Extended_Pictographic}/u.test(html)).toBe(false)
      expect(html.toLowerCase()).not.toMatch(/#fff\b|#ffffff/)
    }
    const evil = summarizeWeek([{ sent_date: '2026-11-01', outfit_images: [img('dressy', '<script>x</script>')] }], [])
    expect(buildSundayEditionHtml({ ...base, summary: evil })).not.toContain('<script>x')
  })

  it('still works for a text-only week', () => {
    const html = buildSundayEditionHtml({ ...base, summary: summarizeWeek([{ sent_date: '2026-11-01', outfit_images: [] }], []) })
    expect(html).not.toContain('Look of the week')
    expect(html).toContain('The week ahead')
    expect(buildEditionSubject('ko', 0, '서울')).toBe('선데이 에디션 — 서울의 다음 주')
    expect(buildEditionSubject('en', 6, 'Seoul')).toBe('The Sunday Edition — your week in 6 looks')
  })
})

describe('edition schedule + runner', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('fires only on Sunday 10:00 local time', () => {
    expect(isEditionHour('Asia/Seoul', new Date('2026-11-01T01:30:00Z'))).toBe(true)  // Sun 10:30 KST
    expect(isEditionHour('Asia/Seoul', new Date('2026-11-01T02:30:00Z'))).toBe(false) // Sun 11:30
    expect(isEditionHour('Asia/Seoul', new Date('2026-11-02T01:30:00Z'))).toBe(false) // Mon 10:30
  })

  const ENV = { SUPABASE_URL: 'https://sb', SUPABASE_SERVICE_KEY: 'k', CRON_SECRET: 's' }
  const SUB = { id: 'sub-1', email: 'a@b.co', city: 'Seoul', timezone: 'Asia/Seoul', latitude: null, longitude: null, preferred_language: 'en' }
  const SUNDAY_10 = new Date('2026-11-01T01:30:00Z')

  function stub(rows: unknown[], alreadySent = false) {
    const calls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (u: string) => {
      calls.push(String(u))
      const url = String(u)
      const body = url.includes('weekly_editions?email') ? (alreadySent ? [{ email: 'a@b.co' }] : [])
        : url.includes('subscribers?') ? [{ id: 'sub-1' }]
        : url.includes('daily_recommendations') ? rows
        : []
      return new Response(JSON.stringify(body), { status: 200 })
    }))
    return calls
  }

  it('sends once per week and records it', async () => {
    const calls = stub(WEEK_ROWS)
    const send = vi.fn(async () => ({}))
    const res = await runSundayEditions(ENV, [SUB], { emails: { send } }, { now: SUNDAY_10 })
    expect(res).toEqual([{ email: 'a@b.co', status: 'sent', looks: 3 }])
    expect(send).toHaveBeenCalledTimes(1)
    expect(calls.some(c => c.includes('weekly_editions?on_conflict'))).toBe(true)
  })

  it('skips a week already sent, a thin week, and the wrong hour', async () => {
    stub(WEEK_ROWS, true)
    const send = vi.fn(async () => ({}))
    expect((await runSundayEditions(ENV, [SUB], { emails: { send } }, { now: SUNDAY_10 }))[0].status).toBe('skipped_already_sent')
    stub(WEEK_ROWS.slice(0, 2))
    expect((await runSundayEditions(ENV, [SUB], { emails: { send } }, { now: SUNDAY_10 }))[0].status).toBe('skipped_thin_week')
    stub(WEEK_ROWS)
    expect(await runSundayEditions(ENV, [SUB], { emails: { send } }, { now: new Date('2026-11-02T01:30:00Z') })).toEqual([])
    expect(send).not.toHaveBeenCalled()
  })

  it('edition_to forces a test send to exactly one subscriber at any hour', async () => {
    stub(WEEK_ROWS, true)
    const send = vi.fn(async () => ({}))
    const other = { ...SUB, id: 'sub-2', email: 'other@b.co' }
    const res = await runSundayEditions(ENV, [SUB, other], { emails: { send } }, { forceEmail: 'A@B.co', now: new Date('2026-11-04T12:00:00Z') })
    expect(res.map(r => r.email)).toEqual(['a@b.co'])
    expect(send).toHaveBeenCalledTimes(1)
  })
})
