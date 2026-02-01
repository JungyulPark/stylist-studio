import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { validateHairStylesRequest, createValidationErrorResponse } from '../lib/validation'
import { errors } from '../lib/errors'

interface Env {
  GEMINI_API_KEY: string
}

// ===== Gemini Image Editing =====
async function generateFashionImageWithGemini(
  photo: string,
  styleName: string,
  gender: string,
  apiKey: string
): Promise<{ style: string; imageUrl: string | null }> {
  try {
    const base64Match = photo.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!base64Match) {
      return { style: styleName, imageUrl: null }
    }

    const mimeType = `image/${base64Match[1]}`
    const base64Data = base64Match[2]

    const genderWord = gender === 'female' ? 'woman' : 'man'
    const genderGuide = gender === 'female'
      ? 'This is a WOMAN. The outfit MUST be feminine and designed for women.'
      : 'This is a MAN. The outfit MUST be masculine and designed for men.'

    const editPrompt = `EDIT this photo - ONLY change the OUTFIT to match the style: ${styleName}

CRITICAL: ${genderGuide}

INPAINTING RULES - THIS IS AN INPAINTING TASK:
1. ONLY replace the clothing/fabric within the EXISTING body silhouette
2. DO NOT generate a new person or body - use the EXACT existing body outline
3. The new clothes must fit WITHIN the original body boundaries
4. Body parts (arms, legs, torso) stay in EXACT same position
5. Clothing layers: body underneath, clothes on top - NEVER overlap incorrectly

CRITICAL RULES - MUST FOLLOW:
1. DO NOT CROP the image - keep EXACT same framing and composition
2. Face MUST remain EXACTLY identical - same position, same size, fully visible
3. Hairstyle MUST stay the same
4. Body proportions and pose MUST stay identical
5. Background MUST stay the same
6. Output image MUST have same dimensions as input
7. Legs must be BEHIND/INSIDE pants or skirt - NEVER on top of clothing
8. Arms must be THROUGH sleeves - NEVER floating above clothes

ONLY change the clothing to "${styleName}" style appropriate for a ${genderWord}. Nothing else.
Keep the person's face and head FULLY VISIBLE in the frame.
This is a clothing REPLACEMENT task, not image generation.

Generate the edited photo maintaining the original composition.`

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
        console.log(`[Gemini Fashion] Success: ${styleName}`)
        return {
          style: styleName,
          imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
        }
      }
    }

    return { style: styleName, imageUrl: null }
  } catch (error) {
    console.error(`[Gemini Fashion] Error for "${styleName}":`, error)
    return { style: styleName, imageUrl: null }
  }
}

// ===== API Handler =====
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    const body = await context.request.json()

    // Validate request body (reuse hair styles validation - same structure)
    const validation = validateHairStylesRequest(body)
    if (!validation.valid) {
      return createValidationErrorResponse(validation.errors!, corsHeaders)
    }

    const { photo, styles, gender } = validation.data!

    const geminiKey = context.env.GEMINI_API_KEY

    if (!geminiKey) {
      console.error('[generate-fashion-styles] Image generation API not configured')
      return errors.configError(corsHeaders)
    }

    console.log(`[API Fashion] Generating ${styles.length} fashion styles with Gemini for ${gender}`)

    const images = await Promise.all(
      styles.map(styleName => generateFashionImageWithGemini(photo, styleName, gender, geminiKey))
    )

    const successCount = images.filter(r => r.imageUrl).length
    console.log(`[API Fashion] Generated ${successCount}/${styles.length} fashion styles`)

    return new Response(
      JSON.stringify({
        images,
        successCount,
        provider: 'gemini'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (error) {
    console.error('[API Fashion] Error:', error)
    return errors.internal(corsHeaders)
  }
}

export const onRequestOptions: PagesFunction = async (context) => {
  return createCorsPreflightResponse(context.request)
}
