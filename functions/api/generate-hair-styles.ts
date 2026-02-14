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
      ? `This is a WOMAN. Apply a feminine, elegant hairstyle that suits women. Make it look natural and attractive for a woman.
- Keep it classic and natural - NO extreme or avant-garde styles
- NO hair accessories (clips, pins, ribbons, bows, headbands, butterfly clips, flower clips)
- Style must be practical and wearable for everyday life`
      : `This is a MAN. STRICT REQUIREMENTS for men's hair:
- Hair length must be SHORT to MEDIUM (above shoulders, typically ear-length or shorter)
- NO long flowing hair, NO hair past the shoulders
- NO feminine accessories like flowers, ribbons, or decorative clips
- Style must look masculine and natural for a man
- Acceptable: short cuts, fades, textured crops, pompadours, slicked back, natural waves
- NOT acceptable: long ponytails, braids, feminine updos, anything that looks like women's styling`

    // Each of the 5 styles gets a DISTINCT visual variation
    const maleVariations = [
      { length: 'shorter and tighter on the sides', texture: 'clean and sleek', color: 'in a natural dark tone', volume: 'low volume, close to the head' },
      { length: 'medium length with the top notably longer', texture: 'textured and slightly messy', color: 'with warm brown tones and subtle highlights', volume: 'medium volume with movement' },
      { length: 'short on the sides with more length on top', texture: 'wavy and tousled', color: 'with ash brown or cool tones', volume: 'high volume, lifted at the front' },
      { length: 'even medium length all around', texture: 'soft and flowing', color: 'with natural chestnut or dark caramel tones', volume: 'natural body and bounce' },
      { length: 'a bit longer on top, tapered sides', texture: 'straight and polished', color: 'in a rich espresso or dark chocolate tone', volume: 'moderate volume with a defined shape' },
    ]
    const femaleVariations = [
      { length: 'shoulder length or above', texture: 'sleek and straight', color: 'with natural highlights and warm honey tones', volume: 'smooth and refined' },
      { length: 'medium to long length', texture: 'soft waves and curls', color: 'with subtle balayage in caramel shades', volume: 'bouncy and voluminous' },
      { length: 'shorter bob or lob style', texture: 'textured and layered', color: 'in a rich brunette or auburn tone', volume: 'airy and light' },
      { length: 'long and flowing', texture: 'loose romantic waves', color: 'with soft ombre or sun-kissed ends', volume: 'full and luxurious' },
      { length: 'medium layered cut', texture: 'natural and effortless', color: 'with dimensional color and face-framing highlights', volume: 'natural movement and body' },
    ]

    const variations = gender === 'female' ? femaleVariations : maleVariations
    const v = variations[styleIndex % variations.length]

    const editPrompt = `You are the world's most sought-after celebrity hair designer, known for transforming clients with hairstyles that perfectly complement their face shape, facial features, and personal style.

EDIT this photo - change the HAIRSTYLE to: "${styleName}"

SPECIFIC STYLE REQUIREMENTS for this version:
- Hair length: ${v.length}
- Hair texture: ${v.texture}
- Hair color: ${v.color}
- Hair volume: ${v.volume}

Analyze the person's face shape (oval, round, square, heart, oblong) and adapt the "${styleName}" style to best flatter their specific face proportions.

${genderGuide}

IMPORTANT - MAKE THIS LOOK VISUALLY DISTINCT:
This is 1 of 5 different style options. This particular version should be clearly distinguishable from the others through its unique combination of length, texture, color, and volume described above.

CRITICAL REQUIREMENTS:
- The person's FACE must remain EXACTLY identical (same eyes, nose, mouth, face shape)
- Skin tone must stay the same
- Expression and pose must not change
- Only the HAIR should be modified to "${styleName}" style
- Hair color should follow the color guidance above using natural-looking tones
- NO unnatural or fantasy hair colors (no blue, pink, green, etc.)
- NO hair accessories of any kind
- Make it look like a real salon result, natural and wearable

Also apply subtle beauty retouching: smooth clear skin, even skin tone, soft professional studio lighting.

Generate the edited photo with the new hairstyle.`

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
