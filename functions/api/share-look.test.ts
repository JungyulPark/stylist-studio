/**
 * 오늘의 룩 공유 — 얼굴 사진이 걸린 기능이라 권한 경계를 핸들러 단위로 검증한다.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { onRequestGet, onRequestPost, onRequestDelete } from './share-look'
import { onRequestGet as lookPageGet } from '../look/[id]'
import { createShareToken, createFeedbackToken, createOwnerSignature } from '../lib/feedback-token'
import { R2_DAILY_PUBLIC_BASE, renderLookPage, type LookShare } from '../lib/look-share'

const SECRET = 'test-cron-secret'
const SHARE_ID = '6f1c2b0e-8a7d-4c5e-9f00-1234567890ab'
const IMAGE_KEY = 'daily/sub-1/2026-10-14/dressy-1.jpg'

type Route = { match: (url: string, init?: RequestInit) => boolean; respond: (url: string, init?: RequestInit) => Response }
let routes: Route[] = []
let calls: Array<{ url: string; init?: RequestInit }> = []

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}
function route(match: Route['match'], respond: Route['respond']) {
  routes.push({ match, respond })
}

const SHARE_ROW: LookShare = {
  id: SHARE_ID,
  email: 'a@b.co',
  sent_date: '2026-10-14',
  scenario_id: 'dressy',
  look_name: 'Porcelain Sand',
  image_key: IMAGE_KEY,
  city: 'Seoul',
  temperature_c: 18,
  weather_condition: 'Clear',
  lang: 'en',
  view_count: 0,
  revoked_at: null,
}

const bucket = {
  get: vi.fn(async (key: string) => key === IMAGE_KEY
    ? { body: new Uint8Array([1, 2, 3]), httpMetadata: { contentType: 'image/jpeg' } }
    : null),
}

const ENV = {
  SUPABASE_URL: 'https://supabase.test',
  SUPABASE_SERVICE_KEY: 'svc',
  CRON_SECRET: SECRET,
  DAILY_IMAGES_BUCKET: bucket,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ctx(url: string, init: RequestInit = {}, params: Record<string, string> = {}): any {
  return {
    request: new Request(url, { headers: { Origin: 'https://kstylist.cc' }, ...init }),
    env: ENV,
    params,
    waitUntil: vi.fn(),
  }
}

/** 구독자 + 그날 추천 기록이 있는 정상 데이터 */
function seedHappyPath() {
  route(u => u.includes('/rest/v1/subscribers?'), () => json([{ id: 'sub-1', city: 'Seoul', preferred_language: 'en' }]))
  route(u => u.includes('/rest/v1/daily_recommendations?'), () => json([{
    subscriber_id: 'sub-1',
    temperature_c: 18,
    weather_condition: 'Clear',
    outfit_images: [{ id: 'dressy', label: 'Dressy', name: 'Porcelain Sand', url: `${R2_DAILY_PUBLIC_BASE}${IMAGE_KEY}` }],
  }]))
  route((u, i) => u.includes('/rest/v1/look_shares?on_conflict') && i?.method === 'POST', () => json([{ id: SHARE_ID }], 201))
}

beforeEach(() => {
  routes = []
  calls = []
  bucket.get.mockClear()
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    calls.push({ url, init })
    for (const r of routes) if (r.match(url, init)) return r.respond(url, init)
    return json([])
  }))
})

afterEach(() => vi.unstubAllGlobals())

describe('share from email (one click)', () => {
  it('creates the share and lands the owner on their page with an owner signature', async () => {
    seedHappyPath()
    const t = await createShareToken({ email: 'a@b.co', sentDate: '2026-10-14', scenarioId: 'dressy' }, SECRET)
    const res = await onRequestGet(ctx(`https://kstylist.cc/api/share-look?t=${encodeURIComponent(t)}`))

    expect(res.status).toBe(302)
    const loc = res.headers.get('Location')!
    expect(loc).toBe(`https://kstylist.cc/look/${SHARE_ID}?o=${await createOwnerSignature(SHARE_ID, SECRET)}`)

    const insert = calls.find(c => c.url.includes('look_shares?on_conflict'))!
    const body = JSON.parse(String(insert.init!.body))
    expect(body.image_key).toBe(IMAGE_KEY)
    expect(body.look_name).toBe('Porcelain Sand')
    expect(body.revoked_at).toBeNull()
  })

  it('refuses a feedback token or a forged token', async () => {
    seedHappyPath()
    const like = await createFeedbackToken({ email: 'a@b.co', sentDate: '2026-10-14', scenarioId: 'dressy', verdict: 'like' }, SECRET)
    for (const t of [like, 'forged.token', '']) {
      const res = await onRequestGet(ctx(`https://kstylist.cc/api/share-look?t=${encodeURIComponent(t)}`))
      expect(res.status).toBe(400)
    }
    expect(calls.some(c => c.url.includes('look_shares'))).toBe(false)
  })

  it('does not create a share when that look has no image', async () => {
    route(u => u.includes('/rest/v1/subscribers?'), () => json([{ id: 'sub-1', city: 'Seoul', preferred_language: 'en' }]))
    route(u => u.includes('/rest/v1/daily_recommendations?'), () => json([{ subscriber_id: 'sub-1', outfit_images: [] }]))
    const t = await createShareToken({ email: 'a@b.co', sentDate: '2026-10-14', scenarioId: 'dressy' }, SECRET)
    const res = await onRequestGet(ctx(`https://kstylist.cc/api/share-look?t=${encodeURIComponent(t)}`))
    expect(res.status).toBe(404)
    expect(calls.some(c => c.url.includes('look_shares'))).toBe(false)
  })
})

