/**
 * 공유된 오늘의 룩 — /look/{id}
 * 사람과 크롤러 모두 같은 페이지를 받는다 (OG 태그 포함, noindex).
 */
import { countLookShareView, getLookShare, renderLookGonePage, renderLookPage } from '../lib/look-share'

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { id } = context.params as { id: string }
  const headers = { 'Content-Type': 'text/html; charset=utf-8' }

  try {
    const share = await getLookShare(context.env, id)
    if (!share || share.revoked_at) {
      return new Response(renderLookGonePage(share?.lang), { status: 404, headers })
    }

    // 소유자가 자기 링크를 여는 건 조회수로 세지 않는다
    if (!new URL(context.request.url).searchParams.has('o')) {
      context.waitUntil(countLookShareView(context.env, share.id))
    }

    return new Response(renderLookPage(share), {
      status: 200,
      headers: { ...headers, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
    })
  } catch (e) {
    console.error('[look] render error:', e)
    return new Response(renderLookGonePage(null), { status: 500, headers })
  }
}
