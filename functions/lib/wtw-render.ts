/**
 * "오늘 뭐 입지" 검색 페이지 — 서버 렌더링 HTML.
 *
 * SPA(해시 라우팅)는 검색엔진이 내용을 색인하지 못한다. 이 페이지들은 실제 경로
 * (/what-to-wear/..., /ko/what-to-wear/...)에서 완성된 HTML을 내려준다.
 * 기온 페이지는 정적이고, 도시 페이지는 실시간 날씨를 엣지에 30분 캐시한다.
 */
import { conditionLabel, escapeHtml as esc } from './daily-email'
import { aggregateForecast, localNow, localParts, type DayForecast } from './sunday-edition'
import {
  BANDS, CITIES, DEGREE_MAX, DEGREE_MIN,
  allDegrees, bandFor, degreeSlug, neighbourBands, parseDegreeSlug, toF,
  type Band, type City, type WtwLang,
} from './wtw-data'

const SITE = 'https://kstylist.cc'
const LOCALE: Record<WtwLang, string> = { en: 'en-US', ko: 'ko-KR' }

export interface WtwEnv {
  OPENWEATHER_API_KEY?: string
}

// ─── URLs ────────────────────────────────────────────────────────

export function wtwPath(lang: WtwLang, slug = ''): string {
  const base = lang === 'ko' ? '/ko/what-to-wear' : '/what-to-wear'
  return slug ? `${base}/${slug}` : base
}

function abs(path: string): string {
  return `${SITE}${path}`
}

function ctaUrl(lang: WtwLang, campaign: string): string {
  return `${SITE}/?utm_source=what_to_wear&utm_medium=organic&utm_campaign=${encodeURIComponent(campaign)}${lang === 'ko' ? '&lang=ko' : ''}`
}

/** 기온 구간을 대표하는 기온 (구간표 링크용) */
function bandAnchor(b: Band): number {
  const lo = Math.max(b.min, DEGREE_MIN)
  const hi = Math.min(b.max, DEGREE_MAX)
  return Math.round((lo + hi) / 2)
}

function bandRange(b: Band, lang: WtwLang): string {
  const u = lang === 'ko' ? '도' : '°C'
  if (b.max === Infinity) return lang === 'ko' ? `${b.min}도 이상` : `${b.min}°C and above`
  if (b.min === -Infinity) return lang === 'ko' ? '영하' : 'Below 0°C'
  return `${b.min}–${b.max}${u}`
}

// ─── Copy ────────────────────────────────────────────────────────

const UI: Record<WtwLang, Record<string, string>> = {
  en: {
    hub: 'What to wear', home: 'Home', formula: 'The formula', outer: 'Outer layer', top: 'Top', bottom: 'Bottom',
    shoes: 'Shoes', extra: 'Extras', fabrics: 'Fabrics', palette: 'Palette', layers: 'Layers',
    chart: 'Outfits by temperature', chartLede: 'Every range, from the outer layer down to the shoes.',
    degrees: 'Other temperatures', cities: 'What to wear today, by city', styledFor: 'Styled for',
    ctaTitle: 'Get this every morning, for your city, on your own photo.',
    ctaBody: 'ATELIER HUE sends a weather-matched look at 7am, generated on your own photo. First 7 days free.',
    ctaButton: 'Start free', switchLang: '한국어', fullGuide: 'Full guide for', nextDays: 'The next five days',
    liveDown: 'Live weather is unavailable right now. Pick today\'s temperature below for the full outfit.',
    nearYou: 'Right now near', feels: 'feels like', midday: 'Midday',
    notFound: 'That page does not exist', notFoundBody: 'Pick a temperature or a city below.',
    exactly: 'At exactly',
  },
  ko: {
    hub: '오늘 뭐 입지', home: '홈', formula: '오늘의 공식', outer: '아우터', top: '상의', bottom: '하의',
    shoes: '신발', extra: '포인트', fabrics: '소재', palette: '컬러', layers: '레이어',
    chart: '기온별 옷차림', chartLede: '구간별로 아우터부터 신발까지 정리했어요.',
    degrees: '다른 기온 보기', cities: '도시별 오늘 옷차림', styledFor: '추천 스타일:',
    ctaTitle: '매일 아침, 내 도시 날씨에 맞춰, 내 사진으로.',
    ctaBody: 'ATELIER HUE가 매일 아침 7시, 날씨에 맞춘 룩을 당신의 사진으로 보내드립니다. 첫 7일 무료.',
    ctaButton: '무료로 시작하기', switchLang: 'English', fullGuide: '자세한 옷차림:', nextDays: '앞으로 5일',
    liveDown: '지금은 실시간 날씨를 불러올 수 없어요. 아래에서 오늘 기온을 골라 옷차림을 확인하세요.',
    nearYou: '지금', feels: '체감', midday: '한낮',
    notFound: '없는 페이지입니다', notFoundBody: '아래에서 기온이나 도시를 골라주세요.',
    exactly: '정확히',
  },
}

