/**
 * The Edit — 주간 트렌드 에디트 페이지 (서버 렌더링, DB 불필요).
 * /edit, /edit/{slug}, /ko/edit, /ko/edit/{slug}
 */
import { escapeHtml as esc } from './daily-email'
import { EDITIONS, findPublished, publishedEditions, type Edition, type EditLang } from './edit-data'
import { editPath, renderShell, wtwPath } from './wtw-render'

const SITE = 'https://kstylist.cc'
const LOCALE: Record<EditLang, string> = { en: 'en-US', ko: 'ko-KR' }

const UI: Record<EditLang, Record<string, string>> = {
  en: {
    name: 'The Edit', home: 'Home', hubTitle: 'The Edit', kicker: 'The weekly trend edit',
    hubLede: 'One trend a week, translated into what to actually wear. Published every Monday.',
    happening: 'What is happening', wear: 'How to wear it', pieces: 'Key pieces', palette: 'The palette', skip: 'What to skip',
    her: 'On her', him: 'On him', read: 'Read the edit', earlier: 'Earlier edits', newer: 'Newer', older: 'Older',
    ctaTitle: 'See this trend on your own photo.',
    ctaBody: 'ATELIER HUE sends a weather-matched look every morning, generated on your own photo. First 7 days free.',
    ctaButton: 'Start free',
    subTitle: 'Get The Edit every Monday', subBody: 'One email a week. Unsubscribe in one click.',
    subPlaceholder: 'Your email', subButton: 'Subscribe', subOk: 'You are on the list. See you Monday.',
    subErr: 'That did not work. Please try again.',
    note: 'Based on this season\'s runway reports and trend forecasts, interpreted by the ATELIER HUE styling desk.',
    guide: 'What to wear today, by temperature', notFound: 'This edit is not available',
    notFoundBody: 'It may not be published yet. Here are the latest edits.',
  },
  ko: {
    name: '트렌드 에디트', home: '홈', hubTitle: '트렌드 에디트', kicker: '주간 트렌드 에디트',
    hubLede: '한 주에 트렌드 하나, 실제로 무엇을 입을지로 풀어드립니다. 매주 월요일 발행.',
    happening: '지금 일어나는 일', wear: '이렇게 입으세요', pieces: '핵심 아이템', palette: '이번 주 팔레트', skip: '이것만은 피하세요',
    her: '여성', him: '남성', read: '에디트 읽기', earlier: '지난 에디트', newer: '다음 글', older: '이전 글',
    ctaTitle: '이 트렌드를 내 사진에 입혀보세요.',
    ctaBody: 'ATELIER HUE가 매일 아침 날씨에 맞춘 룩을 당신의 사진으로 보내드립니다. 첫 7일 무료.',
    ctaButton: '무료로 시작하기',
    subTitle: '매주 월요일, 에디트를 메일로', subBody: '일주일에 한 통. 한 번의 클릭으로 해지할 수 있어요.',
    subPlaceholder: '이메일 주소', subButton: '구독하기', subOk: '등록됐어요. 월요일에 만나요.',
    subErr: '등록하지 못했어요. 다시 시도해주세요.',
    note: '이번 시즌 런웨이 리포트와 트렌드 전망을 바탕으로 ATELIER HUE 스타일링 팀이 해석했습니다.',
    guide: '오늘 뭐 입지? 기온별 옷차림', notFound: '볼 수 없는 에디트입니다',
    notFoundBody: '아직 발행되지 않았을 수 있어요. 최신 에디트를 확인해보세요.',
  },
}

