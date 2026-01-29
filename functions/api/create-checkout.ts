import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { validateCheckoutRequest, createValidationErrorResponse } from '../lib/validation'
import { errors } from '../lib/errors'

interface Env {
  POLAR_API_KEY?: string
}

// Polar Product ID (Sandbox)
const PRODUCT_ID = 'cca7d48e-6758-4e83-a375-807ab70615ea'

// 재분석 할인 코드 (Polar에서 생성 필요 - 50% 할인)
const REPEAT_DISCOUNT_CODE = 'COMEBACK50'

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    const body = await context.request.json().catch(() => ({}))

    // Validate request body
    const validation = validateCheckoutRequest(body)
    if (!validation.valid) {
      return createValidationErrorResponse(validation.errors!, corsHeaders)
    }

    const validatedData = validation.data!
    const productId = validatedData.productId || PRODUCT_ID
    const successUrl = validatedData.successUrl || `${new URL(context.request.url).origin}/#result`

    // Polar API로 체크아웃 세션 생성
    const polarToken = context.env.POLAR_API_KEY

    if (!polarToken) {
      console.error('[create-checkout] Payment API not configured')
      return errors.configError(corsHeaders)
    }

    // 할인 코드 결정 (재분석 고객이면 자동 적용)
    const discountCode = validatedData.discountCode || (validatedData.isRepeatCustomer ? REPEAT_DISCOUNT_CODE : undefined)

    // Polar Checkout Session API 호출 (Sandbox 환경)
    const checkoutBody: Record<string, unknown> = {
      products: [productId],
      success_url: successUrl,
      embed_origin: new URL(context.request.url).origin
    }

    // 할인 코드가 있으면 추가
    if (discountCode) {
      checkoutBody.discount_code = discountCode
    }

    const response = await fetch('https://sandbox-api.polar.sh/v1/checkouts/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${polarToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkoutBody)
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Polar API Error:', errorData)
      return errors.externalApi('Polar', corsHeaders)
    }

    const data = await response.json() as { url: string; client_secret: string }

    return new Response(
      JSON.stringify({ url: data.url, clientSecret: data.client_secret }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )

  } catch (error) {
    console.error('Error:', error)
    return errors.internal(corsHeaders)
  }
}

export const onRequestOptions: PagesFunction = async (context) => {
  return createCorsPreflightResponse(context.request)
}
