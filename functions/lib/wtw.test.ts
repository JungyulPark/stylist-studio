import { describe, it, expect, vi, afterEach } from 'vitest'
import { BANDS, CITIES, allDegrees, bandFor, degreeSlug, parseDegreeSlug, toF } from './wtw-data'
import {
  handleWhatToWear,
  renderCityPage,
  renderDegreePage,
  renderHubPage,
  summarizeForecast,
  wtwSitemapSlugs,
} from './wtw-render'
import { onRequestGet as sitemapGet } from '../sitemap.xml'

const EMOJI = /\p{Extended_Pictographic}/u
const BRANDS = /herm[eè]s|loro piana|auralee|cucinelli|bottega|tom ford|celine|zegna|max mara|dior|the row|jil sander|louis vuitton|prada|chanel|gucci|uniqlo|zara/i

afterEach(() => vi.unstubAllGlobals())

describe('temperature bands', () => {
  it('cover every page temperature exactly once, with sane boundaries', () => {
    for (const c of allDegrees()) {
      const hits = BANDS.filter(b => c >= b.min && c <= b.max)
      expect(hits.length, `${c}°C`).toBe(1)
    }
    const boundaries: Array<[number, string]> = [
      [28, 'hot'], [27, 'warm'], [23, 'warm'], [22, 'mild'], [20, 'mild'], [19, 'fresh'], [17, 'fresh'],
      [16, 'cool'], [12, 'cool'], [11, 'chilly'], [9, 'chilly'], [8, 'cold'], [5, 'cold'], [4, 'very-cold'],
      [0, 'very-cold'], [-1, 'freezing'], [-10, 'freezing'], [40, 'hot'], [-30, 'freezing'],
    ]
    for (const [c, id] of boundaries) expect(bandFor(c).id, `${c}°C`).toBe(id)
    expect(bandFor(16.6).id).toBe('fresh') // rounds to 17
  })

  it('parses slugs strictly', () => {
    expect(parseDegreeSlug('15-degrees')).toBe(15)
    expect(parseDegreeSlug('minus-5-degrees')).toBe(-5)
    expect(parseDegreeSlug('0-degrees')).toBe(0)
    for (const bad of ['minus-0-degrees', '36-degrees', 'minus-11-degrees', '15', '15-degree', '015-degrees', 'seoul', ''])
      expect(parseDegreeSlug(bad), bad).toBeNull()
    for (const c of allDegrees()) expect(parseDegreeSlug(degreeSlug(c))).toBe(c)
    expect(toF(15)).toBe(59)
    expect(toF(-10)).toBe(14)
  })
})

describe('degree pages', () => {
  it('render for every temperature in both languages, unique and clean', () => {
    const titles = new Set<string>()
    for (const lang of ['en', 'ko'] as const) {
      for (const c of allDegrees()) {
        const html = renderDegreePage(c, lang)
        const title = /<title>(.*?)<\/title>/.exec(html)![1]
        const desc = /<meta name="description" content="(.*?)">/.exec(html)![1]
        titles.add(title)
        expect(desc.length).toBeLessThanOrEqual(170) // 160 + entity expansion
        expect(html).toContain(`<link rel="canonical" href="https://kstylist.cc${lang === 'ko' ? '/ko' : ''}/what-to-wear/${degreeSlug(c)}">`)
        expect(html).toContain('hreflang="x-default"')
        expect(html).not.toMatch(/undefined|NaN|Infinity/)
        expect(EMOJI.test(html)).toBe(false)
        expect(BRANDS.test(html)).toBe(false)
      }
    }
    expect(titles.size).toBe(allDegrees().length * 2)
  })

  it('give degree-specific advice at band edges', () => {
    expect(renderDegreePage(12, 'en')).toContain('cold end of this range')
    expect(renderDegreePage(16, 'en')).toContain('warm end of this range')
    expect(renderDegreePage(14, 'en')).toContain('Squarely in the middle')
    expect(renderDegreePage(15, 'ko')).toContain('15도 옷차림')
    expect(renderDegreePage(15, 'en')).toContain('Is 15°C cold?')
  })
})

