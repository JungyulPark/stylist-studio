import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { errors } from '../lib/errors'

interface Env {
  POLAR_API_KEY?: string
  // Product IDs (Polar에서 생성 후 설정)
  POLAR_PRODUCT_FULL?: string
  POLAR_PRODUCT_DAILY_STYLE?: string
}

// Product 타입 정의
type ProductType = 'full' | 'daily_style'

// Production Product IDs
const DEFAULT_PRODUCTS: Record<ProductType, string> = {
  full: '533aed39-303f-4746-afb0-d150aa294f64',
  daily_style: '2c761310-373e-4017-8141-8532748713c0',
}

// 가격 정보 (표시용)
const PRICES: Record<ProductType, { amount: number; currency: string; display: string; recurring?: boolean }> = {
  full: { amount: 499, currency: 'USD', display: '$4.99' },
  daily_style: { amount: 699, currency: 'USD', display: '$6.99/mo', recurring: true },
}

// 재구매 할인 코드
const REPEAT_DISCOUNT_CODE = 'COMEBACK50'

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    const body = await context.request.json().catch(() => ({})) as {
      productType?: ProductType
      productId?: string
      successUrl?: string
      isRepeatCustomer?: boolean
      discountCode?: string
    }

    // Product 타입 검증
    const productType = body.productType || 'full'
    if (!['full', 'daily_style'].includes(productType)) {
      return errors.validation('Invalid product type', corsHeaders)
    }

    // Product ID 결정 (환경변수 > 요청 파라미터 > 기본값)
    const envProductIds: Record<ProductType, string | undefined> = {
      full: context.env.POLAR_PRODUCT_FULL,
      daily_style: context.env.POLAR_PRODUCT_DAILY_STYLE,
    }

    const productId = envProductIds[productType] || body.productId || DEFAULT_PRODUCTS[productType]
    const baseSuccessUrl = `${new URL(context.request.url).origin}/?payment=success&type=${productType}`
    const successUrl = body.successUrl || (productType === 'daily_style'
      ? `${baseSuccessUrl}&subscription=active`
      : baseSuccessUrl)

    // Polar API 키 확인
    const polarToken = context.env.POLAR_API_KEY

    if (!polarToken) {
      console.error('[create-checkout] Payment API not configured')
      return errors.configError(corsHeaders)
    }

    // 할인 코드 결정 (재구매 고객이면 자동 적용)
    const discountCode = body.discountCode || (body.isRepeatCustomer ? REPEAT_DISCOUNT_CODE : undefined)

    // Polar Checkout Session API 호출
    const checkoutBody: Record<string, unknown> = {
      products: [productId],
      success_url: successUrl,
      embed_origin: new URL(context.request.url).origin,
      metadata: {
        product_type: productType,
      }
    }

    // 할인 코드가 있으면 추가
    if (discountCode) {
      checkoutBody.discount_code = discountCode
    }

    const response = await fetch('https://api.polar.sh/v1/checkouts/', {
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
      JSON.stringify({
        url: data.url,
        clientSecret: data.client_secret,
        productType,
        price: PRICES[productType]
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )

  } catch (error) {
    console.error('Error:', error)
    return errors.internal(corsHeaders)
  }
}

// GET: 가격 정보 조회
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  return new Response(
    JSON.stringify({
      products: {
        full: {
          name: 'Full Style Package',
          description: 'Complete AI styling consultation with fashion looks',
          price: PRICES.full,
          features: [
            'AI Style Analysis Report',
            '3 premium fashion outfit previews',
            'Personalized recommendations'
          ]
        },
        daily_style: {
          name: 'What to Wear Today',
          description: 'Daily AI outfit recommendations based on weather & your profile',
          price: PRICES.daily_style,
          features: [
            '7-day free trial',
            'Daily outfit recommendations',
            'Weather-based styling',
            'Cancel anytime'
          ]
        },
      }
    }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  )
}

export const onRequestOptions: PagesFunction = async (context) => {
  return createCorsPreflightResponse(context.request)
}
