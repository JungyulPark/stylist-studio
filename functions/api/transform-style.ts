import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { validateTransformStyleRequest, createValidationErrorResponse } from '../lib/validation'
import { errors } from '../lib/errors'

interface Env {
  GEMINI_API_KEY: string
  OPENAI_API_KEY: string
}

// 헤어스타일 옵션
const hairstyles = {
  male: [
    { id: 'classic-short', ko: '클래식 숏컷', en: 'Classic Short', prompt: 'classic short haircut with clean side part' },
    { id: 'textured-crop', ko: '텍스처드 크롭', en: 'Textured Crop', prompt: 'textured messy crop with skin fade' },
    { id: 'slick-back', ko: '슬릭백', en: 'Slick Back', prompt: 'slicked back wet look hair' },
    { id: 'two-block', ko: '투블럭', en: 'Two Block', prompt: 'Korean two-block haircut with volume on top' },
    { id: 'pompadour', ko: '폼파두르', en: 'Pompadour', prompt: 'modern pompadour with height' },
    { id: 'buzz-fade', ko: '버즈 페이드', en: 'Buzz Fade', prompt: 'buzz cut with high fade' },
    { id: 'curtain', ko: '커튼뱅', en: 'Curtain Bangs', prompt: 'middle part curtain bangs K-style' },
    { id: 'quiff', ko: '퀴프', en: 'Quiff', prompt: 'textured quiff swept up' },
    { id: 'long-flow', ko: '롱 플로우', en: 'Long Flow', prompt: 'medium long flowing hair' }
  ],
  female: [
    { id: 'long-layers', ko: '롱 레이어드', en: 'Long Layers', prompt: 'long layered hair with face framing' },
    { id: 'bob', ko: '단발', en: 'Bob Cut', prompt: 'sleek chin-length bob cut' },
    { id: 'beach-waves', ko: '비치 웨이브', en: 'Beach Waves', prompt: 'loose beach waves natural texture' },
    { id: 'pixie', ko: '픽시컷', en: 'Pixie Cut', prompt: 'short chic pixie cut' },
    { id: 'korean-perm', ko: '코리안 펌', en: 'Korean Perm', prompt: 'soft Korean style perm waves' },
    { id: 'straight', ko: '스트레이트', en: 'Straight Long', prompt: 'long sleek straight hair' },
    { id: 'curtain', ko: '커튼뱅', en: 'Curtain Bangs', prompt: 'curtain bangs with soft layers' },
    { id: 'ponytail', ko: '포니테일', en: 'Ponytail', prompt: 'sleek high ponytail' },
    { id: 'lob', ko: '로브', en: 'Long Bob', prompt: 'shoulder length long bob' }
  ]
}

// 패션 스타일 옵션
const fashionStyles = {
  male: [
    { id: 'business', ko: '비즈니스', en: 'Business', prompt: 'wearing navy suit with white shirt and tie' },
    { id: 'casual', ko: '캐주얼', en: 'Casual', prompt: 'wearing white t-shirt and slim jeans with sneakers' },
    { id: 'smart-casual', ko: '스마트 캐주얼', en: 'Smart Casual', prompt: 'wearing blazer over polo shirt with chinos' },
    { id: 'streetwear', ko: '스트릿웨어', en: 'Streetwear', prompt: 'wearing hoodie and joggers with sneakers' },
    { id: 'formal', ko: '포멀', en: 'Formal', prompt: 'wearing black tuxedo with bow tie' },
    { id: 'preppy', ko: '프레피', en: 'Preppy', prompt: 'wearing sweater over oxford shirt with khakis' }
  ],
  female: [
    { id: 'business', ko: '비즈니스', en: 'Business', prompt: 'wearing tailored blazer with pencil skirt' },
    { id: 'casual', ko: '캐주얼', en: 'Casual', prompt: 'wearing comfortable sweater and jeans' },
    { id: 'elegant', ko: '엘레강스', en: 'Elegant', prompt: 'wearing elegant midi dress' },
    { id: 'streetwear', ko: '스트릿웨어', en: 'Streetwear', prompt: 'wearing crop top and high-waist pants' },
    { id: 'formal', ko: '포멀', en: 'Formal', prompt: 'wearing evening gown' },
    { id: 'romantic', ko: '로맨틱', en: 'Romantic', prompt: 'wearing flowy floral dress' }
  ]
}

interface TransformResult {
  imageUrl: string | null
  error?: string
}