const STYLE = `
.issue{font-size:11px;letter-spacing:.26em;text-transform:uppercase;color:var(--gold)}
.plates{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:26px 0 0}
.plates figure{margin:0}
.plates img{width:100%;height:auto;aspect-ratio:4/5;object-fit:cover;object-position:top;display:block;background:#ece9e1}
.plates figcaption{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);padding-top:8px}
.prose p{max-width:660px;margin:0 0 14px;font-size:17px;word-break:keep-all}
.steps{list-style:none;padding:0;margin:0;counter-reset:s;border-top:1px solid var(--rule)}
.steps li{counter-increment:s;display:grid;grid-template-columns:48px 1fr;gap:4px 8px;padding:18px 0;border-bottom:1px solid var(--rule)}
.steps li::before{content:counter(s,decimal-leading-zero);font-family:'Playfair Display',Georgia,serif;font-size:22px;color:var(--gold);grid-row:1/3}
.steps h3{margin:0;font-size:17px;font-weight:600;word-break:keep-all}
.steps p{margin:0;color:var(--muted);word-break:keep-all}
.swatches{display:flex;flex-wrap:wrap;gap:14px;list-style:none;padding:0;margin:0}
.swatches li{font-size:12px;color:var(--muted);text-align:center;width:72px}
.swatches span{display:block;width:72px;height:72px;border:1px solid var(--rule);margin-bottom:6px}
.pieces{margin:0;padding:0;list-style:none;columns:2;column-gap:24px}
.pieces li{padding:9px 0;border-bottom:1px solid var(--rule);break-inside:avoid;word-break:keep-all}
.skip{border-left:2px solid var(--accent);padding:4px 0 4px 16px;max-width:640px;word-break:keep-all}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:28px 20px;list-style:none;padding:0;margin:0}
.cards a{text-decoration:none;display:block}
.cards img{width:100%;height:auto;aspect-ratio:4/5;object-fit:cover;object-position:top;display:block;background:#ece9e1}
.cards h2{font-size:22px;margin:6px 0 6px}
.cards p{margin:0;color:var(--muted);font-size:14px;word-break:keep-all}
.lead{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:center;text-decoration:none}
.lead img{width:100%;height:auto;aspect-ratio:4/5;object-fit:cover;object-position:top;display:block;background:#ece9e1}
.lead h2{font-size:clamp(28px,5vw,40px);margin:8px 0 10px}
.lead p{color:var(--muted);margin:0 0 16px;word-break:keep-all}
.more{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);border-bottom:1px solid var(--accent);padding-bottom:3px}
.pager{display:flex;justify-content:space-between;gap:16px;border-top:1px solid var(--rule);padding-top:18px;font-size:14px}
.pager a{text-decoration:none;max-width:48%}
.pager small{display:block;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--gold)}
.sub{background:var(--card);border:1px solid var(--rule);padding:26px 22px;text-align:center}
.sub p{color:var(--muted);margin:0 0 16px}
.sub form{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
.sub input{font:inherit;font-size:16px;padding:12px 14px;border:1px solid rgba(26,26,26,.25);background:#fff;min-width:0;width:260px;max-width:100%}
.sub button{font:inherit;font-size:13px;letter-spacing:.16em;text-transform:uppercase;background:var(--ink);color:#F5F2E9;border:0;padding:0 22px;min-height:46px;cursor:pointer}
.sub button:disabled{opacity:.5}
.sub [role=status]{min-height:22px;margin:12px 0 0;font-size:14px;color:var(--gold)}
.fine{font-size:12px;color:var(--muted);max-width:640px}
@media (max-width:560px){.lead{grid-template-columns:1fr}.pieces{columns:1}}
`