function deg(c: number, lang: WtwLang): string {
  return lang === 'ko' ? `${c}도` : `${c}°C`
}

function positionNote(c: number, band: Band, lang: WtwLang): string {
  const { colder, warmer } = neighbourBands(band)
  if (colder && c <= band.min + 1 && band.min !== -Infinity) {
    return lang === 'ko'
      ? `이 구간에서 추운 쪽이에요. 바람이 불거나 밤늦게까지 밖에 있다면 '${colder.ko.name}' 구간의 아우터를 빌려오세요.`
      : `You are at the cold end of this range. If it is windy or you will be out after dark, borrow the outer layer from the ${colder.en.name.toLowerCase()} guide.`
  }
  if (warmer && c >= band.max - 1 && band.max !== Infinity) {
    return lang === 'ko'
      ? `이 구간에서 따뜻한 쪽이에요. 햇볕이 좋다면 '${warmer.ko.name}' 구간의 가벼운 상의로 충분합니다.`
      : `You are at the warm end of this range. In full sun, the lighter top from the ${warmer.en.name.toLowerCase()} guide is enough.`
  }
  return lang === 'ko'
    ? '이 구간의 한가운데예요. 아래 공식 그대로 입으면 됩니다.'
    : 'Squarely in the middle of this range: the formula above works as written.'
}

function swingNote(c: number, lang: WtwLang): string {
  const morning = c - 5
  const mb = bandFor(morning)
  return lang === 'ko'
    ? `아침 기온이 ${morning}도 안팎이라면 출근길엔 '${mb.ko.name}' 구간의 아우터가 필요하고, 오후에 ${c + 3}도까지 오르면 벗게 됩니다.`
    : `If the morning sits around ${morning}°C, start with the outer layer from the ${mb.en.name.toLowerCase()} guide; by an afternoon near ${c + 3}°C you will want it off.`
}

function rainNote(c: number, lang: WtwLang): string {
  return lang === 'ko'
    ? `${c}도에 비가 온다면: 아우터를 방수 소재로 바꾸고, 가죽이나 고무 밑창 신발을 고르세요.`
    : `If it rains at ${c}°C: swap the outer layer for a water-resistant one and choose leather or rubber-soled shoes.`
}

// ─── Shell ───────────────────────────────────────────────────────