async function transformWithGemini(
  photo: string,
  type: 'hairstyle' | 'fashion',
  stylePrompt: string,
  apiKey: string
): Promise<TransformResult> {
  try {
    const base64Match = photo.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!base64Match) return { imageUrl: null, error: 'Invalid photo format' }

    const mimeType = `image/${base64Match[1]}`
    const base64Data = base64Match[2]

    const editPrompt = type === 'hairstyle'
      ? `EDIT this photo - ONLY change the HAIRSTYLE to: ${stylePrompt}

CRITICAL - DO NOT CHANGE:
- Face shape, eyes, nose, mouth, ears - MUST stay IDENTICAL
- Skin tone and texture - MUST stay IDENTICAL
- Body shape and proportions - MUST stay IDENTICAL
- Expression and pose - MUST stay IDENTICAL
- Background and lighting - MUST stay IDENTICAL

ONLY modify the hair. Keep hair at a natural, manageable length - avoid overly long or exaggerated styles for men.
Also apply subtle beauty retouching: smooth clear skin, even skin tone, soft professional studio lighting.

Generate the edited photo.`
      : `EDIT this photo - ONLY change the OUTFIT to: ${stylePrompt}

ABSOLUTE REQUIREMENTS - VIOLATION IS FAILURE:
1. NEVER CROP OR ZOOM - output must have IDENTICAL framing as input
2. NEVER change aspect ratio - if input is portrait, output is portrait
3. Face position, size, and features MUST be PIXEL-PERFECT identical
4. If this is a FULL BODY shot, keep the ENTIRE body visible from head to toe
5. Hairstyle, hair color, skin tone - ZERO changes allowed
6. Background, lighting, pose - ZERO changes allowed
7. Output resolution MUST match input resolution exactly

This is a FULL BODY photo editing task. DO NOT zoom in on the torso.
The person's HEAD and FACE must remain at the EXACT same position in the frame.

ONLY replace the clothing/outfit textures. Nothing else changes.

Generate the edited photo with IDENTICAL composition to the input.`

    const geminiModels = [
      'gemini-3-pro-image-preview'
    ]

    let response: Response | null = null
    for (const model of geminiModels) {
      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                role: 'user',
                parts: [
                  { inlineData: { mimeType, data: base64Data } },
                  { text: editPrompt }
                ]
              }],
              generationConfig: {
                responseModalities: ['IMAGE', 'TEXT'],
                imageConfig: {
                  imageSize: '1K'
                }
              }
            })
          }
        )
        if (response.ok) {
          console.log(`[Gemini] ${model} succeeded for ${stylePrompt}`)
          break
        }
        console.log(`[Gemini] ${model} failed (${response.status}) for ${stylePrompt}`)
      } catch (e) {
        console.error(`[Gemini] ${model} error:`, e)
      }
    }

    if (!response || !response.ok) {
      return { imageUrl: null, error: 'All Gemini models failed' }
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ inlineData?: { mimeType: string; data: string } }>
        }
      }>
    }

    for (const part of data.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        return { imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` }
      }
    }

    return { imageUrl: null, error: 'No image in response' }
  } catch (error) {
    console.error('Transform error:', error)
    return { imageUrl: null, error: `Exception: ${error}` }
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    const body = await context.request.json()

    // Validate request body
    const validation = validateTransformStyleRequest(body)
    if (!validation.valid) {
      return createValidationErrorResponse(validation.errors!, corsHeaders)
    }

    const { photo, type, style, gender, language } = validation.data!

    const apiKey = context.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('[transform-style] Image generation API not configured')
      return errors.configError(corsHeaders)
    }

    // Get style options based on type and gender
    const genderKey = gender === 'female' ? 'female' : 'male'
    const styleOptions = type === 'hairstyle' ? hairstyles[genderKey] : fashionStyles[genderKey]
    const selectedStyle = styleOptions.find(s => s.id === style)

    if (!selectedStyle) {
      return errors.validation('Invalid style', corsHeaders)
    }

    const result = await transformWithGemini(photo, type, selectedStyle.prompt, apiKey)

    return new Response(
      JSON.stringify({
        success: !!result.imageUrl,
        imageUrl: result.imageUrl,
        error: result.error,
        style: {
          id: selectedStyle.id,
          label: language === 'ko' ? selectedStyle.ko : selectedStyle.en
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )

  } catch (error) {
    console.error('Error:', error)
    return errors.internal(corsHeaders)
  }
}

// GET: 사용 가능한 스타일 목록 반환
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  const url = new URL(context.request.url)
  const gender = url.searchParams.get('gender') || 'male'
  const genderKey = gender === 'female' ? 'female' : 'male'

  return new Response(
    JSON.stringify({
      hairstyles: hairstyles[genderKey],
      fashionStyles: fashionStyles[genderKey]
    }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  )
}

export const onRequestOptions: PagesFunction = async (context) => {
  return createCorsPreflightResponse(context.request)
}