function fmtDate(date: string, lang: EditLang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${date}T00:00:00Z`))
}

function issueLabel(e: Edition, lang: EditLang): string {
  return `No. ${String(e.no).padStart(2, '0')} · ${fmtDate(e.date, lang)}`
}

function ctaBlock(lang: EditLang, campaign: string): string {
  const ui = UI[lang]
  const href = `${SITE}/?utm_source=the_edit&utm_medium=organic&utm_campaign=${encodeURIComponent(campaign)}${lang === 'ko' ? '&lang=ko' : ''}`
  return `<section class="cta">
  <h2>${esc(ui.ctaTitle)}</h2>
  <p>${esc(ui.ctaBody)}</p>
  <a href="${href}">${esc(ui.ctaButton)}</a>
</section>`
}

/** 뉴스레터 가입 — /api/journal-subscribe 로 전송 (JS 한 조각, 실패 시 메시지) */
function subscribeBlock(lang: EditLang): string {
  const ui = UI[lang]
  const msgs = JSON.stringify({ ok: ui.subOk, err: ui.subErr }).replace(/</g, '\\u003c')
  return `<section class="sub" aria-labelledby="sub-h">
  <h2 id="sub-h">${esc(ui.subTitle)}</h2>
  <p>${esc(ui.subBody)}</p>
  <form id="edit-sub" novalidate>
    <label for="edit-email" style="position:absolute;left:-9999px">${esc(ui.subPlaceholder)}</label>
    <input id="edit-email" name="email" type="email" autocomplete="email" required placeholder="${esc(ui.subPlaceholder)}">
    <button type="submit">${esc(ui.subButton)}</button>
  </form>
  <p role="status" aria-live="polite" id="edit-sub-status"></p>
  <script>(function(){var m=${msgs},f=document.getElementById('edit-sub'),s=document.getElementById('edit-sub-status');
f.addEventListener('submit',function(e){e.preventDefault();var b=f.querySelector('button'),v=f.email.value.trim();
if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(v)){s.textContent=m.err;return}
b.disabled=true;fetch('/api/journal-subscribe',{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({email:v,lang:'${lang}',source:'the_edit'})}).then(function(r){if(!r.ok)throw 0;s.textContent=m.ok;f.reset()})
.catch(function(){s.textContent=m.err}).then(function(){b.disabled=false})})})();</script>
</section>`
}

function crumbs(lang: EditLang, e?: Edition) {
  const ui = UI[lang]
  const items = [
    { name: ui.home, url: `${SITE}/` },
    { name: ui.name, url: `${SITE}${editPath(lang)}` },
    ...(e ? [{ name: e[lang].title, url: `${SITE}${editPath(lang, e.slug)}` }] : []),
  ]
  const html = `<p class="crumbs"><a href="/">${esc(ui.home)}</a> / ${e
    ? `<a href="${editPath(lang)}">${esc(ui.name)}</a> / ${esc(e[lang].title)}`
    : esc(ui.name)}</p>`
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })),
  }
  return { html, ld }
}

export function renderEditionPage(e: Edition, lang: EditLang, now: Date = new Date()): string {
  const ui = UI[lang]
  const c = e[lang]
  const list = publishedEditions(now)
  const i = list.findIndex(x => x.slug === e.slug)
  const newer = i > 0 ? list[i - 1] : null
  const older = i >= 0 && i < list.length - 1 ? list[i + 1] : null
  const bc = crumbs(lang, e)
  const title = lang === 'ko'
    ? `${c.title} | 이번 주 트렌드 에디트 | ATELIER HUE`
    : `${c.title} | The Edit, Winter 2026 Trends | ATELIER HUE`

  const pager = newer || older
    ? `<nav class="pager" aria-label="${esc(ui.earlier)}">
  ${older ? `<a href="${editPath(lang, older.slug)}"><small>${esc(ui.older)}</small>${esc(older[lang].title)}</a>` : '<span></span>'}
  ${newer ? `<a href="${editPath(lang, newer.slug)}" style="text-align:right"><small>${esc(ui.newer)}</small>${esc(newer[lang].title)}</a>` : '<span></span>'}
</nav>`
    : ''

  const body = `${bc.html}
<article>
<p class="kicker">${esc(`${ui.kicker} · ${issueLabel(e, lang)}`)}</p>
<h1>${esc(c.title)}</h1>
<p class="lede">${esc(c.dek)}</p>
<div class="plates">
  <figure><img src="${e.images.her}" alt="${esc(`${c.title}: ${ui.her}`)}" width="800" height="1000" fetchpriority="high"><figcaption>${esc(ui.her)}</figcaption></figure>
  <figure><img src="${e.images.him}" alt="${esc(`${c.title}: ${ui.him}`)}" width="800" height="1000"><figcaption>${esc(ui.him)}</figcaption></figure>
</div>
<section class="prose" aria-labelledby="t-h">
  <h2 id="t-h">${esc(ui.happening)}</h2>
  ${c.trend.map(p => `<p>${esc(p)}</p>`).join('\n  ')}
</section>
<section aria-labelledby="w-h">
  <h2 id="w-h">${esc(ui.wear)}</h2>
  <ol class="steps">
    ${c.wear.map(w => `<li><h3>${esc(w.h)}</h3><p>${esc(w.p)}</p></li>`).join('\n    ')}
  </ol>
</section>
<section aria-labelledby="p-h">
  <h2 id="p-h">${esc(ui.palette)}</h2>
  <ul class="swatches">
    ${e.palette.map(s => `<li><span style="background:${s.hex}"></span>${esc(s[lang])}</li>`).join('\n    ')}
  </ul>
</section>
<section aria-labelledby="k-h">
  <h2 id="k-h">${esc(ui.pieces)}</h2>
  <ul class="pieces">
    ${c.pieces.map(p => `<li>${esc(p)}</li>`).join('\n    ')}
  </ul>
</section>
<section aria-labelledby="s-h">
  <h2 id="s-h">${esc(ui.skip)}</h2>
  <p class="skip">${esc(c.skip)}</p>
</section>
<p class="fine">${esc(ui.note)}</p>
</article>
${ctaBlock(lang, e.slug)}
${subscribeBlock(lang)}
<section>${pager}
  <p style="margin-top:22px"><a class="more" href="${wtwPath(lang)}">${esc(ui.guide)}</a></p>
