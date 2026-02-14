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

// Multiple color palettes for variety — selected by diversitySeed
const maleColorPalettes = [
  { tone: 'classic', colors: 'navy, charcoal, white, cream', accent: 'burgundy' },
  { tone: 'warm', colors: 'olive, rust, camel, warm brown', accent: 'burnt orange' },
  { tone: 'cool', colors: 'slate blue, sage green, stone grey, off-white', accent: 'teal' },
  { tone: 'earth', colors: 'terracotta, forest green, tan, chocolate brown', accent: 'mustard' },
  { tone: 'modern', colors: 'black, ivory, silver grey, deep burgundy', accent: 'emerald' },
  { tone: 'coastal', colors: 'sand beige, ocean blue, white linen, light khaki', accent: 'coral' },
  { tone: 'urban', colors: 'graphite, steel blue, bone white, deep indigo', accent: 'amber' },
  { tone: 'vintage', colors: 'cognac brown, cream, denim blue, tobacco', accent: 'copper' },
  { tone: 'nordic', colors: 'charcoal, oatmeal, pine green, light grey', accent: 'sky blue' },
  { tone: 'mediterranean', colors: 'terracotta, linen white, cobalt blue, olive', accent: 'gold' },
]
const femaleColorPalettes = [
  { tone: 'soft', colors: 'cream, dusty rose, beige, champagne', accent: 'gold' },
  { tone: 'warm', colors: 'terracotta, amber, warm ivory, cinnamon', accent: 'copper' },
  { tone: 'cool', colors: 'lavender, ice blue, soft grey, pearl white', accent: 'silver' },
  { tone: 'rich', colors: 'emerald, burgundy, deep plum, midnight blue', accent: 'bronze' },
  { tone: 'fresh', colors: 'sage green, blush pink, sky blue, lemon cream', accent: 'rose gold' },
  { tone: 'romantic', colors: 'mauve, ivory, soft peach, blush', accent: 'pearl' },
  { tone: 'bold', colors: 'deep red, black, cream, royal blue', accent: 'gold' },
  { tone: 'natural', colors: 'oatmeal, olive green, sand, warm taupe', accent: 'amber' },
  { tone: 'pastel', colors: 'baby blue, soft lilac, mint, pale yellow', accent: 'silver' },
  { tone: 'autumn', colors: 'burnt sienna, deep moss, pumpkin, chocolate', accent: 'antique gold' },
]

