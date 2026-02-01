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
    { id: 'korean-actor', ko: '코리안 시크', en: 'Korean Chic', prompt: 'sophisticated Korean actor hairstyle like Park Seo-jun or Gong Yoo - clean textured cut with natural volume, effortlessly stylish and modern, natural hair color' },
    { id: 'classic-gentleman', ko: '클래식 젠틀맨', en: 'Classic Gentleman', prompt: 'timeless gentleman hairstyle inspired by George Clooney or David Beckham - refined side part or slicked back, polished and sophisticated, natural hair color' },
    { id: 'modern-textured', ko: '모던 텍스처', en: 'Modern Textured', prompt: 'modern textured cut inspired by Timothée Chalamet or BTS style - soft natural texture with movement, contemporary and youthful, natural hair color' },
    { id: 'business-elite', ko: '비즈니스 엘리트', en: 'Business Elite', prompt: 'executive business hairstyle like Korean CEO or Wall Street style - impeccably groomed, clean and professional, commands respect, natural hair color' },
    { id: 'soft-natural', ko: '소프트 내추럴', en: 'Soft Natural', prompt: 'natural relaxed hairstyle like Song Joong-ki or Won Bin - soft layers with gentle movement, approachable and charming, natural hair color' }
  ],
  female: [
    { id: 'korean-actress', ko: '코리안 엘레강스', en: 'Korean Elegance', prompt: 'elegant Korean actress hairstyle like Song Hye-kyo or Jun Ji-hyun - graceful long layers with soft face framing, luxurious shine and movement, natural hair color' },
    { id: 'french-chic', ko: '프렌치 시크', en: 'French Chic', prompt: 'effortless French chic hairstyle inspired by Charlotte Gainsbourg or Jeanne Damas - relaxed waves or subtle texture, understated Parisian elegance, natural hair color' },
    { id: 'modern-bob', ko: '모던 밥', en: 'Modern Bob', prompt: 'sophisticated modern bob inspired by fashion editors and Celine models - clean lines with subtle movement, chic and contemporary, natural hair color' },
    { id: 'romantic-waves', ko: '로맨틱 웨이브', en: 'Romantic Waves', prompt: 'romantic soft waves like Suzy or IU style - gentle flowing waves with beautiful volume, feminine and dreamy, natural hair color' },
    { id: 'natural-goddess', ko: '내추럴 여신', en: 'Natural Goddess', prompt: 'effortlessly beautiful natural hairstyle like Son Ye-jin or Han Ji-min - soft flowing layers with gentle movement, healthy shine and feminine grace, natural hair color' }
  ]
}

const fashionStyles: Record<string, StyleOption[]> = {
  male: [
    { id: 'business', ko: '비즈니스', en: 'Business', prompt: 'professional business outfit: perfectly tailored navy blue suit, crisp white dress shirt, silk tie in burgundy or navy, polished black oxford shoes - confident executive style' },
    { id: 'casual', ko: '캐주얼', en: 'Casual', prompt: 'relaxed weekend outfit: soft grey cotton sweater, well-fitted light blue oxford shirt underneath, dark indigo jeans, clean white sneakers - effortlessly put-together' },
    { id: 'smart', ko: '스마트캐주얼', en: 'Smart Casual', prompt: 'smart casual outfit: cream or light grey cashmere V-neck sweater, navy polo or simple shirt, tailored chinos in khaki or navy, suede loafers - refined weekend style' },
    { id: 'luxury', ko: '럭셔리', en: 'Luxury', prompt: 'luxurious outfit: camel cashmere overcoat, cream merino turtleneck, perfectly tailored charcoal trousers, Italian leather shoes - understated opulence' }
  ],
  female: [
    { id: 'modern', ko: '모던시크', en: 'Modern Chic', prompt: 'modern chic outfit: ivory silk blouse with elegant neckline, high-waisted camel wide-leg trousers, delicate gold jewelry, nude pointed flats - refined contemporary elegance' },
    { id: 'casual', ko: '캐주얼', en: 'Casual', prompt: 'chic casual outfit: oversized pale pink or beige cashmere cardigan, simple white t-shirt, high-waisted cream straight-leg jeans, white sneakers - cozy yet stylish' },
    { id: 'elegant', ko: '엘레강스', en: 'Elegant', prompt: 'elegant outfit: beautiful midi dress in soft champagne or dusty rose with flattering draping, delicate pearl earrings, gold bracelet, classic nude heels - timeless feminine grace' },
    { id: 'romantic', ko: '로맨틱', en: 'Romantic', prompt: 'romantic outfit: flowing chiffon blouse in blush pink with soft ruffles, elegant pleated midi skirt in cream, rose gold jewelry, strappy sandals - dreamy feminine allure' }
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
      ? 'This is a WOMAN. The outfit MUST be soft and feminine - use dresses, blouses, cardigans, skirts in soft/pastel colors. NO masculine suits, NO blazers, NO formal business wear.'
      : 'This is a MAN. The outfit MUST be masculine and designed for men. Use suits, shirts, masculine jackets, pants - NOT women\'s clothing.'

    const beautyRetouch = gender === 'female'
      ? `BEAUTY ENHANCEMENT for the face:
- Apply soft, natural skin smoothing (reduce wrinkles and blemishes subtly)
- Add gentle soft-focus glow effect on the face
- Even out skin tone with warm, healthy glow
- Keep the face looking NATURAL - not overly edited`
      : `SUBTLE BEAUTY ENHANCEMENT for the face:
- Apply light natural skin smoothing (reduce blemishes subtly)
- Add subtle soft-focus glow effect on the face
- Even out skin tone slightly for a clean, fresh look
- Keep the face looking NATURAL and masculine - not overly edited`

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
      : `EDIT this photo - ONLY change the OUTFIT of the MAIN PERSON to: ${style.prompt}

CRITICAL: ${genderGuideFashion}

${beautyRetouch}

FOCUS ON MAIN SUBJECT ONLY:
- Only edit the MAIN person in the center/foreground of the photo
- If there are OTHER PEOPLE in the background, LEAVE THEM COMPLETELY UNCHANGED
- Do NOT modify, remove, or add any other people
- Keep all background elements exactly as they are

INPAINTING RULES - THIS IS AN INPAINTING TASK:
1. ONLY replace the clothing/fabric within the MAIN PERSON's body silhouette
2. DO NOT generate a new person or body - use the EXACT existing body outline
3. The new clothes must fit WITHIN the original body boundaries
4. Body parts (arms, legs, torso) stay in EXACT same position
5. Clothing layers: body underneath, clothes on top - NEVER overlap incorrectly
6. DO NOT extend the image or add new body parts that weren't visible

ABSOLUTE REQUIREMENTS - VIOLATION IS FAILURE:
1. NEVER CROP OR ZOOM - output must have IDENTICAL framing as input
2. NEVER change aspect ratio - if input is portrait, output is portrait
3. Face position, size, and features MUST be PIXEL-PERFECT identical
4. Keep EXACTLY what is visible in the original - do not extend or add content
5. Hairstyle, hair color, skin tone base - ZERO changes allowed
6. Background and OTHER PEOPLE - ZERO changes allowed
7. Output resolution MUST match input resolution exactly
8. Legs must be BEHIND/INSIDE pants or skirt - NEVER on top of clothing
9. Arms must be THROUGH sleeves - NEVER floating above clothes

This is a clothing REPLACEMENT task for the MAIN ${genderWord} only.
Keep the person's HEAD and FACE at the EXACT same position.
The ${genderWord}'s clothes should naturally fit the existing body shape.
DO NOT generate full body if original only shows partial body.

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
