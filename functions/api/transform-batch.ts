import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { validateTransformBatchRequest, createValidationErrorResponse } from '../lib/validation'
import { errors } from '../lib/errors'

interface Env {
  GEMINI_API_KEY: string
}

interface StyleOption {
  id: string
  ko: string
  en: string
  prompt: string
}

const hairstyles: Record<string, StyleOption[]> = {
  male: [
    { id: 'two-block', ko: '투블럭', en: 'Two Block', prompt: 'Korean two-block haircut with volume on top, natural hair color, clean and neat style' },
    { id: 'textured-crop', ko: '텍스처드 크롭', en: 'Textured Crop', prompt: 'textured crop with clean sides, natural hair color, modern and neat' },
    { id: 'slick-back', ko: '슬릭백', en: 'Slick Back', prompt: 'slicked back neat hair, natural hair color, professional look' },
    { id: 'pompadour', ko: '폼파두르', en: 'Pompadour', prompt: 'modern pompadour with volume on top, natural hair color, classic masculine style' },
    { id: 'curtain-bangs', ko: '커튼뱅', en: 'Curtain Bangs', prompt: 'middle part curtain bangs, natural hair color, soft and natural look' }
  ],
  female: [
    { id: 'long-layers', ko: '롱 레이어드', en: 'Long Layers', prompt: 'long layered hair with face framing, natural hair color, elegant and feminine' },
    { id: 'bob', ko: '단발', en: 'Bob Cut', prompt: 'sleek chin-length bob cut, natural hair color, clean and modern' },
    { id: 'korean-perm', ko: '코리안 펌', en: 'Korean Perm', prompt: 'soft Korean style perm with gentle waves, natural hair color, feminine and soft' },
    { id: 'straight-long', ko: '롱스트레이트', en: 'Long Straight', prompt: 'long sleek straight hair with shine, natural hair color, classic and elegant' },
    { id: 'shoulder-length', ko: '미디엄 기장', en: 'Shoulder Length', prompt: 'shoulder length hair with soft ends, natural hair color, versatile and natural look' }
  ]
}

const fashionStyles: Record<string, StyleOption[]> = {
  male: [
    { id: 'business', ko: '비즈니스', en: 'Business', prompt: 'navy suit with white shirt and silk tie, professional' },
    { id: 'casual', ko: '캐주얼', en: 'Casual', prompt: 'white t-shirt, slim blue jeans, white sneakers' },
    { id: 'streetwear', ko: '스트릿', en: 'Streetwear', prompt: 'oversized hoodie, jogger pants, chunky sneakers' },
    { id: 'luxury', ko: '럭셔리', en: 'Luxury', prompt: 'designer luxury outfit, high-end fashion, premium' }
  ],
  female: [
    { id: 'business', ko: '비즈니스', en: 'Business', prompt: 'tailored blazer, pencil skirt, professional elegant' },
    { id: 'casual', ko: '캐주얼', en: 'Casual', prompt: 'cozy sweater, comfortable jeans, casual chic' },
    { id: 'elegant', ko: '엘레강스', en: 'Elegant', prompt: 'elegant midi dress, sophisticated feminine' },
    { id: 'luxury', ko: '럭셔리', en: 'Luxury', prompt: 'designer luxury outfit, high fashion, premium' }
  ]
}