const STYLE = `
:root{--bg:#FAFAF8;--ink:#1A1A1A;--muted:#5A5852;--gold:#8D7442;--accent:#C9A962;--rule:rgba(26,26,26,.1);--card:#fff}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:Manrope,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:inherit}
.wrap{max-width:880px;margin:0 auto;padding:0 16px}
.top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 0;border-bottom:1px solid var(--rule)}
.brand{font-family:'Playfair Display',Georgia,serif;letter-spacing:.32em;font-size:14px;color:var(--gold);text-decoration:none}
.top nav{display:flex;gap:16px;align-items:center;font-size:13px}
.top nav a{text-decoration:none;color:var(--muted)}
.top nav a:hover{color:var(--ink)}
.crumbs{font-size:12px;color:var(--muted);margin:18px 0 0}
.crumbs a{text-decoration:none}
.kicker{font-size:11px;letter-spacing:.26em;text-transform:uppercase;color:var(--gold);margin:28px 0 10px}
h1{font-family:'Playfair Display',Georgia,serif;font-weight:500;font-size:clamp(30px,6vw,46px);line-height:1.15;margin:0 0 14px;word-break:keep-all;text-wrap:balance}
h2{font-family:'Playfair Display',Georgia,serif;font-weight:500;font-size:clamp(22px,4vw,28px);margin:0 0 14px;word-break:keep-all}
.lede{font-size:18px;color:var(--ink);max-width:640px;margin:0 0 18px;word-break:keep-all}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 8px;padding:0;list-style:none}
.chips li{font-size:12px;letter-spacing:.06em;border:1px solid var(--rule);background:var(--card);padding:6px 12px}
section{margin:44px 0}
.formula dl{display:grid;grid-template-columns:minmax(90px,140px) 1fr;margin:0;border-top:1px solid var(--rule)}
.formula dt,.formula dd{margin:0;padding:13px 0;border-bottom:1px solid var(--rule)}
.formula dt{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);padding-right:12px}
.formula dd{word-break:keep-all}
.meta{color:var(--muted);font-size:15px;margin:14px 0 0;word-break:keep-all}
.duo{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:0}
.duo img{width:100%;height:auto;aspect-ratio:4/5;object-fit:cover;display:block;background:#ece9e1}
.duo figcaption{grid-column:1/-1;font-size:12px;color:var(--muted);letter-spacing:.06em}
.notes p{margin:0 0 12px;max-width:680px;word-break:keep-all}
.live{display:flex;align-items:baseline;gap:16px;flex-wrap:wrap;margin:6px 0 16px}
.live .t{font-family:'Playfair Display',Georgia,serif;font-size:64px;line-height:1}
.live .d{color:var(--muted);font-size:15px}
.near{background:var(--card);border:1px solid var(--rule);padding:18px 20px}
.near a{color:var(--gold)}
table{width:100%;border-collapse:collapse}
th,td{text-align:left;padding:11px 8px 11px 0;border-bottom:1px solid var(--rule);vertical-align:top;font-size:14px}
th{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);font-weight:600}
tr.on td{background:#f3efe4}
th:nth-child(-n+2),td:nth-child(-n+2){white-space:nowrap;padding-right:14px}
td a{text-decoration:none;border-bottom:1px solid var(--accent)}
.grid{display:flex;flex-wrap:wrap;gap:8px;list-style:none;padding:0;margin:0}
.grid a{display:inline-block;min-width:44px;text-align:center;text-decoration:none;border:1px solid var(--rule);background:var(--card);padding:9px 12px;font-size:13px}
.grid a:hover,.grid a[aria-current]{border-color:var(--accent)}
.grid a[aria-current]{background:#f3efe4}
.cta{background:#101018;color:#F5F2E9;padding:32px 24px;text-align:center}
.cta h2{color:#F5F2E9}
.cta p{color:#A9A497;max-width:520px;margin:0 auto 22px;word-break:keep-all}
.cta a{display:inline-block;background:var(--accent);color:#14120c;text-decoration:none;font-size:13px;letter-spacing:.18em;text-transform:uppercase;padding:15px 30px;min-height:44px}
.faq h2{font-size:22px}
footer{border-top:1px solid var(--rule);margin-top:56px;padding:24px 0 40px;font-size:12px;color:var(--muted)}
a:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
@media (max-width:560px){.formula dl{grid-template-columns:1fr}.formula dt{padding-bottom:0;border-bottom:0}.live .t{font-size:52px}}
`

interface ShellInput {
  lang: WtwLang
  slug: string
  title: string
  description: string
  jsonLd: object[]
  body: string
}