describe('share from dashboard', () => {
  it('requires a signed-in session', async () => {
    const res = await onRequestPost(ctx('https://kstylist.cc/api/share-look', {
      method: 'POST', body: JSON.stringify({ sent_date: '2026-10-14', scenario_id: 'dressy' }),
    }))
    expect(res.status).toBe(401)
  })

  it('shares only the signed-in user\'s own look', async () => {
    route(u => u.includes('/auth/v1/user'), () => json({ id: 'u1', email: 'a@b.co' }))
    seedHappyPath()
    const res = await onRequestPost(ctx('https://kstylist.cc/api/share-look', {
      method: 'POST',
      headers: { Origin: 'https://kstylist.cc', Authorization: 'Bearer session-jwt' },
      body: JSON.stringify({ sent_date: '2026-10-14', scenario_id: 'dressy' }),
    }))
    expect(res.status).toBe(200)
    const data = await res.json() as { url: string; owner_url: string }
    expect(data.url).toBe(`https://kstylist.cc/look/${SHARE_ID}`)
    expect(data.owner_url).toContain('?o=')
    const subLookup = calls.find(c => c.url.includes('/rest/v1/subscribers?'))!
    expect(subLookup.url).toContain(encodeURIComponent('a@b.co'))
  })
})

describe('stop sharing', () => {
  it('rejects a missing or wrong owner signature', async () => {
    const bad = await onRequestDelete(ctx(`https://kstylist.cc/api/share-look?id=${SHARE_ID}&o=nope`, { method: 'DELETE' }))
    expect(bad.status).toBe(403)
    expect(calls.some(c => c.init?.method === 'PATCH')).toBe(false)
  })

  it('revokes with the owner signature', async () => {
    route((u, i) => u.includes('look_shares?id=eq.') && i?.method === 'PATCH', () => new Response(null, { status: 204 }))
    const sig = await createOwnerSignature(SHARE_ID, SECRET)
    const res = await onRequestDelete(ctx(`https://kstylist.cc/api/share-look?id=${SHARE_ID}&o=${sig}`, { method: 'DELETE' }))
    expect(res.status).toBe(200)
    const patch = calls.find(c => c.init?.method === 'PATCH')!
    expect(JSON.parse(String(patch.init!.body)).revoked_at).toBeTruthy()
  })
})

describe('shared image + public page', () => {
  it('streams the image same-origin while shared, and 404s once revoked', async () => {
    route(u => u.includes('look_shares?id=eq.'), () => json([SHARE_ROW]))
    const ok = await onRequestGet(ctx(`https://kstylist.cc/api/share-look?img=${SHARE_ID}`))
    expect(ok.status).toBe(200)
    expect(ok.headers.get('Content-Type')).toBe('image/jpeg')

    routes = []
    route(u => u.includes('look_shares?id=eq.'), () => json([{ ...SHARE_ROW, revoked_at: '2026-10-14T10:00:00Z' }]))
    const gone = await onRequestGet(ctx(`https://kstylist.cc/api/share-look?img=${SHARE_ID}`))
    expect(gone.status).toBe(404)
  })

  it('never queries the database for a malformed id', async () => {
    const res = await onRequestGet(ctx('https://kstylist.cc/api/share-look?img=1%20or%201=1'))
    expect(res.status).toBe(404)
    expect(calls.length).toBe(0)
  })

  it('renders the public page with OG tags and noindex, counting the view', async () => {
    route(u => u.includes('look_shares?id=eq.'), () => json([SHARE_ROW]))
    const c = ctx(`https://kstylist.cc/look/${SHARE_ID}`, {}, { id: SHARE_ID })
    const res = await lookPageGet(c)
    const html = await res.text()
    expect(res.status).toBe(200)
    expect(html).toContain(`property="og:image" content="https://kstylist.cc/api/share-look?img=${SHARE_ID}"`)
    expect(html).toContain('noindex')
    expect(html).toContain('Porcelain Sand')
    expect(c.waitUntil).toHaveBeenCalledTimes(1)
  })

  it('serves a "no longer shared" page for revoked shares', async () => {
    route(u => u.includes('look_shares?id=eq.'), () => json([{ ...SHARE_ROW, revoked_at: '2026-10-14T10:00:00Z' }]))
    const res = await lookPageGet(ctx(`https://kstylist.cc/look/${SHARE_ID}`, {}, { id: SHARE_ID }))
    expect(res.status).toBe(404)
    expect(await res.text()).toContain('no longer shared')
  })

  it('escapes stored values in markup and in the embedded script data', () => {
    const html = renderLookPage({ ...SHARE_ROW, look_name: '</script><script>alert(1)</script>', city: '<b>x</b>' })
    expect(html).not.toContain('<script>alert(1)')
    expect(html).not.toContain('<b>x</b>')
  })
})
