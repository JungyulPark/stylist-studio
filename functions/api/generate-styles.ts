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
  const mi = diversitySeed % maleColorPalettes.length
  const fi = diversitySeed % femaleColorPalettes.length
  const mp = maleColorPalettes[mi]
  const fp = femaleColorPalettes[fi]

  return [
    {
      id: 'best-match',
      labelKo: '베스트 매치', labelEn: 'Best Match', labelJa: 'ベストマッチ', labelZh: '最佳搭配', labelEs: 'Mejor Combinación',
      promptMale: `clean modern outfit in ${mp.tone} tones: fine-knit sweater in ${mp.colors.split(', ')[2]}, perfectly fitted chinos in ${mp.colors.split(', ')[1]}, leather belt, clean sneakers or suede loafers - polished minimalist style with ${mp.accent} accent details`,
      promptFemale: `elegant everyday outfit in ${fp.tone} tones: soft ${fp.colors.split(', ')[0]} cashmere V-neck or silk blouse in ${fp.colors.split(', ')[1]}, high-waisted wide-leg trousers in ${fp.colors.split(', ')[2]}, delicate ${fp.accent} jewelry, ballet flats - refined effortless chic`,
    },
    {
      id: 'interview',
      labelKo: '인터뷰룩', labelEn: 'Interview', labelJa: 'インタビュー', labelZh: '面试装', labelEs: 'Entrevista',
      promptMale: `professional business outfit: tailored suit in ${mp.colors.split(', ')[0]} with subtle texture, crisp dress shirt in ${mp.colors.split(', ')[2]}, ${mp.accent} silk tie, polished oxford shoes - confident executive style`,
      promptFemale: `sophisticated professional outfit: silk blouse in ${fp.colors.split(', ')[1]}, tailored pencil skirt or wide-leg pants in ${fp.colors.split(', ')[2]}, delicate pearl earrings, pointed heels - feminine yet powerful`,
    },
    {
      id: 'date',
      labelKo: '데이트룩', labelEn: 'Date Night', labelJa: 'デートルック', labelZh: '约会装', labelEs: 'Cita',
      promptMale: `relaxed stylish evening outfit: unstructured soft blazer in ${mp.colors.split(', ')[3] || mp.colors.split(', ')[0]}, comfortable crew-neck knit or open-collar shirt in ${mp.colors.split(', ')[2]}, relaxed-fit trousers with natural drape, clean leather shoes - effortlessly charming, NOT too formal or tight`,
      promptFemale: `romantic evening outfit: elegant midi dress in ${fp.colors.split(', ')[1]} with flattering draping, delicate fabric that catches light, ${fp.accent} jewelry, strappy heels - graceful feminine allure`,
    },
    {
      id: 'luxury',
      labelKo: '럭셔리', labelEn: 'Luxury', labelJa: 'ラグジュアリー', labelZh: '奢华', labelEs: 'Lujo',
      promptMale: `luxurious outfit: premium cashmere overcoat in ${mp.colors.split(', ')[1]}, fine merino turtleneck in ${mp.colors.split(', ')[2]}, perfectly tailored trousers in ${mp.colors.split(', ')[0]}, Italian leather shoes - understated opulence`,
      promptFemale: `luxurious outfit: stunning cashmere coat in ${fp.colors.split(', ')[2]} over silk blouse in ${fp.colors.split(', ')[0]}, elegant pleated midi skirt, ${fp.accent} statement jewelry, premium leather bag, classic pumps - timeless haute couture`,
    },
    {
      id: 'casual',
      labelKo: '캐주얼', labelEn: 'Casual', labelJa: 'カジュアル', labelZh: '休闲', labelEs: 'Casual',
      promptMale: `relaxed weekend outfit: soft cotton sweater in ${mp.colors.split(', ')[2]}, well-fitted oxford shirt in ${mp.colors.split(', ')[3] || 'white'} underneath, comfortable dark jeans, clean white sneakers - effortlessly put-together`,
      promptFemale: `chic casual outfit: oversized cashmere cardigan in ${fp.colors.split(', ')[0]}, simple fitted t-shirt, high-waisted straight-leg jeans or cream pants, ${fp.colors.split(', ')[3] || 'tan'} loafers - cozy yet stylish`,
    },
    {
      id: 'daily',
      labelKo: '데일리', labelEn: 'Daily', labelJa: 'デイリー', labelZh: '日常', labelEs: 'Diario',
      promptMale: `smart daily outfit: clean polo or crew-neck sweater in ${mp.colors.split(', ')[0]}, well-fitted chinos in ${mp.colors.split(', ')[2]}, minimalist leather watch, clean sneakers or loafers with ${mp.accent} accent - polished everyday look`,
      promptFemale: `effortless daily outfit: soft knit top in ${fp.colors.split(', ')[1]}, flowing midi skirt or comfortable tailored pants in ${fp.colors.split(', ')[2]}, simple ${fp.accent} necklace, comfortable flats - modern feminine ease`,
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

    const editPrompt = `You are the world's top celebrity stylist, trusted by A-list celebrities and fashion icons. Your styling choices are renowned for being perfectly tailored to each individual's unique body type, skin tone, and personal aura.

EDIT this photo - ONLY change the OUTFIT of the MAIN PERSON to: ${stylePrompt}

CRITICAL: This is a ${genderWord}. The outfit MUST be appropriate for a ${genderWord}. Choose clothing that flatters THIS specific person's body proportions and complexion.
${gender === 'female' ? 'For women: Use soft, feminine clothing - NO masculine suits or blazers. Prefer dresses, blouses, cardigans, skirts in soft colors.' : 'For men: Ensure natural relaxed fit - NOT skin-tight. Trousers should have comfortable drape, jackets should sit naturally on shoulders.'}

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
