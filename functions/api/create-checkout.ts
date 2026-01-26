interface Env {
  POLAR_ACCESS_TOKEN?: string
}

interface RequestBody {
  productId: string
  successUrl?: string
}

// Polar Product ID
const PRODUCT_ID = '6f37a6b9-b3bf-413e-9221-182c61711ecc'

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  try {
    const body: RequestBody = await context.request.json().catch(() => ({}))
    const productId = body.productId || PRODUCT_ID
    const successUrl = body.successUrl || `${new URL(context.request.url).origin}/#result`

    // Polar API로 체크아웃 세션 생성
    const polarToken = context.env.POLAR_ACCESS_TOKEN

    if (!polarToken) {
      // API 토큰이 없으면 직접 checkout link URL 반환
      return new Response(
        JSON.stringify({
          url: `https://buy.polar.sh/${productId}`,
          fallback: true
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Polar Checkout Session API 호출
    const response = await fetch('https://api.polar.sh/v1/checkouts/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${polarToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        products: [productId],
        success_url: successUrl,
        embed_origin: new URL(context.request.url).origin
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Polar API Error:', errorData)
      return new Response(
        JSON.stringify({ error: 'Failed to create checkout session', details: errorData }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const data = await response.json() as { url: string; client_secret: string }

    return new Response(
      JSON.stringify({ url: data.url, clientSecret: data.client_secret }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}
