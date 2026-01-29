import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { validateGenerateStylesRequest, createValidationErrorResponse } from '../lib/validation'
import { errors } from '../lib/errors'

interface Env {
  GEMINI_API_KEY: string
}

interface StyleScenario {
  id: string
  labelKo: string
  labelEn: string
  labelJa: string
  labelZh: string
  labelEs: string
  prompt: string
}

const styleScenarios: StyleScenario[] = [
  {
    id: 'best-match',
    labelKo: '베스트 매치',
    labelEn: 'Best Match',
    labelJa: 'ベストマッチ',
    labelZh: '最佳搭配',
    labelEs: 'Mejor Combinación',
    prompt: 'elegant casual daily outfit, clean minimal style'
  },
  {
    id: 'interview',
    labelKo: '인터뷰룩',
    labelEn: 'Interview',
    labelJa: 'インタビュー',
    labelZh: '面试装',
    labelEs: 'Entrevista',
    prompt: 'professional interview outfit, business formal suit, confident'
  },
  {
    id: 'date',
    labelKo: '데이트룩',
    labelEn: 'Date Night',
    labelJa: 'デートルック',
    labelZh: '约会装',
    labelEs: 'Cita',
    prompt: 'romantic date night outfit, stylish and charming, smart casual'
  },
  {
    id: 'luxury',
    labelKo: '럭셔리',
    labelEn: 'Luxury',
    labelJa: 'ラグジュアリー',
    labelZh: '奢华',
    labelEs: 'Lujo',
    prompt: 'high-end luxury designer fashion, premium quality, sophisticated'
  },
  {
    id: 'casual',
    labelKo: '캐주얼',
    labelEn: 'Casual',
    labelJa: 'カジュアル',
    labelZh: '休闲',
    labelEs: 'Casual',
    prompt: 'relaxed casual outfit, comfortable t-shirt or hoodie with jeans, sneakers, laid-back weekend style'
  },
  {
    id: 'daily',
    labelKo: '데일리',
    labelEn: 'Daily',
    labelJa: 'デイリー',
    labelZh: '日常',
    labelEs: 'Diario',
    prompt: 'everyday practical outfit, simple and neat, comfortable for daily activities, effortless style'
  }
]

// ===== Gemini Image Editing =====
async function editPhotoWithGemini(
  photo: string,
  scenario: StyleScenario,
  apiKey: string
): Promise<string | null> {
  try {
    const base64Match = photo.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!base64Match) return null

    const mimeType = `image/${base64Match[1]}`
    const base64Data = base64Match[2]

    const editPrompt = `EDIT this photo - ONLY change the OUTFIT to: ${scenario.prompt}

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
    let lastError: string = ''

    for (const model of geminiModels) {
      try {
        console.log(`[Gemini] Trying model: ${model} for ${scenario.id}`)
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
          console.log(`[Gemini] ${model} succeeded for ${scenario.id}`)
          break
        }
        const errorBody = await response.text()
        lastError = `${model} failed (${response.status}): ${errorBody.substring(0, 500)}`
        console.error(`[Gemini] ${lastError}`)
        response = null // Reset so we try next model
      } catch (e) {
        lastError = `${model} exception: ${e}`
        console.error(`[Gemini] ${lastError}`)
      }
    }

    if (!response || !response.ok) {
      console.error(`[Gemini] All models failed for ${scenario.id}. Last error: ${lastError}`)
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
    console.error(`Gemini error for ${scenario.id}:`, error)
    return null
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    const body = await context.request.json()

    // Validate request body
    const validation = validateGenerateStylesRequest(body)
    if (!validation.valid) {
      return createValidationErrorResponse(validation.errors!, corsHeaders)
    }

    const { photo, language } = validation.data!

    const geminiKey = context.env.GEMINI_API_KEY
    const hasPhoto = photo && photo.length > 100

    if (!geminiKey) {
      const demoResults = styleScenarios.map(scenario => ({
        id: scenario.id,
        label: scenario[`label${language === 'ko' ? 'Ko' : language === 'ja' ? 'Ja' : language === 'zh' ? 'Zh' : language === 'es' ? 'Es' : 'En'}` as keyof StyleScenario] as string,
        imageUrl: null,
        isDemo: true
      }))

      return new Response(
        JSON.stringify({ styles: demoResults, demo: true }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    console.log(`[API Styles] Generating ${styleScenarios.length} styles with Gemini, hasPhoto: ${hasPhoto}, keyLength: ${geminiKey.length}`)

    const results = await Promise.all(
      styleScenarios.map(async (scenario) => {
        let imageUrl: string | null = null

        if (hasPhoto) {
          imageUrl = await editPhotoWithGemini(photo, scenario, geminiKey)
        }

        const labelKey = `label${language === 'ko' ? 'Ko' : language === 'ja' ? 'Ja' : language === 'zh' ? 'Zh' : language === 'es' ? 'Es' : 'En'}` as keyof StyleScenario

        return {
          id: scenario.id,
          label: scenario[labelKey] as string,
          imageUrl,
          isDemo: false
        }
      })
    )

    const successCount = results.filter(r => r.imageUrl).length
    console.log(`[API Styles] Generated ${successCount}/${styleScenarios.length} styles`)

    return new Response(
      JSON.stringify({
        styles: results,
        debug: {
          hasPhoto,
          photoLength: photo?.length || 0,
          successCount,
          totalStyles: styleScenarios.length
        }
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
