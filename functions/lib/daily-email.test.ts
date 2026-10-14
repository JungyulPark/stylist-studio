import { describe, it, expect } from 'vitest'
import {
  buildDailyEmailHtml,
  buildSubject,
  fallbackStyleNote,
  neutralizeBrands,
  sanitizeStyleNote,
  styleNoteToPlainText,
  type DailyEmailInput,
  type StyleNote,
} from './daily-email'
import { getDailyLookNames, toneDisplayName } from './daily-style-scenarios'

const EMOJI = /\p{Extended_Pictographic}/u
const BRANDS = /herm[eè]s|loro piana|auralee|cucinelli|bottega|tom ford|celine|zegna|max mara|dior|the row|jil sander|louis vuitton|kelly bag/i

const NOTE: StyleNote = {
  subject: 'Porcelain sand for a clear 18° morning',
  preheader: 'And a softer casual look for the afternoon',
  greeting: 'A clear, still morning — the kind that rewards a quiet palette.',
  personal_note: 'Your grey merino knit anchors the casual look today.',
  dressy: { items: ['Oatmeal cashmere crewneck', 'Stone wool trousers'], why: 'Tonal layers lengthen the line.' },
  casual: { items: ['Grey merino knit', 'Ecru straight-leg denim'], why: 'Soft texture keeps it easy.' },
  tip: 'Match your belt to your shoes, never to your bag.',
}

function input(over: Partial<DailyEmailInput> = {}): DailyEmailInput {
  return {
    lang: 'en',
    city: 'Seoul',
    timezone: 'Asia/Seoul',
    temp: 18,
    condition: 'Clear',
    issueNo: 23,
    note: NOTE,
    looks: [
      { id: 'dressy', label: 'Dressy', name: 'Porcelain Sand', url: 'https://img/d.jpg', likeUrl: 'https://l/d', dislikeUrl: 'https://x/d', shareUrl: 'https://s/d' },
      { id: 'casual', label: 'Casual', name: 'Worn Indigo', url: 'https://img/c.jpg', likeUrl: 'https://l/c', dislikeUrl: 'https://x/c', shareUrl: 'https://s/c' },
    ],
    unsubUrl: 'https://kstylist.cc/api/unsubscribe?token=abc',
    now: new Date('2026-10-14T00:00:00Z'),
    ...over,
  }
}

