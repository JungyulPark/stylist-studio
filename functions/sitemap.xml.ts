// Serve sitemap.xml directly via Functions to bypass Cloudflare edge processing
export const onRequestGet: PagesFunction = async () => {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://kstylist.cc/</loc>
    <lastmod>2026-03-14</lastmod>
  </url>
</urlset>`

  return new Response(sitemap, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
