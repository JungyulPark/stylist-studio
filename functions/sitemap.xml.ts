import { editPath, wtwPath, wtwSitemapSlugs } from './lib/wtw-render'
import { editSitemapEntries } from './lib/edit-render'

// Serve sitemap.xml directly via Functions to bypass Cloudflare edge processing.
// "오늘 뭐 입지" 페이지는 데이터에서 생성 — 페이지를 추가하면 사이트맵도 자동으로 따라온다.
const SITE = 'https://kstylist.cc'
const LASTMOD = '2026-11-09'

export const onRequestGet: PagesFunction = async () => {
  const wtw = wtwSitemapSlugs().flatMap(slug => (['en', 'ko'] as const).map(lang => {
    const isCity = slug !== '' && !slug.endsWith('-degrees')
    return `  <url>
    <loc>${SITE}${wtwPath(lang, slug)}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${SITE}${wtwPath('en', slug)}"/>
    <xhtml:link rel="alternate" hreflang="ko" href="${SITE}${wtwPath('ko', slug)}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${wtwPath('en', slug)}"/>
    <changefreq>${isCity ? 'daily' : 'monthly'}</changefreq>
    <lastmod>${LASTMOD}</lastmod>
  </url>`
  }))

  // 트렌드 에디트 — 발행일이 지난 것만
  const edits = editSitemapEntries().flatMap(e => (['en', 'ko'] as const).map(lang => `  <url>
    <loc>${SITE}${editPath(lang, e.slug)}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${SITE}${editPath('en', e.slug)}"/>
    <xhtml:link rel="alternate" hreflang="ko" href="${SITE}${editPath('ko', e.slug)}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${editPath('en', e.slug)}"/>
    <changefreq>${e.slug ? 'monthly' : 'weekly'}</changefreq>
    <lastmod>${e.lastmod}</lastmod>
  </url>`))

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${SITE}/</loc>
    <lastmod>${LASTMOD}</lastmod>
  </url>
${edits.join('\n')}
${wtw.join('\n')}
</urlset>`

  return new Response(sitemap, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