describe('daily email (magazine page)', () => {
  it('names every look and carries feedback + share links', () => {
    const html = buildDailyEmailHtml(input())
    expect(html).toContain('Porcelain Sand')
    expect(html).toContain('Worn Indigo')
    expect(html).toContain('LOOK 01')
    expect(html).toContain('LOOK 02')
    expect(html).toContain('No. 23')
    for (const u of ['https://l/d', 'https://x/d', 'https://s/d', 'https://s/c']) expect(html).toContain(u)
    expect(html).toContain('Share this look')
  })

  it('contains no emoji and no pure white (dark-mode inversion trigger)', () => {
    for (const lang of ['ko', 'en', 'ja', 'zh', 'es']) {
      const html = buildDailyEmailHtml(input({ lang }))
      expect(EMOJI.test(html)).toBe(false)
      expect(html.toLowerCase()).not.toMatch(/#fff\b|#ffffff/)
      expect(html).toContain('name="color-scheme" content="dark"')
    }
  })

  it('localizes action labels in all five languages', () => {
    expect(buildDailyEmailHtml(input({ lang: 'ja' }))).toContain('好き')
    expect(buildDailyEmailHtml(input({ lang: 'zh' }))).toContain('喜欢')
    expect(buildDailyEmailHtml(input({ lang: 'es' }))).toContain('Me encanta')
    expect(buildDailyEmailHtml(input({ lang: 'ko' }))).toContain('이 룩 공유하기')
  })

  it('escapes model output — no HTML injection from the stylist note', () => {
    const evil = { ...NOTE, greeting: '<script>alert(1)</script>', tip: '"><img src=x onerror=alert(1)>' }
    const html = buildDailyEmailHtml(input({ note: evil }))
    expect(html).not.toContain('<script>alert')
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;script&gt;')
  })

  it('omits the personal block when there is nothing real to say', () => {
    const html = buildDailyEmailHtml(input({ note: { ...NOTE, personal_note: '' } }))
    expect(html).not.toContain('From your notes')
    expect(buildDailyEmailHtml(input())).toContain('From your notes')
  })

  it('still renders a clean page from the fallback note with no images', () => {
    const html = buildDailyEmailHtml(input({ note: fallbackStyleNote('Clear and 18°C today.'), looks: [] }))
    expect(html).toContain('Clear and 18°C today.')
    expect(html).not.toContain('LOOK 01')
  })
})

describe('style note sanitizing', () => {
  it('strips emoji, markdown and brand names from model output', () => {
    const note = sanitizeStyleNote({
      ...NOTE,
      greeting: '**Good morning** ☀️ — a Hermès-style calm today',
      dressy: { items: ['- Loro Piana cashmere crewneck 🧥', '• Kelly bag in cognac'], why: 'Celine-inspired lines' },
    })!
    expect(EMOJI.test(JSON.stringify(note))).toBe(false)
    expect(BRANDS.test(JSON.stringify(note))).toBe(false)
    expect(note.greeting).not.toContain('*')
    expect(note.dressy.items[0].startsWith('-')).toBe(false)
    expect(note.dressy.items[1]).toContain('top-handle bag')
  })

  it('rejects empty or malformed payloads', () => {
    expect(sanitizeStyleNote(null)).toBeNull()
    expect(sanitizeStyleNote('text')).toBeNull()
    expect(sanitizeStyleNote({ greeting: '', dressy: {}, casual: {} })).toBeNull()
  })

  it('caps item counts and lengths', () => {
    const note = sanitizeStyleNote({ ...NOTE, casual: { items: Array(10).fill('x'.repeat(300)), why: '' } })!
    expect(note.casual.items.length).toBe(6)
    expect(note.casual.items[0].length).toBe(120)
  })
})

describe('subject line', () => {
  it('uses the model subject and guarantees the temperature is in it', () => {
    expect(buildSubject(NOTE, 'en', 'Seoul', 18, 'Porcelain Sand')).toBe(NOTE.subject)
    expect(buildSubject({ ...NOTE, subject: 'Porcelain sand today' }, 'en', 'Seoul', 18, 'X')).toBe('Porcelain sand today — 18°')
  })

  it('falls back to a localized, look-named subject', () => {
    const empty = { ...NOTE, subject: '' }
    expect(buildSubject(empty, 'ko', '서울', 18, 'Porcelain Sand')).toBe('서울 18°, 오늘의 룩 Porcelain Sand')
    expect(buildSubject(empty, 'xx', 'Paris', 9, 'Worn Indigo')).toBe('Worn Indigo for Paris at 9°')
  })
})

describe('look names', () => {
  it('are stable, title-cased and never a house name', () => {
    for (const g of ['male', 'female', 'other', '']) {
      const n = getDailyLookNames(g)
      expect(n.dressy).toMatch(/^[A-Z]/)
      expect(n.casual).toMatch(/^[A-Z]/)
      expect(BRANDS.test(n.dressy + n.casual)).toBe(false)
    }
    expect(toneDisplayName('anglomania')).toBe('English Tweed')
    expect(toneDisplayName('midnight nav')).toBe('Midnight Navy')
    expect(toneDisplayName('porcelain sand')).toBe('Porcelain Sand')
  })

  it('neutralizes house names in prompts sent to the text model', () => {
    expect(BRANDS.test(neutralizeBrands('STYLING: Hermès precision — Loro Piana quiet luxury, Kelly bag'))).toBe(false)
  })
})

describe('plain-text record (dashboard + learning snapshot)', () => {
  it('keeps look names and items in the stored recommendation', () => {
    const text = styleNoteToPlainText(NOTE, [
      { id: 'dressy', label: 'Dressy', name: 'Porcelain Sand' },
      { id: 'casual', label: 'Casual', name: 'Worn Indigo' },
    ])
    expect(text).toContain('LOOK 01 · Dressy — Porcelain Sand')
    expect(text).toContain('- Oatmeal cashmere crewneck')
    expect(text).toContain(NOTE.tip)
  })
})