function shell(p: ShellInput): string {
  const other: WtwLang = p.lang === 'en' ? 'ko' : 'en'
  const ui = UI[p.lang]
  const canonical = abs(wtwPath(p.lang, p.slug))
  return `<!DOCTYPE html>
<html lang="${p.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="en" href="${abs(wtwPath('en', p.slug))}">
<link rel="alternate" hreflang="ko" href="${abs(wtwPath('ko', p.slug))}">
<link rel="alternate" hreflang="x-default" href="${abs(wtwPath('en', p.slug))}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="ATELIER HUE">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#FAFAF8">
<link rel="icon" href="/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600&family=Playfair+Display:wght@500&display=swap" rel="stylesheet">
<style>${STYLE}</style>
${p.jsonLd.map(j => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
<script async src="https://www.googletagmanager.com/gtag/js?id=G-42DC8CJX3E"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-42DC8CJX3E');</script>
</head>
<body>
<div class="wrap">
<header class="top">
  <a class="brand" href="/">ATELIER HUE</a>
  <nav aria-label="${p.lang === 'ko' ? '사이트' : 'Site'}">
    <a href="${wtwPath(p.lang)}">${esc(ui.hub)}</a>
    <a href="/#journal">${p.lang === 'ko' ? '저널' : 'Journal'}</a>
    <a href="${wtwPath(other, p.slug)}" hreflang="${other}" lang="${other}">${esc(ui.switchLang)}</a>
  </nav>
</header>
<main>
${p.body}
</main>
<footer>ATELIER HUE · <a href="/">kstylist.cc</a> · <a href="${wtwPath(p.lang)}">${esc(ui.hub)}</a></footer>
</div>
</body>
</html>`
}

function breadcrumbs(lang: WtwLang, last?: { name: string; slug: string }) {
  const ui = UI[lang]
  const items = [
    { name: ui.home, url: `${SITE}/` },
    { name: ui.hub, url: abs(wtwPath(lang)) },
    ...(last ? [{ name: last.name, url: abs(wtwPath(lang, last.slug)) }] : []),
  ]
  const html = `<p class="crumbs"><a href="/">${esc(ui.home)}</a> / ${last
    ? `<a href="${wtwPath(lang)}">${esc(ui.hub)}</a> / ${esc(last.name)}`
    : esc(ui.hub)}</p>`
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })),
  }
  return { html, ld }
}

// ─── Shared blocks ───────────────────────────────────────────────

function formulaBlock(band: Band, lang: WtwLang): string {
  const c = band[lang]
  const ui = UI[lang]
  return `<section class="formula" aria-labelledby="formula-h">
  <h2 id="formula-h">${esc(ui.formula)}</h2>
  <dl>
    <dt>${esc(ui.outer)}</dt><dd>${esc(c.outer)}</dd>
    <dt>${esc(ui.top)}</dt><dd>${esc(c.top)}</dd>
    <dt>${esc(ui.bottom)}</dt><dd>${esc(c.bottom)}</dd>
    <dt>${esc(ui.shoes)}</dt><dd>${esc(c.shoes)}</dd>
    <dt>${esc(ui.extra)}</dt><dd>${esc(c.extra)}</dd>
  </dl>
  <p class="meta"><strong>${esc(ui.fabrics)}.</strong> ${esc(c.fabrics)}</p>
  <p class="meta"><strong>${esc(ui.palette)}.</strong> ${esc(c.palette)}</p>
</section>`
}

function duoBlock(band: Band, lang: WtwLang): string {
  const name = band[lang].name
  return `<figure class="duo">
  <img src="${band.images[0]}" alt="${esc(`${UI[lang].styledFor} ${name}`)}" width="800" height="1000" loading="lazy" decoding="async">
  <img src="${band.images[1]}" alt="${esc(`${UI[lang].styledFor} ${name}`)}" width="800" height="1000" loading="lazy" decoding="async">
  <figcaption>${esc(`${UI[lang].styledFor} ${name} · ${bandRange(band, lang)}`)}</figcaption>
</figure>`
}

