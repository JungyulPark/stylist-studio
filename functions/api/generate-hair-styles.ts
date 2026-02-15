import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { validateHairStylesRequest, createValidationErrorResponse } from '../lib/validation'
import { errors } from '../lib/errors'

interface Env {
  GEMINI_API_KEY: string
}

// ===== Gemini Image Editing =====
async function generateHairImageWithGemini(
  photo: string,
  styleName: string,
  gender: string,
  styleIndex: number,
  apiKey: string
): Promise<{ style: string; imageUrl: string | null }> {
  try {
    const base64Match = photo.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!base64Match) {
      return { style: styleName, imageUrl: null }
    }

    const mimeType = `image/${base64Match[1]}`
    const base64Data = base64Match[2]

    const genderGuide = gender === 'female'
      ? `This is a WOMAN. Apply a feminine hairstyle that suits women.
- Keep it natural and practical — something a real salon would create
- NO extreme or avant-garde styles, NO fantasy colors
- NO hair accessories (clips, pins, ribbons, bows, headbands)
- The result should look like the person actually went to a good salon`
      : `This is a MAN. Requirements for men's hair:
- Hair length must be SHORT to MEDIUM (above shoulders)
- NO long flowing hair, NO feminine accessories
- Style must look masculine and natural
- The result should look like the person actually went to a good barber shop`

    // Each of the 5 styles gets a DISTINCT visual variation
    const maleVariations = [
      { length: 'short and clean on the sides', texture: 'clean and sleek', color: 'keep the person\'s natural hair color', volume: 'low volume, close to the head' },
      { length: 'short to medium, longer on top (5-7cm)', texture: 'textured with natural movement', color: 'keep the person\'s natural hair color', volume: 'medium volume with movement' },
      { length: 'short on the sides, moderate top (4-6cm)', texture: 'slightly wavy and tousled', color: 'keep the person\'s natural hair color, add very subtle warm tone', volume: 'moderate volume, lifted at the front' },
      { length: 'short to medium, even all around (3-5cm)', texture: 'soft and natural', color: 'keep the person\'s natural hair color', volume: 'natural body' },
      { length: 'medium on top (5-7cm), tapered sides', texture: 'straight and polished', color: 'keep the person\'s natural hair color', volume: 'moderate volume with defined shape' },
    ]
    const femaleVariations = [
      { length: 'shoulder length or above', texture: 'sleek and straight', color: 'keep the person\'s natural hair color', volume: 'smooth and refined' },
      { length: 'medium to long length', texture: 'soft natural waves', color: 'keep the person\'s natural hair color, add subtle warmth', volume: 'natural body and bounce' },
      { length: 'shorter bob or lob style', texture: 'textured and layered', color: 'keep the person\'s natural hair color', volume: 'airy and light' },
      { length: 'long and flowing', texture: 'loose gentle waves', color: 'keep the person\'s natural hair color', volume: 'natural fullness' },
      { length: 'medium layered cut', texture: 'natural and effortless', color: 'keep the person\'s natural hair color, add subtle face-framing lightness', volume: 'natural movement and body' },
    ]

    const variations = gender === 'female' ? femaleVariations : maleVariations
    const v = variations[styleIndex % variations.length]

    const editPrompt = `You are a world-class hair designer at a top salon. Analyze this person's face shape, skin tone, and features, then show them how they would look with the perfect hairstyle — beautiful, stylish, and practical for everyday life.

EDIT this photo - change ONLY the HAIRSTYLE to: "${styleName}"

STYLE DETAILS:
- Hair length: ${v.length}
- Hair texture: ${v.texture}
- Hair color: ${v.color}
- Hair volume: ${v.volume}

${genderGuide}

STYLING APPROACH:
- Choose a style that flatters THIS person's specific face shape and features
- The result must look like a real premium salon visit — polished, modern, and wearable
- Think everyday beautiful — a style this person would love wearing to work, dates, or weekends
- NO extreme, avant-garde, or impractical styles

CRITICAL RULES — VIOLATION IS FAILURE:
1. Face MUST remain PIXEL-PERFECT identical (same eyes, nose, mouth, expression)
2. Skin tone, pose, and background must NOT change
3. Only the HAIR should change
4. KEEP the person's NATURAL HAIR COLOR — do NOT dramatically change hair color
5. NO unnatural colors, NO hair accessories (clips, pins, ribbons, bows)
6. NEVER crop, zoom, or change the framing of the photo
7. Output resolution MUST match input resolution exactly

Apply subtle beauty retouching: smooth clear skin, even skin tone, soft studio lighting.

Generate the edited photo.`

    const geminiModels = [
      'gemini-3-pro-image-preview',
      'gemini-2.5-flash-image'
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
          console.log(`[Gemini] ${model} succeeded for ${styleName}`)
          break
        }
        console.log(`[Gemini] ${model} failed (${response.status}) for ${styleName}`)
      } catch (e) {
        console.error(`[Gemini] ${model} error:`, e)
      }
    }

    if (!response || !response.ok) {
      return { style: styleName, imageUrl: null }
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
        console.log(`[Gemini] Success: ${styleName}`)
        return {
          style: styleName,
          imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
        }
      }
    }

    return { style: styleName, imageUrl: null }
  } catch (error) {
    console.error(`[Gemini] Error for "${styleName}":`, error)
    return { style: styleName, imageUrl: null }
  }
}

// ===== API Handler =====
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    const body = await context.request.json()

    // Validate request body
    const validation = validateHairStylesRequest(body)
    if (!validation.valid) {
      return createValidationErrorResponse(validation.errors!, corsHeaders)
    }

    const { photo, styles, gender } = validation.data!

    const geminiKey = context.env.GEMINI_API_KEY

    if (!geminiKey) {
      console.error('[generate-hair-styles] Image generation API not configured')
      return errors.configError(corsHeaders)
    }

    console.log(`[API Hair] Generating ${styles.length} hairstyles with Gemini`)

    const images = await Promise.all(
      styles.map((styleName, index) => generateHairImageWithGemini(photo, styleName, gender || 'male', index, geminiKey))
    )

    const successCount = images.filter(r => r.imageUrl).length
    console.log(`[API Hair] Generated ${successCount}/${styles.length} hairstyles`)

    return new Response(
      JSON.stringify({
        images,
        successCount,
        provider: 'gemini'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (error) {
    console.error('[API Hair] Error:', error)
    return errors.internal(corsHeaders)
  }
}

export const onRequestOptions: PagesFunction = async (context) => {
  return createCorsPreflightResponse(context.request)
}
