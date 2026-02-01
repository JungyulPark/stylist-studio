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
  promptMale: string
  promptFemale: string
}

const styleScenarios: StyleScenario[] = [
  {
    id: 'best-match',
    labelKo: '베스트 매치',
    labelEn: 'Best Match',
    labelJa: 'ベストマッチ',
    labelZh: '最佳搭配',
    labelEs: 'Mejor Combinación',
    promptMale: 'clean minimalist everyday outfit for a man, simple solid colors, basic wardrobe essentials like white tee and well-fitted jeans or chinos, understated and versatile masculine style',
    promptFemale: 'clean minimalist everyday outfit for a woman, simple solid colors, basic wardrobe essentials like fitted blouse and well-fitted jeans or elegant trousers, understated feminine style'
  },
  {
    id: 'interview',
    labelKo: '인터뷰룩',
    labelEn: 'Interview',
    labelJa: 'インタビュー',
    labelZh: '面试装',
    labelEs: 'Entrevista',
    promptMale: 'professional interview outfit for a man, business formal navy or charcoal suit with white dress shirt and tie, confident masculine look',
    promptFemale: 'professional interview outfit for a woman, elegant blazer with blouse and pencil skirt or tailored trousers, confident feminine business attire'
  },
  {
    id: 'date',
    labelKo: '데이트룩',
    labelEn: 'Date Night',
    labelJa: 'デートルック',
    labelZh: '约会装',
    labelEs: 'Cita',
    promptMale: 'romantic evening date outfit for a man, stylish blazer or leather jacket, dark sophisticated colors, charming and attractive masculine look for dinner date',
    promptFemale: 'romantic evening date outfit for a woman, elegant dress or stylish blouse with skirt, feminine and attractive look with sophisticated colors for dinner date'
  },
  {
    id: 'luxury',
    labelKo: '럭셔리',
    labelEn: 'Luxury',
    labelJa: 'ラグジュアリー',
    labelZh: '奢华',
    labelEs: 'Lujo',
    promptMale: 'high-end luxury designer fashion for a man, premium quality tailored suit or designer casual wear, sophisticated masculine elegance',
    promptFemale: 'high-end luxury designer fashion for a woman, premium quality elegant dress or designer outfit, sophisticated feminine elegance'
  },
  {
    id: 'casual',
    labelKo: '캐주얼',
    labelEn: 'Casual',
    labelJa: 'カジュアル',
    labelZh: '休闲',
    labelEs: 'Casual',
    promptMale: 'relaxed casual outfit for a man, comfortable t-shirt or hoodie with jeans, sneakers, laid-back weekend masculine style',
    promptFemale: 'relaxed casual outfit for a woman, comfortable sweater or cardigan with jeans or casual skirt, sneakers or flats, laid-back weekend feminine style'
  },
  {
    id: 'daily',
    labelKo: '데일리',
    labelEn: 'Daily',
    labelJa: 'デイリー',
    labelZh: '日常',
    labelEs: 'Diario',
    promptMale: 'everyday practical outfit for a man, simple and neat casual wear, comfortable for daily activities, effortless masculine style',
    promptFemale: 'everyday practical outfit for a woman, simple and neat casual wear, comfortable for daily activities, effortless feminine style'
  }
]

// ===== Retry Helper =====
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ===== Gemini Image Editing =====
async function editPhotoWithGemini(
  photo: string,
  scenario: StyleScenario,
  gender: string,
  apiKey: string,
  retryCount: number = 0
): Promise<string | null> {
  const MAX_RETRIES = 2

  try {
    const base64Match = photo.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!base64Match) return null

    const mimeType = `image/${base64Match[1]}`
    const base64Data = base64Match[2]

    // Select gender-appropriate prompt
    const stylePrompt = gender === 'female' ? scenario.promptFemale : scenario.promptMale
    const genderWord = gender === 'female' ? 'woman' : 'man'

    const editPrompt = `EDIT this photo - ONLY change the OUTFIT to: ${stylePrompt}

CRITICAL: This is a ${genderWord}. The outfit MUST be appropriate for a ${genderWord}.

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

This is a clothing REPLACEMENT task, not image generation.
Keep the person's HEAD and FACE at the EXACT same position.
The clothes should naturally fit the existing body shape.

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
      // Retry with exponential backoff
      if (retryCount < MAX_RETRIES) {
        const delay = (retryCount + 1) * 2000 // 2s, 4s
        console.log(`[Gemini] Retrying ${scenario.id} in ${delay}ms (attempt ${retryCount + 2}/${MAX_RETRIES + 1})`)
        await sleep(delay)
        return editPhotoWithGemini(photo, scenario, gender, apiKey, retryCount + 1)
      }
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

    // No image in response - retry
    if (retryCount < MAX_RETRIES) {
      const delay = (retryCount + 1) * 2000
      console.log(`[Gemini] No image returned for ${scenario.id}, retrying in ${delay}ms`)
      await sleep(delay)
      return editPhotoWithGemini(photo, scenario, gender, apiKey, retryCount + 1)
    }

    return null
  } catch (error) {
    console.error(`Gemini error for ${scenario.id}:`, error)
    // Retry on exception
    if (retryCount < MAX_RETRIES) {
      const delay = (retryCount + 1) * 2000
      console.log(`[Gemini] Exception for ${scenario.id}, retrying in ${delay}ms`)
      await sleep(delay)
      return editPhotoWithGemini(photo, scenario, gender, apiKey, retryCount + 1)
    }
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

    const { photo, language, gender } = validation.data!

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

    // Stagger requests to avoid rate limiting (500ms between each start)
    const results = await Promise.all(
      styleScenarios.map(async (scenario, index) => {
        // Stagger start times to avoid overwhelming the API
        if (index > 0) {
          await sleep(index * 500)
        }

        let imageUrl: string | null = null

        if (hasPhoto) {
          imageUrl = await editPhotoWithGemini(photo, scenario, gender, geminiKey)
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