function chartBlock(lang: WtwLang, current?: Band): string {
  const ui = UI[lang]
  return `<section aria-labelledby="chart-h">
  <h2 id="chart-h">${esc(ui.chart)}</h2>
  <p class="meta">${esc(ui.chartLede)}</p>
  <table>
    <thead><tr><th>${lang === 'ko' ? '기온' : 'Temperature'}</th><th>${lang === 'ko' ? '날씨' : 'Feels'}</th><th>${esc(ui.outer)}</th></tr></thead>
    <tbody>
    ${BANDS.map(b => `<tr${b === current ? ' class="on"' : ''}>
      <td><a href="${wtwPath(lang, degreeSlug(bandAnchor(b)))}">${esc(bandRange(b, lang))}</a></td>
      <td>${esc(b[lang].name)}</td>
      <td>${esc(b[lang].outer)}</td>
    </tr>`).join('')}
    </tbody>
  </table>
</section>`
}

function degreeGrid(lang: WtwLang, current?: number): string {
  return `<section aria-labelledby="deg-h">
  <h2 id="deg-h">${esc(UI[lang].degrees)}</h2>
  <ul class="grid">
    ${allDegrees().map(c => `<li><a href="${wtwPath(lang, degreeSlug(c))}"${c === current ? ' aria-current="page"' : ''}>${esc(deg(c, lang))}</a></li>`).join('')}
  </ul>
</section>`
}

function cityGrid(lang: WtwLang, current?: string): string {
  return `<section aria-labelledby="city-h">
  <h2 id="city-h">${esc(UI[lang].cities)}</h2>
  <ul class="grid">
    ${CITIES.map(c => `<li><a href="${wtwPath(lang, c.slug)}"${c.slug === current ? ' aria-current="page"' : ''}>${esc(c[lang])}</a></li>`).join('')}
  </ul>
</section>`
}

function ctaBlock(lang: WtwLang, campaign: string): string {
  const ui = UI[lang]
  return `<section class="cta">
  <h2>${esc(ui.ctaTitle)}</h2>
  <p>${esc(ui.ctaBody)}</p>
  <a href="${ctaUrl(lang, campaign)}">${esc(ui.ctaButton)}</a>
</section>`
}

// ─── Pages ───────────────────────────────────────────────────────

export function renderDegreePage(c: number, lang: WtwLang): string {
  const band = bandFor(c)
  const bc = band[lang]
  const ui = UI[lang]
  const f = toF(c)
  const slug = degreeSlug(c)
  const title = lang === 'ko'
    ? `${c}도 옷차림, 오늘 뭐 입지? | ATELIER HUE`
    : `What to Wear in ${c}°C (${f}°F) Weather | ATELIER HUE`
  const description = (lang === 'ko'
    ? `${c}도는 '${bc.name}' 날씨예요. ${bc.verdict} 아우터: ${bc.outer}. 상의: ${bc.top}.`
    : `${c}°C (${f}°F) is ${bc.name.toLowerCase()} weather. ${bc.verdict} Outer layer: ${bc.outer}. Top: ${bc.top}.`
  ).slice(0, 160)
  const question = lang === 'ko' ? `${c}도는 추운 날씨인가요?` : `Is ${c}°C cold?`
  const crumbs = breadcrumbs(lang, { name: deg(c, lang), slug })

  const body = `${crumbs.html}
<p class="kicker">${lang === 'ko' ? `기온별 옷차림 · ${c}도 · ${f}°F` : `Outfit guide · ${c}°C · ${f}°F`}</p>
<h1>${lang === 'ko' ? `${c}도 옷차림` : `What to wear in ${c}°C (${f}°F) weather`}</h1>
<p class="lede">${esc(bc.verdict)}</p>
<ul class="chips"><li>${esc(bc.name)}</li><li>${esc(ui.layers)}: ${esc(bc.layers)}</li><li>${esc(bandRange(band, lang))}</li></ul>
${formulaBlock(band, lang)}
${duoBlock(band, lang)}
<section class="notes" aria-labelledby="exact-h">
  <h2 id="exact-h">${esc(`${ui.exactly} ${deg(c, lang)}`)}</h2>
  <p>${esc(positionNote(c, band, lang))}</p>
  <p>${esc(swingNote(c, lang))}</p>
  <p>${esc(rainNote(c, lang))}</p>
  <p>${esc(bc.note)}</p>
</section>
<section class="faq" aria-labelledby="faq-h">
  <h2 id="faq-h">${esc(question)}</h2>
  <p>${esc(bc.isCold)}</p>
</section>
${ctaBlock(lang, slug)}
${chartBlock(lang, band)}
${degreeGrid(lang, c)}
${cityGrid(lang)}`

  return shell({
    lang, slug, title, description, body,
    jsonLd: [
      crumbs.ld,
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [{ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: `${bc.isCold} ${bc.verdict}` } }],
      },
    ],
  })
}

