/**
 * Dynamic OG Image Handler for shared results
 *
 * URL: /share/[RESULT_ID]
 * - Crawlers (Twitter, Facebook, KakaoTalk, etc.) → HTML with OG meta tags
 * - Humans → Redirect to SPA with share param
 */

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}

const CRAWLERS = [
  'twitterbot', 'facebookexternalhit', 'linkedinbot',
  'slackbot', 'kakaotalk', 'telegrambot', 'whatsapp',
  'googlebot', 'bingbot', 'yandex', 'baiduspider', 'discordbot',
  'pinterestbot', 'redditbot', 'naverbot', 'daum'
]

function isCrawler(ua: string): boolean {
  const lower = ua.toLowerCase()
  return CRAWLERS.some(bot => lower.includes(bot))
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { id } = context.params as { id: string }
  const ua = context.request.headers.get('user-agent') || ''

  // Human visitors → redirect to SPA
  if (!isCrawler(ua)) {
    return Response.redirect(`https://kstylist.cc/#landing?ref_share=${id}`, 302)
  }

  // Crawlers → serve OG meta tags
  try {
    if (!context.env.SUPABASE_URL || !context.env.SUPABASE_SERVICE_KEY) {
      return Response.redirect('https://kstylist.cc', 302)
    }

    const res = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/shared_results?id=eq.${id}&select=*`,
      {
        headers: {
          'apikey': context.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`
        }
      }
    )

    if (!res.ok) {
      return Response.redirect('https://kstylist.cc', 302)
    }

    const results = await res.json() as Array<{
      id: string
      season: string
      share_image_url?: string
    }>

    if (!results || results.length === 0) {
      return Response.redirect('https://kstylist.cc', 302)
    }

    const result = results[0]
    const ogImage = result.share_image_url || 'https://kstylist.cc/og-image.png'
    const season = result.season || 'Your Color'

    // Increment view count (fire-and-forget)
    fetch(
      `${context.env.SUPABASE_URL}/rest/v1/rpc/increment_share_view`,
      {
        method: 'POST',
        headers: {
          'apikey': context.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ share_id: id })
      }
    ).catch(() => {})

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>My Personal Color: ${season} | Stylist Studio</title>
  <meta property="og:title" content="My Personal Color is ${season}">
  <meta property="og:description" content="I discovered my personal color season with AI! Find yours in 30 seconds — completely free.">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="628">
  <meta property="og:url" content="https://kstylist.cc/share/${id}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Stylist Studio">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="My Personal Color is ${season}">
  <meta name="twitter:description" content="Discover your personal color season with AI →">
  <meta name="twitter:image" content="${ogImage}">
</head>
<body>
  <script>window.location.href="https://kstylist.cc/#landing?ref_share=${id}";</script>
</body>
</html>`

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    })
  } catch {
    return Response.redirect('https://kstylist.cc', 302)
  }
}