describe('city pages + live weather', () => {
  const at = (iso: string, temp: number, main: string) => ({ dt: Date.parse(iso) / 1000, main: { temp, feels_like: temp - 2, temp_max: temp, temp_min: temp - 3 }, weather: [{ main }] })
  // Seoul = UTC+9; 04:00Z = 13:00 local
  const LIST = [
    at('2026-11-09T00:00:00Z', 9, 'Clouds'),
    at('2026-11-09T04:00:00Z', 14, 'Clear'),
    at('2026-11-09T10:00:00Z', 11, 'Clouds'),
    at('2026-11-10T04:00:00Z', 8, 'Rain'),
    at('2026-11-11T04:00:00Z', 3, 'Snow'),
  ]

  it('picks today\'s midday reading and builds the next days', () => {
    const live = summarizeForecast(LIST, 'Asia/Seoul', new Date('2026-11-08T23:30:00Z'))!
    expect(live).toMatchObject({ temp: 14, feels: 12, condition: 'Clear' })
    expect(live.days.map(d => d.date)).toEqual(['2026-11-10', '2026-11-11'])
  })

  it('renders live and degraded versions', () => {
    const seoul = CITIES.find(c => c.slug === 'seoul')!
    const live = summarizeForecast(LIST, 'Asia/Seoul', new Date('2026-11-08T23:30:00Z'))
    const en = renderCityPage(seoul, 'en', live)
    expect(en).toContain('What to Wear in Seoul Today (14°C, Clear)')
    expect(en).toContain('/what-to-wear/14-degrees')
    expect(renderCityPage(seoul, 'ko', live)).toContain('오늘 서울 뭐 입지? 14도 맑음 옷차림')
    const down = renderCityPage(seoul, 'en', null)
    expect(down).toContain('Live weather is unavailable')
    expect(down).not.toMatch(/undefined|NaN/)
  })

  it('serves a city through the handler with a single forecast call', async () => {
    const urls: string[] = []
    const fetchMock = vi.fn(async (url: string) => { urls.push(url); return new Response(JSON.stringify({ list: LIST })) })
    vi.stubGlobal('fetch', fetchMock)
    const res = await handleWhatToWear(new Request('https://kstylist.cc/what-to-wear/seoul'), { OPENWEATHER_API_KEY: 'k' }, 'en', 'seoul')
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toContain('public')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(urls[0]).toContain('lat=37.5665')
  })
})

describe('handler routing', () => {
  const env = {}
  it('serves hub, degree, 404 and lowercases slugs', async () => {
    const hub = await handleWhatToWear(new Request('https://kstylist.cc/what-to-wear'), env, 'en')
    expect(hub.status).toBe(200)
    expect(hub.headers.get('Cache-Control')).toContain('private')
    expect(await hub.text()).toContain('What to wear today')

    const deg = await handleWhatToWear(new Request('https://kstylist.cc/ko/what-to-wear/minus-5-degrees'), env, 'ko', 'minus-5-degrees')
    expect(deg.status).toBe(200)
    expect(await deg.text()).toContain('-5도 옷차림')

    const missing = await handleWhatToWear(new Request('https://kstylist.cc/what-to-wear/atlantis'), env, 'en', 'atlantis')
    expect(missing.status).toBe(404)

    const upper = await handleWhatToWear(new Request('https://kstylist.cc/what-to-wear/Seoul'), env, 'en', 'Seoul')
    expect(upper.status).toBe(301)
    expect(upper.headers.get('Location')).toBe('/what-to-wear/seoul')
  })

  it('hub shows the visitor\'s local weather when Cloudflare knows the location', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ list: [{ dt: Math.floor(Date.now() / 1000), main: { temp: 6 }, weather: [{ main: 'Clouds' }] }] }))))
    const req = new Request('https://kstylist.cc/what-to-wear') as Request & { cf?: unknown }
    Object.defineProperty(req, 'cf', { value: { city: 'Busan', latitude: '35.1', longitude: '129.0', timezone: 'Asia/Seoul' } })
    const html = await (await handleWhatToWear(req, { OPENWEATHER_API_KEY: 'k' }, 'en')).text()
    expect(html).toContain('Right now near Busan: 6°C')
  })

  it('hub works without location or key', () => {
    expect(renderHubPage('ko', null)).toContain('오늘 뭐 입지?')
  })
})

describe('sitemap', () => {
  it('lists every guide page in both languages with alternates', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const xml = await (await sitemapGet({} as any)).text()
    const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1])
    expect(locs.length).toBe(1 + wtwSitemapSlugs().length * 2)
    expect(locs).toContain('https://kstylist.cc/ko/what-to-wear/15-degrees')
    expect(locs).toContain('https://kstylist.cc/what-to-wear/new-york')
    expect(new Set(locs).size).toBe(locs.length)
  })
})
