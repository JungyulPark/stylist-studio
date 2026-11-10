import { describe, it, expect, vi, afterEach } from 'vitest'
import { EDITIONS, latestEdition, publishedEditions } from './edit-data'
import { editSitemapEntries, handleEdit, renderEditHub, renderEditionPage } from './edit-render'
import { buildEditEmailHtml, editEmailSubject, runEditNewsletter } from './edit-mailer'

const EMOJI = /\p{Extended_Pictographic}/u
const BRANDS = /herm[eè]s|loro piana|auralee|cucinelli|bottega|tom ford|celine|zegna|max mara|dior|the row|jil sander|louis vuitton|prada|chanel|gucci|ralph lauren|junya|uniqlo|zara|net-a-porter|harrods/i

afterEach(() => vi.unstubAllGlobals())

describe('edition data', () => {
  it('is weekly on Mondays, in order, with unique slugs', () => {
    expect(new Set(EDITIONS.map(e => e.slug)).size).toBe(EDITIONS.length)
    EDITIONS.forEach((e, i) => {
      expect(e.no).toBe(i + 1)
      expect(new Date(`${e.date}T00:00:00Z`).getUTCDay(), e.slug).toBe(1)
      if (i > 0) {
        const gap = (Date.parse(e.date) - Date.parse(EDITIONS[i - 1].date)) / 86_400_000
        expect(gap, e.slug).toBe(7)
      }
    })
  })

  it('has complete, clean copy in both languages', () => {
    for (const e of EDITIONS) {
      expect(e.palette.length).toBeGreaterThanOrEqual(4)
      for (const s of e.palette) expect(s.hex).toMatch(/^#[0-9A-F]{6}$/i)
      for (const lang of ['en', 'ko'] as const) {
        const c = e[lang]
        const all = [c.title, c.dek, ...c.trend, ...c.wear.flatMap(w => [w.h, w.p]), ...c.pieces, c.skip].join(' ')
        expect(c.dek.length, `${e.slug} ${lang} dek`).toBeLessThanOrEqual(160)
        expect(c.pieces.length).toBeGreaterThanOrEqual(4)
        expect(EMOJI.test(all), `${e.slug} ${lang}`).toBe(false)
        expect(BRANDS.test(all), `${e.slug} ${lang}`).toBe(false)
        expect(all).not.toMatch(/\d+%/) // 확인할 수 없는 수치 금지
      }
      expect(/[가-힣]/.test(e.ko.title)).toBe(true)
    }
  })

  it('publishes by date', () => {
    expect(publishedEditions(new Date('2026-11-08T23:59:00Z'))).toEqual([])
    expect(publishedEditions(new Date('2026-11-09T00:00:00Z')).map(e => e.slug)).toEqual(['quiet-but-seen'])
    expect(publishedEditions(new Date('2026-11-23T05:00:00Z')).map(e => e.no)).toEqual([3, 2, 1])
    expect(publishedEditions(new Date('2027-03-01T00:00:00Z')).length).toBe(EDITIONS.length)
    expect(latestEdition(new Date('2026-11-17T00:00:00Z'))?.slug).toBe('the-texture-season')
  })
})

describe('edit pages', () => {
  const NOW = new Date('2026-11-24T00:00:00Z') // editions 1–3 live

  it('renders a published edition with article markup and correct alternates', async () => {
    const res = handleEdit('ko', 'plum-and-berry', NOW)
    const html = await res.text()
    expect(res.status).toBe(200)
    expect(html).toContain('<h1>플럼과 베리</h1>')
    expect(html).toContain('<link rel="canonical" href="https://kstylist.cc/ko/edit/plum-and-berry">')
    expect(html).toContain('<link rel="alternate" hreflang="en" href="https://kstylist.cc/edit/plum-and-berry">')
    expect(html).toContain('"@type":"Article"')
    expect(html).toContain('"datePublished":"2026-11-23"')
    expect(html).toContain('/gallery/edit/plum-and-berry-her.webp')
    expect(html).toContain('/gallery/edit/plum-and-berry-him.webp')
    expect(html).toContain('href="/edit/plum-and-berry" hreflang="en"') // language switch keeps the article
    expect(html).toContain('the-texture-season') // older link
    expect(html).not.toContain('the-scarf-leads') // unpublished must not leak
    expect(html).not.toMatch(/undefined|NaN/)
  })

  it('hides future editions and unknown slugs', async () => {
    const future = handleEdit('en', 'knit-over-knit', NOW)
    expect(future.status).toBe(404)
    expect(await future.text()).not.toContain('Knit over knit')
    expect(handleEdit('en', 'nope', NOW).status).toBe(404)
    const upper = handleEdit('en', 'Plum-And-Berry', NOW)
    expect(upper.status).toBe(301)
    expect(upper.headers.get('Location')).toBe('/edit/plum-and-berry')
  })

  it('hub lists published editions newest first, and works before launch', () => {
    const hub = renderEditHub('en', NOW)
    expect(hub.indexOf('Plum and berry')).toBeLessThan(hub.indexOf('Quiet, but seen'))
    expect(hub).not.toContain('Checks, calmly')
    expect(renderEditHub('ko', new Date('2026-11-01T00:00:00Z'))).toContain('트렌드 에디트')
  })

  it('every edition renders in both languages', () => {
    const late = new Date('2027-02-01T00:00:00Z')
    for (const e of EDITIONS) for (const lang of ['en', 'ko'] as const) {
      const html = renderEditionPage(e, lang, late)
      expect(html).toContain(e[lang].title)
      expect(html).not.toMatch(/undefined|NaN/)
    }
  })

  it('sitemap entries cover only published editions', () => {
    expect(editSitemapEntries(NOW).map(e => e.slug)).toEqual(['', 'plum-and-berry', 'the-texture-season', 'quiet-but-seen'])
    expect(editSitemapEntries(NOW)[0].lastmod).toBe('2026-11-23')
  })
})

describe('edit newsletter', () => {
  const ENV = { SUPABASE_URL: 'https://sb', SUPABASE_SERVICE_KEY: 'k', CRON_SECRET: 's' }
  const FRESH = new Date('2026-11-10T22:00:00Z') // edition 1, one day old

  function stub(opts: { subs: unknown[]; sent?: string[]; ledgerOk?: boolean; readOk?: boolean }) {
    const posts: Array<{ actor_email: string; ref_id: string }> = []
    vi.stubGlobal('fetch', vi.fn(async (u: string, init?: RequestInit) => {
      const url = String(u)
      if (init?.method === 'POST' && url.includes('/ops_events')) {
        if (opts.ledgerOk === false) return new Response('no', { status: 500 })
        posts.push(JSON.parse(String(init.body)))
        return new Response(null, { status: 201 })
      }
      if (url.includes('journal_subscribers')) return new Response(JSON.stringify(opts.subs), { status: opts.readOk === false ? 500 : 200 })
      if (url.includes('ops_events')) return new Response(JSON.stringify((opts.sent || []).map(e => ({ actor_email: e }))))
      return new Response('[]')
    }))
    return posts
  }

  it('builds a clean bilingual email', () => {
    for (const lang of ['en', 'ko'] as const) {
      const html = buildEditEmailHtml(EDITIONS[0], lang, 'https://u')
      expect(html).toContain(EDITIONS[0][lang].title)
      expect(html).toContain('https://kstylist.cc/gallery/edit/quiet-but-seen-her.webp')
      expect(html).toContain(`https://kstylist.cc${lang === 'ko' ? '/ko' : ''}/edit/quiet-but-seen?utm_source=the_edit`)
      expect(EMOJI.test(html)).toBe(false)
      expect(html.toLowerCase()).not.toMatch(/#fff\b|#ffffff/)
    }
    expect(editEmailSubject(EDITIONS[0], 'ko')).toBe('이번 주 트렌드 에디트: 조용하게, 그러나 눈에 띄게')
  })

  it('sends this week\'s edition once per subscriber, ledger first', async () => {
    const posts = stub({ subs: [{ email: 'a@x.co', lang: 'ko' }, { email: 'B@x.co', lang: 'en' }], sent: ['b@x.co'] })
    const send = vi.fn(async () => ({}))
    const out = await runEditNewsletter(ENV, { emails: { send } }, FRESH)
    expect(out).toEqual({ edition: 'quiet-but-seen', sent: 1, failed: 0 })
    expect(send).toHaveBeenCalledTimes(1)
    expect((send.mock.calls[0] as unknown as [{ to: string; subject: string }])[0]).toMatchObject({ to: 'a@x.co', subject: '이번 주 트렌드 에디트: 조용하게, 그러나 눈에 띄게' })
    expect(posts).toEqual([{ event_type: 'journal.sent', actor_email: 'a@x.co', ref_id: 'quiet-but-seen' }])
  })

  it('never sends when the ledger cannot be written or read', async () => {
    const send = vi.fn(async () => ({}))
    stub({ subs: [{ email: 'a@x.co', lang: 'en' }, { email: 'c@x.co', lang: 'en' }], ledgerOk: false })
    expect((await runEditNewsletter(ENV, { emails: { send } }, FRESH)).sent).toBe(0)
    stub({ subs: [{ email: 'a@x.co', lang: 'en' }], readOk: false })
    expect((await runEditNewsletter(ENV, { emails: { send } }, FRESH)).sent).toBe(0)
    expect(send).not.toHaveBeenCalled()
  })

  it('stays quiet once the newest edition is stale, and before launch', async () => {
    stub({ subs: [{ email: 'a@x.co', lang: 'en' }] })
    const send = vi.fn(async () => ({}))
    const lastDate = EDITIONS[EDITIONS.length - 1].date
    const stale = new Date(Date.parse(lastDate) + 8 * 86_400_000)
    expect(await runEditNewsletter(ENV, { emails: { send } }, stale)).toEqual({ edition: null, sent: 0, failed: 0 })
    expect((await runEditNewsletter(ENV, { emails: { send } }, new Date('2026-11-01T00:00:00Z'))).edition).toBeNull()
    expect((await runEditNewsletter(ENV, null, FRESH)).sent).toBe(0)
    expect(send).not.toHaveBeenCalled()
  })
})
