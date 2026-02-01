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
    promptMale: 'modern minimalist everyday outfit inspired by Loro Piana and Brunello Cucinelli style - clean cashmere knit or premium cotton shirt, well-fitted chinos or tailored pants, understated luxury with impeccable quality fabrics',
    promptFemale: 'modern elegant everyday outfit inspired by The Row and Loro Piana style - luxurious cashmere knit or silk blouse in neutral tones (ivory, camel, soft grey), relaxed tailored pants or midi skirt, effortless quiet luxury aesthetic'
  },
  {
    id: 'interview',
    labelKo: '인터뷰룩',
    labelEn: 'Interview',
    labelJa: 'インタビュー',
    labelZh: '面试装',
    labelEs: 'Entrevista',
    promptMale: 'sophisticated professional outfit inspired by Tom Ford and Zegna - impeccably tailored navy or charcoal suit, crisp white shirt, modern confident look with attention to fit and fabric quality',
    promptFemale: 'chic professional outfit inspired by Chanel and Celine style - elegant tweed jacket or soft structured blazer with feminine blouse, tailored skirt or wide-leg trousers, sophisticated yet approachable - modern French elegance'
  },
  {
    id: 'date',
    labelKo: '데이트룩',
    labelEn: 'Date Night',
    labelJa: 'デートルック',
    labelZh: '约会装',
    labelEs: 'Cita',
    promptMale: 'stylish evening outfit inspired by Saint Laurent and Tom Ford - sleek dark blazer or premium leather jacket, well-fitted dark trousers, sophisticated and attractive masculine elegance for dinner',
    promptFemale: 'romantic evening outfit inspired by Dior and Valentino style - beautiful flowing dress or elegant silk blouse with skirt in refined colors (blush, champagne, soft burgundy), graceful feminine silhouette with modern sophistication'
  },
  {
    id: 'luxury',
    labelKo: '럭셔리',
    labelEn: 'Luxury',
    labelJa: 'ラグジュアリー',
    labelZh: '奢华',
    labelEs: 'Lujo',
    promptMale: 'high-end luxury outfit inspired by Loro Piana and Kiton - finest cashmere coat or premium wool suit, exceptional craftsmanship, understated elegance with the finest fabrics and impeccable tailoring',
    promptFemale: 'high-end luxury outfit inspired by Chanel, Dior and Loro Piana - exquisite designer dress or premium cashmere ensemble, beautiful textures and refined details, timeless feminine elegance with exceptional quality'
  },
  {
    id: 'casual',
    labelKo: '캐주얼',
    labelEn: 'Casual',
    labelJa: 'カジュアル',
    labelZh: '休闲',
    labelEs: 'Casual',
    promptMale: 'elevated casual outfit inspired by Auralee and Lemaire - relaxed premium cotton or linen shirt, comfortable well-cut chinos or relaxed trousers, modern minimalist weekend style with quality basics',
    promptFemale: 'refined casual outfit inspired by Auralee and The Row - soft oversized cashmere sweater or relaxed silk shirt, comfortable wide-leg pants or casual midi skirt, elevated effortless weekend style'
  },
  {
    id: 'daily',
    labelKo: '데일리',
    labelEn: 'Daily',
    labelJa: 'デイリー',
    labelZh: '日常',
    labelEs: 'Diario',
    promptMale: 'everyday refined outfit inspired by COS and Lemaire - clean modern basics with quality fabrics, simple knit or oxford shirt with comfortable tailored pants, effortless contemporary masculine style',
    promptFemale: 'everyday chic outfit inspired by Toteme and Celine - modern minimalist pieces with beautiful draping, elegant knit top or relaxed blouse with easy tailored pants, contemporary feminine simplicity'
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

    const beautyRetouch = gender === 'female'
      ? `BEAUTY ENHANCEMENT for the face:
- Apply soft, natural skin smoothing (reduce wrinkles and blemishes subtly)
- Add gentle soft-focus glow effect on the face
- Even out skin tone with warm, healthy glow
- Enhance with soft studio lighting effect
- Keep the face looking NATURAL - not overly edited`
      : `SUBTLE BEAUTY ENHANCEMENT for the face:
- Apply light natural skin smoothing (reduce blemishes subtly)
- Add subtle soft-focus glow effect on the face
- Even out skin tone slightly for a clean, fresh look
- Keep the face looking NATURAL and masculine - not overly edited`

    const editPrompt = `EDIT this photo - ONLY change the OUTFIT to: ${stylePrompt}

CRITICAL: This is a ${genderWord}. The outfit MUST be appropriate for a ${genderWord}.
${gender === 'female' ? 'For women: Use soft, feminine clothing - NO masculine suits or blazers. Prefer dresses, blouses, cardigans, skirts in soft colors.' : ''}

${beautyRetouch}

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
5. Hairstyle, hair color, skin tone base - ZERO changes allowed
6. Background and pose - ZERO changes allowed
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