function getVariedScenarios(diversitySeed: number): StyleScenario[] {
  // Each scenario uses a DIFFERENT palette for color diversity
  const scenarioOffsets = [0, 2, 4, 6, 1, 3]

  function mp(offset: number) {
    return maleColorPalettes[(diversitySeed + offset) % maleColorPalettes.length]
  }
  function fp(offset: number) {
    return femaleColorPalettes[(diversitySeed + offset) % femaleColorPalettes.length]
  }

  return [
    {
      id: 'best-match',
      labelKo: '베스트 매치', labelEn: 'Best Match', labelJa: 'ベストマッチ', labelZh: '最佳搭配', labelEs: 'Mejor Combinación',
      promptMale: (() => { const p = mp(scenarioOffsets[0]); return `clean modern outfit in ${p.tone} tones: fine-knit sweater in ${p.colors.split(', ')[2]}, relaxed-fit chinos in ${p.colors.split(', ')[1]} with natural drape, leather belt, clean sneakers or suede loafers, ${p.accent} accent details — luxury editorial quality, naturally draped tailored silhouette` })(),
      promptFemale: (() => { const p = fp(scenarioOffsets[0]); return `elegant everyday outfit in ${p.tone} tones: soft cashmere V-neck in ${p.colors.split(', ')[0]} or silk blouse in ${p.colors.split(', ')[1]}, high-waisted wide-leg trousers in ${p.colors.split(', ')[2]}, delicate ${p.accent} jewelry, ballet flats — luxury editorial quality, naturally draped elegant silhouette` })(),
    },
    {
      id: 'interview',
      labelKo: '인터뷰룩', labelEn: 'Interview', labelJa: 'インタビュー', labelZh: '面试装', labelEs: 'Entrevista',
      promptMale: (() => { const p = mp(scenarioOffsets[1]); return `professional business outfit: tailored suit in ${p.colors.split(', ')[0]} with natural shoulders, crisp dress shirt in ${p.colors.split(', ')[2]}, ${p.accent} silk tie, polished oxford shoes — luxury editorial quality, naturally draped tailored silhouette` })(),
      promptFemale: (() => { const p = fp(scenarioOffsets[1]); return `sophisticated professional outfit: silk blouse in ${p.colors.split(', ')[1]}, tailored wide-leg pants or pencil skirt in ${p.colors.split(', ')[2]}, delicate pearl earrings, pointed heels — luxury editorial quality, naturally draped elegant silhouette` })(),
    },
    {
      id: 'date',
      labelKo: '데이트룩', labelEn: 'Date Night', labelJa: 'デートルック', labelZh: '约会装', labelEs: 'Cita',
      promptMale: (() => { const p = mp(scenarioOffsets[2]); return `relaxed stylish evening outfit: unstructured soft blazer in ${p.colors.split(', ')[3] || p.colors.split(', ')[0]}, comfortable crew-neck knit in ${p.colors.split(', ')[2]}, relaxed-fit trousers with natural drape, clean leather shoes — luxury editorial quality, naturally draped tailored silhouette` })(),
      promptFemale: (() => { const p = fp(scenarioOffsets[2]); return `romantic evening outfit: elegant midi dress in ${p.colors.split(', ')[1]} with flattering draping, delicate fabric, ${p.accent} jewelry, strappy heels — luxury editorial quality, naturally draped elegant silhouette` })(),
    },
    {
      id: 'luxury',
      labelKo: '럭셔리', labelEn: 'Luxury', labelJa: 'ラグジュアリー', labelZh: '奢华', labelEs: 'Lujo',
      promptMale: (() => { const p = mp(scenarioOffsets[3]); return `luxurious outfit: premium cashmere overcoat in ${p.colors.split(', ')[1]}, fine merino turtleneck in ${p.colors.split(', ')[2]}, relaxed tailored trousers in ${p.colors.split(', ')[0]} with natural drape, Italian leather shoes — luxury editorial quality, naturally draped tailored silhouette` })(),
      promptFemale: (() => { const p = fp(scenarioOffsets[3]); return `luxurious outfit: stunning cashmere coat in ${p.colors.split(', ')[2]} over silk blouse in ${p.colors.split(', ')[0]}, elegant pleated midi skirt, ${p.accent} statement jewelry, premium leather bag, classic pumps — luxury editorial quality, naturally draped elegant silhouette` })(),
    },
    {
      id: 'casual',
      labelKo: '캐주얼', labelEn: 'Casual', labelJa: 'カジュアル', labelZh: '休闲', labelEs: 'Casual',
      promptMale: (() => { const p = mp(scenarioOffsets[4]); return `relaxed weekend outfit: soft cotton sweater in ${p.colors.split(', ')[2]}, oxford shirt in ${p.colors.split(', ')[3] || 'white'} underneath, comfortable straight-leg jeans, clean white sneakers — luxury editorial quality, naturally draped silhouette` })(),
      promptFemale: (() => { const p = fp(scenarioOffsets[4]); return `chic casual outfit: oversized cashmere cardigan in ${p.colors.split(', ')[0]}, simple fitted t-shirt, high-waisted straight-leg jeans, ${p.colors.split(', ')[3] || 'tan'} loafers — luxury editorial quality, naturally draped elegant silhouette` })(),
    },
    {
      id: 'daily',
      labelKo: '데일리', labelEn: 'Daily', labelJa: 'デイリー', labelZh: '日常', labelEs: 'Diario',
      promptMale: (() => { const p = mp(scenarioOffsets[5]); return `smart daily outfit: clean crew-neck sweater in ${p.colors.split(', ')[0]}, comfortable chinos in ${p.colors.split(', ')[2]} with relaxed fit, minimalist leather watch, clean sneakers or loafers, ${p.accent} accent — luxury editorial quality, naturally draped silhouette` })(),
      promptFemale: (() => { const p = fp(scenarioOffsets[5]); return `effortless daily outfit: soft knit top in ${p.colors.split(', ')[1]}, flowing midi skirt or comfortable tailored pants in ${p.colors.split(', ')[2]}, simple ${p.accent} necklace, comfortable flats — luxury editorial quality, naturally draped elegant silhouette` })(),
    }
  ]
}

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

    const editPrompt = `HIGH-END FASHION EDITORIAL — Style this photo as if shooting for Vogue or GQ. The result must look like a professionally styled luxury fashion photograph.

EDIT this photo - ONLY change the OUTFIT of the MAIN PERSON to: ${stylePrompt}

CRITICAL: This is a ${genderWord}. The outfit MUST be appropriate for a ${genderWord}. Choose clothing that flatters THIS specific person's body proportions and complexion.
${gender === 'female' ? 'STYLING DIRECTION (Max Mara, The Row aesthetic): Naturally draped tailored silhouette with elegant proportions. Use soft, feminine clothing — dresses, blouses, cardigans, skirts in refined colors. Fabrics should have visible weight and texture, draping naturally on the body.' : 'STYLING DIRECTION (Loro Piana, Brunello Cucinelli aesthetic): Naturally draped tailored silhouette with relaxed elegance. Trousers should have comfortable drape with a straight or tapered leg. Jackets sit naturally on shoulders with soft structure. Fabrics have visible weight and texture, falling naturally on the body.'}

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

This is a clothing REPLACEMENT task for the MAIN PERSON only.
Keep the person's HEAD and FACE at the EXACT same position.
The clothes should naturally fit the existing body shape.
DO NOT generate full body if original only shows partial body.

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

    const { photo, language, gender, height, weight } = validation.data!

    const geminiKey = context.env.GEMINI_API_KEY
    const hasPhoto = photo && photo.length > 100

    // Generate diversity seed from user characteristics + timestamp
    const diversitySeed = (parseInt(height || '170') + parseInt(weight || '70') + Date.now()) % maleColorPalettes.length
    const styleScenarios = getVariedScenarios(diversitySeed)

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

    console.log(`[API Styles] Generating ${styleScenarios.length} styles (palette: ${diversitySeed}) with Gemini, hasPhoto: ${hasPhoto}`)

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