export interface LiveWeather {
  temp: number
  feels: number
  condition: string
  days: DayForecast[]
}

function formatLocalDate(tz: string, lang: WtwLang, now = new Date()): string {
  try {
    return new Intl.DateTimeFormat(LOCALE[lang], { weekday: 'long', month: 'long', day: 'numeric', timeZone: tz }).format(now)
  } catch {
    return ''
  }
}

function weekdayShort(date: string, lang: WtwLang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${date}T00:00:00Z`))
}

export function renderCityPage(city: City, lang: WtwLang, live: LiveWeather | null, now = new Date()): string {
  const ui = UI[lang]
  const name = city[lang]
  const band = live ? bandFor(live.temp) : null
  const cond = live ? conditionLabel(live.condition, lang) : ''
  const title = lang === 'ko'
    ? `오늘 ${name} 뭐 입지?${live ? ` ${live.temp}도 ${cond} 옷차림` : ' 날씨별 옷차림'} | ATELIER HUE`
    : `What to Wear in ${name} Today${live ? ` (${live.temp}°C, ${cond})` : ''} | ATELIER HUE`
  const description = (live && band
    ? (lang === 'ko'
      ? `오늘 ${name}은 한낮 ${live.temp}도, ${cond}. ${band.ko.verdict} 아우터: ${band.ko.outer}.`
      : `${name} today: ${live.temp}°C (${toF(live.temp)}°F) at midday, ${cond.toLowerCase()}. ${band.en.verdict} Outer layer: ${band.en.outer}.`)
    : (lang === 'ko'
      ? `${name}의 오늘 날씨에 맞는 옷차림을 아우터부터 신발까지 알려드려요.`
      : `What to wear in ${name} today, from the outer layer down to the shoes.`)
  ).slice(0, 160)
  const crumbs = breadcrumbs(lang, { name, slug: city.slug })

  const liveHtml = live && band
    ? `<div class="live">
  <span class="t">${live.temp}&deg;</span>
  <span class="d">${esc(`${toF(live.temp)}°F · ${cond} · ${ui.feels} ${live.feels}° · ${ui.midday}`)}</span>
</div>
<p class="lede">${esc(band[lang].verdict)}</p>
<ul class="chips"><li>${esc(band[lang].name)}</li><li>${esc(ui.layers)}: ${esc(band[lang].layers)}</li></ul>
${formulaBlock(band, lang)}
<p><a href="${wtwPath(lang, degreeSlug(Math.max(DEGREE_MIN, Math.min(DEGREE_MAX, live.temp))))}">${esc(`${ui.fullGuide} ${deg(live.temp, lang)}`)}</a></p>
${duoBlock(band, lang)}
${live.days.length ? `<section aria-labelledby="days-h">
  <h2 id="days-h">${esc(ui.nextDays)}</h2>
  <table>
    <tbody>
    ${live.days.map(d => {
      const b = bandFor(d.high)
      return `<tr>
      <td>${esc(weekdayShort(d.date, lang))}</td>
      <td>${esc(conditionLabel(d.condition, lang))}</td>
      <td>${d.high}&deg; / ${d.low}&deg;</td>
      <td><a href="${wtwPath(lang, degreeSlug(Math.max(DEGREE_MIN, Math.min(DEGREE_MAX, d.high))))}">${esc(b[lang].name)}</a></td>
    </tr>`
    }).join('')}
    </tbody>
  </table>
</section>` : ''}`
    : `<p class="lede">${esc(ui.liveDown)}</p>`

  const body = `${crumbs.html}
<p class="kicker">${esc(`${lang === 'ko' ? '오늘의' : 'Today in'} ${name}${formatLocalDate(city.tz, lang, now) ? ` · ${formatLocalDate(city.tz, lang, now)}` : ''}`)}</p>
<h1>${esc(lang === 'ko' ? `오늘 ${name} 뭐 입지?` : `What to wear in ${name} today`)}</h1>
${liveHtml}
${ctaBlock(lang, city.slug)}
${chartBlock(lang, band || undefined)}
${cityGrid(lang, city.slug)}`

  return shell({
    lang, slug: city.slug, title, description, body,
    jsonLd: [crumbs.ld],
  })
}

export function renderHubPage(lang: WtwLang, near: { city: string; temp: number } | null): string {
  const ui = UI[lang]
  const title = lang === 'ko'
    ? '오늘 뭐 입지? 기온별 옷차림 총정리 | ATELIER HUE'
    : 'What to Wear Today: Outfits by Temperature and City | ATELIER HUE'
  const description = lang === 'ko'
    ? '오늘 기온이나 도시를 고르면 아우터부터 신발까지 무엇을 입을지 알려드려요. 영하부터 35도까지 기온별 옷차림 공식.'
    : 'Pick today\'s temperature or your city and get the exact outfit, from the outer layer down to the shoes. Every range from below freezing to 35°C.'
  const crumbs = breadcrumbs(lang)
  const nearHtml = near
    ? (() => {
        const b = bandFor(near.temp)
        const clamped = Math.max(DEGREE_MIN, Math.min(DEGREE_MAX, near.temp))
        return `<p class="near">${esc(`${ui.nearYou} ${near.city}: ${deg(near.temp, lang)} · ${b[lang].name}. ${b[lang].verdict}`)}
  <a href="${wtwPath(lang, degreeSlug(clamped))}">${esc(`${ui.fullGuide} ${deg(near.temp, lang)}`)}</a></p>`
      })()
    : ''

  const body = `${crumbs.html}
<p class="kicker">${lang === 'ko' ? 'ATELIER HUE 옷차림 가이드' : 'The ATELIER HUE outfit guide'}</p>
<h1>${lang === 'ko' ? '오늘 뭐 입지?' : 'What to wear today'}</h1>
<p class="lede">${lang === 'ko'
    ? '오늘 기온이나 도시를 고르면, 아우터부터 신발까지 무엇을 입을지 알려드려요.'
    : 'Pick today\'s temperature or your city, and we will tell you exactly what to wear, from the outer layer down to the shoes.'}</p>
${nearHtml}
${chartBlock(lang)}
${degreeGrid(lang)}
${cityGrid(lang)}
${ctaBlock(lang, 'hub')}`

  return shell({ lang, slug: '', title, description, body, jsonLd: [crumbs.ld] })
}

export function renderNotFoundPage(lang: WtwLang): string {
  const ui = UI[lang]
  const body = `<p class="kicker">404</p>
<h1>${esc(ui.notFound)}</h1>
<p class="lede">${esc(ui.notFoundBody)}</p>
${chartBlock(lang)}
${cityGrid(lang)}`
  return shell({ lang, slug: '', title: `${ui.notFound} | ATELIER HUE`, description: ui.notFoundBody, body, jsonLd: [] })
}

// ─── Live weather (edge-cached) ──────────────────────────────────

interface ForecastItem {
  dt: number
  main: { temp: number; feels_like?: number; temp_max?: number; temp_min?: number }
  weather: Array<{ main: string }>
}

export function summarizeForecast(list: ForecastItem[], tz: string, now = new Date()): LiveWeather | null {
  if (!list.length) return null
  const today = localNow(tz, now).date
  const todays = list.filter(e => localParts(e.dt, tz).date === today)
  const pool = todays.length ? todays : list.slice(0, 1)
  const pick = pool.reduce((best, e) =>
    Math.abs(localParts(e.dt, tz).hour - 13) < Math.abs(localParts(best.dt, tz).hour - 13) ? e : best
  )
  return {
    temp: Math.round(pick.main.temp),
    feels: Math.round(pick.main.feels_like ?? pick.main.temp),
    condition: pick.weather[0]?.main || 'Clear',
    days: aggregateForecast(list, tz, today, 5),
  }
}

export async function fetchLiveWeather(lat: number, lon: number, tz: string, apiKey: string | undefined): Promise<LiveWeather | null> {
  if (!apiKey) return null
  const key = `https://kstylist.cc/__wtw-weather?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}&tz=${encodeURIComponent(tz)}`
  const cache = typeof caches !== 'undefined' ? (caches as unknown as { default: Cache }).default : null
  try {
    const hit = cache ? await cache.match(key) : null
    if (hit) return await hit.json() as LiveWeather
  } catch { /* 캐시는 최적화일 뿐 */ }

  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&cnt=40&appid=${apiKey}`)
    if (!res.ok) return null
    const data = await res.json() as { list?: ForecastItem[] }
    const live = summarizeForecast(data.list || [], tz)
    if (live && cache) {
      try {
        await cache.put(key, new Response(JSON.stringify(live), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=1800' },
        }))
      } catch { /* ignore */ }
    }
    return live
  } catch {
    return null
  }
}

// ─── Request handler ─────────────────────────────────────────────

interface CfGeo { city?: string; latitude?: string; longitude?: string; timezone?: string }

function html(body: string, status: number, cacheControl: string): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': cacheControl },
  })
}

export async function handleWhatToWear(
  request: Request,
  env: WtwEnv,
  lang: WtwLang,
  slug?: string
): Promise<Response> {
  if (!slug) {
    const cf = (request as Request & { cf?: CfGeo }).cf
    let near: { city: string; temp: number } | null = null
    if (cf?.latitude && cf.longitude && cf.timezone) {
      const live = await fetchLiveWeather(Number(cf.latitude), Number(cf.longitude), cf.timezone, env.OPENWEATHER_API_KEY)
      if (live) near = { city: cf.city || (lang === 'ko' ? '내 위치' : 'you'), temp: live.temp }
    }
    // 방문자 위치에 따라 내용이 달라지므로 공유 캐시 금지
    return html(renderHubPage(lang, near), 200, 'private, max-age=0')
  }

  const lower = slug.toLowerCase()
  if (lower !== slug) {
    return new Response(null, { status: 301, headers: { Location: wtwPath(lang, lower) } })
  }

  const c = parseDegreeSlug(slug)
  if (c !== null) return html(renderDegreePage(c, lang), 200, 'public, max-age=3600')

  const city = CITIES.find(x => x.slug === slug)
  if (city) {
    const live = await fetchLiveWeather(city.lat, city.lon, city.tz, env.OPENWEATHER_API_KEY)
    return html(renderCityPage(city, lang, live), 200, 'public, max-age=900')
  }

  return html(renderNotFoundPage(lang), 404, 'public, max-age=300')
}

/** 사이트맵용 — 모든 정적·도시 경로 (언어 쌍) */
export function wtwSitemapSlugs(): string[] {
  return ['', ...allDegrees().map(degreeSlug), ...CITIES.map(c => c.slug)]
}
