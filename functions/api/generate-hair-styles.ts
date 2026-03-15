import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { validateHairStylesRequest, createValidationErrorResponse } from '../lib/validation'
import { errors } from '../lib/errors'
import { editPhotoWithOpenAI } from '../lib/openai-image'

interface Env {
  GEMINI_API_KEY: string
  OPENAI_API_KEY?: string
}

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 25_000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer))
}

// ===== Gemini Image Editing =====
async function generateHairImageWithGemini(
  photo: string,
  styleName: string,
  gender: string,
  styleIndex: number,
  apiKey: string,
  openaiKey?: string
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

    // 3 distinct but NATURAL, WEARABLE variations
    const maleVariations = [
      { length: 'short, sides tapered, top 3-4cm', texture: 'clean and neat', color: 'natural hair color', volume: 'low, close to head', faceShapeNote: 'Round: add height on top. Square: soften temples.' },
      { length: 'medium, top 5-6cm, sides tapered', texture: 'soft natural texture', color: 'natural hair color', volume: 'medium, natural movement', faceShapeNote: 'Round: adds vertical height. Square: texture softens angles.' },
      { length: 'medium, top 5-7cm, side-parted', texture: 'polished with soft definition', color: 'natural hair color', volume: 'moderate, styled shape', faceShapeNote: 'Round: side part elongates. Square: diagonal part softens.' },
    ]
    const femaleVariations = [
      { length: 'medium, collarbone length', texture: 'layered with face-framing pieces', color: 'natural hair color', volume: 'natural movement', faceShapeNote: 'Round: long layers past chin. Square: layers soften jaw.' },
      { length: 'long, past shoulders', texture: 'soft gentle waves', color: 'natural hair color', volume: 'natural body and flow', faceShapeNote: 'Round: elongates. Heart: volume at mid-length.' },
      { length: 'shoulder length bob', texture: 'sleek with subtle inward curve', color: 'natural hair color', volume: 'smooth and refined', faceShapeNote: 'Oval and heart: flattering. Square: slight layers below jaw.' },
    ]

    const variations = gender === 'female' ? femaleVariations : maleVariations
    const v = variations[styleIndex % variations.length]

    const editPrompt = `You are a top hair designer. Show this person a beautiful, natural hairstyle.

RULE #1 — DO NOT CROP OR ZOOM. Output MUST have IDENTICAL framing as input. Same head position, same body position, same space above head. If input is head-to-chest, output is head-to-chest.

EDIT this photo - change ONLY the HAIRSTYLE to: "${styleName}"
- Hair length: ${v.length}
- Hair texture: ${v.texture}
- Hair color: ${v.color}
- Hair volume: ${v.volume}

${genderGuide}

FACE SHAPE: Classify and adapt. ${v.faceShapeNote}

RULES:
- FACE must remain IDENTICAL — same eyes, nose, mouth, expression. Do NOT regenerate the face.
- Keep ORIGINAL natural hair color. NO accessories, NO unnatural colors.
- Skin tone, pose, background — ZERO changes.
- Result must look like a real salon visit — natural, wearable, NOT extreme or theatrical.
- Apply subtle beauty retouching: smooth skin, even tone, soft lighting.

REMINDER: DO NOT CROP OR ZOOM. Keep IDENTICAL framing as input.

Generate the edited photo.`

    // Try OpenAI gpt-image-1.5 first
    if (openaiKey) {
      try {
        console.log(`[OpenAI] Trying gpt-image-1.5 for hair: ${styleName}`)
        const openaiResult = await editPhotoWithOpenAI(base64Data, mimeType, editPrompt, openaiKey)
        if (openaiResult) {
          console.log(`[OpenAI] Success for hair: ${styleName}`)
          return { style: styleName, imageUrl: openaiResult }
        }
      } catch (e) {
        console.log(`[OpenAI] Error for hair ${styleName}: ${e instanceof Error ? e.message : e}`)
      }
      console.log(`[OpenAI] Failed for hair: ${styleName}, falling back to Gemini`)
    }

    // Fallback to Gemini
    const geminiModels = [
      'gemini-3-pro-image-preview',
      'gemini-2.5-flash-image'
    ]

    let response: Response | null = null
    for (const model of geminiModels) {
      try {
        response = await fetchWithTimeout(
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
                responseModalities: ['IMAGE', 'TEXT']
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
    const openaiKey = context.env.OPENAI_API_KEY

    if (!geminiKey && !openaiKey) {
      console.error('[generate-hair-styles] Image generation API not configured')
      return errors.configError(corsHeaders)
    }

    console.log(`[API Hair] Generating ${styles.length} hairstyles (OpenAI primary, Gemini fallback)`)

    const images = await Promise.all(
      styles.map((styleName, index) => generateHairImageWithGemini(photo, styleName, gender || 'male', index, geminiKey, openaiKey))
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