// ===== Gemini Image Editing =====
async function transformWithGemini(
  photo: string,
  type: 'hairstyle' | 'fashion',
  style: StyleOption,
  gender: string,
  apiKey: string
): Promise<string | null> {
  try {
    const base64Match = photo.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!base64Match) return null

    const mimeType = `image/${base64Match[1]}`
    const base64Data = base64Match[2]

    const genderWord = gender === 'female' ? 'woman' : 'man'
    const genderGuideHair = gender === 'female'
      ? 'This is a WOMAN. Style should be feminine and suit women.'
      : 'This is a MAN. The hairstyle should suit a man naturally. Perms, soft waves, textured styles are fine. Just avoid overly feminine or women\'s hairstyles.'

    const genderGuideFashion = gender === 'female'
      ? 'This is a WOMAN. The outfit MUST be feminine and designed for women. Use dresses, skirts, blouses, or feminine pants - NOT men\'s clothing.'
      : 'This is a MAN. The outfit MUST be masculine and designed for men. Use suits, shirts, masculine jackets, pants - NOT women\'s clothing.'

    const editPrompt = type === 'hairstyle'
      ? `EDIT this photo - ONLY change the HAIRSTYLE to: ${style.prompt}

${genderGuideHair}

CRITICAL - DO NOT CHANGE:
- Face, eyes, nose, mouth - MUST stay IDENTICAL
- Skin tone and body shape - MUST stay IDENTICAL
- Expression and pose - MUST stay IDENTICAL
- Hair color - KEEP the ORIGINAL natural hair color, do NOT change it

FORBIDDEN - DO NOT ADD:
- NO hair accessories (clips, pins, ribbons, bows, headbands)
- NO butterfly clips, flower clips, or decorative items
- NO unnatural or fantasy hair colors
- NO extreme or avant-garde hairstyles

ONLY modify the hair shape and style, keeping it natural and realistic.
Also apply subtle beauty retouching: smooth clear skin, even skin tone, soft professional studio lighting.

Generate the edited photo.`
      : `EDIT this photo - ONLY change the OUTFIT to: ${style.prompt}

CRITICAL: ${genderGuideFashion}

INPAINTING RULES - THIS IS AN INPAINTING TASK:
1. ONLY replace the clothing/fabric within the EXISTING body silhouette
2. DO NOT generate a new person or body - use the EXACT existing body outline
3. The new clothes must fit WITHIN the original body boundaries
4. Body parts (arms, legs, torso) stay in EXACT same position
5. Clothing layers: body underneath, clothes on top - NEVER overlap incorrectly

ABSOLUTE REQUIREMENTS - VIOLATION IS FAILURE:
1. NEVER CROP OR ZOOM - output must have IDENTICAL framing as input
2. NEVER change aspect ratio - if input is portrait, output is portrait
3. Face position, size, and features MUST be PIXEL-PERFECT identical
4. If this is a FULL BODY shot, keep the ENTIRE body visible from head to toe
5. Hairstyle, hair color, skin tone - ZERO changes allowed
6. Background, lighting, pose - ZERO changes allowed
7. Output resolution MUST match input resolution exactly
8. Legs must be BEHIND/INSIDE pants or skirt - NEVER on top of clothing
9. Arms must be THROUGH sleeves - NEVER floating above clothes

This is a clothing REPLACEMENT task for a ${genderWord}, not image generation.
Keep the person's HEAD and FACE at the EXACT same position.
The ${genderWord}'s clothes should naturally fit the existing body shape.

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
          console.log(`[Gemini] ${model} succeeded for ${style.id}`)
          break
        }
        console.log(`[Gemini] ${model} failed (${response.status}) for ${style.id}`)
      } catch (e) {
        console.error(`[Gemini] ${model} error:`, e)
      }
    }

    if (!response || !response.ok) {
      console.error(`[Gemini] All models failed for ${style.id}`)
      return null
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
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
      }
    }

    return null
  } catch (error) {
    console.error(`Gemini error for ${style.id}:`, error)
    return null
  }
}

// ===== API Handler =====
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    const body = await context.request.json()

    // Validate request body
    const validation = validateTransformBatchRequest(body)
    if (!validation.valid) {
      return createValidationErrorResponse(validation.errors!, corsHeaders)
    }

    const { photo, type, gender, language } = validation.data!

    const geminiKey = context.env.GEMINI_API_KEY

    if (!geminiKey) {
      console.error('[transform-batch] Image generation API not configured')
      return errors.configError(corsHeaders)
    }

    const genderKey = gender === 'female' ? 'female' : 'male'
    const styles = type === 'hairstyle' ? hairstyles[genderKey] : fashionStyles[genderKey]

    console.log(`[transform-batch] Generating ${styles.length} ${type} styles with Gemini`)

    const results = await Promise.all(
      styles.map(async (style) => {
        const imageUrl = await transformWithGemini(photo, type, style, genderKey, geminiKey)
        const label = language === 'ko' ? style.ko : style.en
        return { id: style.id, label, imageUrl }
      })
    )

    const successCount = results.filter(r => r.imageUrl).length
    console.log(`[transform-batch] Success: ${successCount}/${styles.length}`)

    return new Response(
      JSON.stringify({
        type,
        results,
        successCount
      }),
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