</section>`

  return renderShell({
    lang, slug: e.slug, title, description: c.dek.slice(0, 160), body,
    pathFor: editPath, ogImage: e.images.her, extraStyle: STYLE,
    jsonLd: [
      bc.ld,
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: c.title,
        description: c.dek,
        datePublished: e.date,
        dateModified: e.date,
        inLanguage: lang,
        image: [`${SITE}${e.images.her}`, `${SITE}${e.images.him}`],
        author: { '@type': 'Organization', name: 'ATELIER HUE', url: SITE },
        publisher: { '@type': 'Organization', name: 'ATELIER HUE', url: SITE },
        mainEntityOfPage: `${SITE}${editPath(lang, e.slug)}`,
      },
    ],
  })
}

function hubBody(lang: EditLang, now: Date): string {
  const ui = UI[lang]
  const list = publishedEditions(now)
  const [lead, ...rest] = list
  if (!lead) return `<p class="lede">${esc(ui.hubLede)}</p>`
  return `<a class="lead" href="${editPath(lang, lead.slug)}">
  <img src="${lead.images.her}" alt="${esc(lead[lang].title)}" width="800" height="1000" fetchpriority="high">
  <div>
    <span class="issue">${esc(issueLabel(lead, lang))}</span>
    <h2>${esc(lead[lang].title)}</h2>
    <p>${esc(lead[lang].dek)}</p>
    <span class="more">${esc(ui.read)}</span>
  </div>
</a>
${rest.length ? `<section aria-labelledby="e-h">
  <h2 id="e-h">${esc(ui.earlier)}</h2>
  <ul class="cards">
    ${rest.map(e => `<li><a href="${editPath(lang, e.slug)}">
      <img src="${e.images.her}" alt="${esc(e[lang].title)}" width="800" height="1000" loading="lazy" decoding="async">
      <span class="issue">${esc(issueLabel(e, lang))}</span>
      <h2>${esc(e[lang].title)}</h2>
      <p>${esc(e[lang].dek)}</p>
    </a></li>`).join('\n    ')}
  </ul>
</section>` : ''}`
}

export function renderEditHub(lang: EditLang, now: Date = new Date()): string {
  const ui = UI[lang]
  const bc = crumbs(lang)
  const title = lang === 'ko'
    ? '트렌드 에디트: 매주 한 가지 트렌드, 입는 법까지 | ATELIER HUE'
    : 'The Edit: One Trend a Week, and How to Wear It | ATELIER HUE'
  const body = `${bc.html}
<p class="kicker">${esc(ui.kicker)}</p>
<h1>${esc(ui.hubTitle)}</h1>
<p class="lede">${esc(ui.hubLede)}</p>
${hubBody(lang, now)}
${subscribeBlock(lang)}
${ctaBlock(lang, 'hub')}`
  return renderShell({
    lang, slug: '', title, description: ui.hubLede, body,
    pathFor: editPath, ogImage: publishedEditions(now)[0]?.images.her, extraStyle: STYLE, jsonLd: [bc.ld],
  })
}

function renderEditNotFound(lang: EditLang, now: Date): string {
  const ui = UI[lang]
  const body = `<p class="kicker">404</p>
<h1>${esc(ui.notFound)}</h1>
<p class="lede">${esc(ui.notFoundBody)}</p>
${hubBody(lang, now)}`
  return renderShell({
    lang, slug: '', title: `${ui.notFound} | ATELIER HUE`, description: ui.notFoundBody, body,
    pathFor: editPath, extraStyle: STYLE, jsonLd: [],
  })
}

function html(body: string, status: number, cache: string): Response {
  return new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': cache } })
}

export function handleEdit(lang: EditLang, slug?: string, now: Date = new Date()): Response {
  if (!slug) return html(renderEditHub(lang, now), 200, 'public, max-age=1800')
  const lower = slug.toLowerCase()
  if (lower !== slug) return new Response(null, { status: 301, headers: { Location: editPath(lang, lower) } })
  const e = findPublished(slug, now)
  if (e) return html(renderEditionPage(e, lang, now), 200, 'public, max-age=1800')
  // 아직 발행 전인 에디션은 존재를 드러내지 않고, 캐시도 짧게 (발행일에 바로 열리도록)
  return html(renderEditNotFound(lang, now), 404, 'public, max-age=300')
}

/** 사이트맵용 — 발행된 에디션만 */
export function editSitemapEntries(now: Date = new Date()): Array<{ slug: string; lastmod: string }> {
  const list = publishedEditions(now)
  return [{ slug: '', lastmod: list[0]?.date || EDITIONS[0].date }, ...list.map(e => ({ slug: e.slug, lastmod: e.date }))]
}
