import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { validateGenerateStylesRequest, createValidationErrorResponse } from '../lib/validation'
import { errors } from '../lib/errors'
import { editPhotoWithOpenAI } from '../lib/openai-image'

interface Env {
  GEMINI_API_KEY: string
  OPENAI_API_KEY?: string
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

// Modern quiet-luxury color palettes — muted, wearable, editorial
const maleColorPalettes = [
  { tone: 'minimal', colors: 'black, off-white, charcoal, cream', accent: 'silver' },
  { tone: 'coastal', colors: 'navy, white, stone grey, sand', accent: 'tan leather' },
  { tone: 'earth', colors: 'olive, cream, tan, dark brown', accent: 'brass' },
  { tone: 'urban', colors: 'charcoal, white, slate, black', accent: 'gunmetal' },
  { tone: 'warm', colors: 'camel, white, chocolate, cream', accent: 'gold' },
  { tone: 'nordic', colors: 'grey, oatmeal, black, soft white', accent: 'silver' },
  { tone: 'heritage', colors: 'navy, deep burgundy, cream, charcoal', accent: 'gold' },
  { tone: 'natural', colors: 'sage, cream, tan, soft grey', accent: 'brass' },
  { tone: 'dusk', colors: 'deep navy, grey, soft white, stone', accent: 'silver' },
  { tone: 'timber', colors: 'dark brown, cream, olive, charcoal', accent: 'copper' },
]
const femaleColorPalettes = [
  { tone: 'minimal', colors: 'ivory, warm grey, soft black, cream', accent: 'gold' },
  { tone: 'sand', colors: 'warm sand, taupe, soft white, dove grey', accent: 'rose gold' },
  { tone: 'slate', colors: 'cool grey, pale blue, off-white, charcoal', accent: 'silver' },
  { tone: 'sage', colors: 'muted sage, cream, warm beige, soft olive', accent: 'gold' },
  { tone: 'blush', colors: 'dusty pink, cream, light grey, soft taupe', accent: 'pearl' },
  { tone: 'marine', colors: 'navy, crisp white, camel, grey', accent: 'gold' },
  { tone: 'wine', colors: 'deep burgundy, charcoal, cream, stone', accent: 'antique gold' },
  { tone: 'forest', colors: 'deep forest green, cream, tan, charcoal', accent: 'bronze' },
  { tone: 'espresso', colors: 'dark chocolate, cream, camel, soft white', accent: 'gold' },
  { tone: 'cloud', colors: 'soft grey, white, pale taupe, silver grey', accent: 'pearl' },
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
      promptMale: (() => { const p = mp(scenarioOffsets[0]); return `modern clean outfit: well-fitted crewneck knit in ${p.colors.split(', ')[2]}, straight-leg tailored trousers in ${p.colors.split(', ')[1]}, clean minimal sneakers, ${p.accent} leather belt — quiet luxury aesthetic, COS or Zara editorial look, natural relaxed fit` })(),
      promptFemale: (() => { const p = fp(scenarioOffsets[0]); return `modern effortless outfit: relaxed blazer in ${p.colors.split(', ')[0]} over simple crew-neck tee in ${p.colors.split(', ')[3]}, high-waisted straight-leg trousers in ${p.colors.split(', ')[2]}, clean loafers, minimal ${p.accent} jewelry — quiet luxury aesthetic, modern editorial look` })(),
    },
    {
      id: 'interview',
      labelKo: '인터뷰룩', labelEn: 'Interview', labelJa: 'インタビュー', labelZh: '面试装', labelEs: 'Entrevista',
      promptMale: (() => { const p = mp(scenarioOffsets[1]); return `sharp professional outfit: structured blazer in ${p.colors.split(', ')[0]} with relaxed shoulders, clean button-down shirt in ${p.colors.split(', ')[2]}, tailored straight trousers, polished leather shoes — modern business editorial, not stiff or corporate` })(),
      promptFemale: (() => { const p = fp(scenarioOffsets[1]); return `polished professional outfit: tailored blazer in ${p.colors.split(', ')[3]}, silk shirt in ${p.colors.split(', ')[1]}, high-waisted wide-leg trousers in ${p.colors.split(', ')[0]}, pointed-toe flats or low heels — modern professional editorial, clean and confident` })(),
    },
    {
      id: 'date',
      labelKo: '데이트룩', labelEn: 'Date Night', labelJa: 'デートルック', labelZh: '约会装', labelEs: 'Cita',
      promptMale: (() => { const p = mp(scenarioOffsets[2]); return `stylish evening outfit: unstructured soft blazer in ${p.colors.split(', ')[3] || p.colors.split(', ')[0]}, fitted knit polo or mock-neck in ${p.colors.split(', ')[2]}, slim straight trousers, suede loafers — refined date look, effortlessly stylish` })(),
      promptFemale: (() => { const p = fp(scenarioOffsets[2]); return `elegant evening outfit: fitted knit midi dress in ${p.colors.split(', ')[1]} or silk cami top with tailored wide-leg trousers in ${p.colors.split(', ')[0]}, delicate ${p.accent} jewelry, heeled mules — sophisticated and feminine, not overdressed` })(),
    },
    {
      id: 'luxury',
      labelKo: '럭셔리', labelEn: 'Luxury', labelJa: 'ラグジュアリー', labelZh: '奢华', labelEs: 'Lujo',
      promptMale: (() => { const p = mp(scenarioOffsets[3]); return `premium outfit: cashmere overcoat in ${p.colors.split(', ')[1]}, fine-gauge turtleneck in ${p.colors.split(', ')[2]}, well-cut trousers in ${p.colors.split(', ')[0]}, leather Chelsea boots — The Row menswear aesthetic, understated luxury` })(),
      promptFemale: (() => { const p = fp(scenarioOffsets[3]); return `luxurious outfit: long tailored coat in ${p.colors.split(', ')[2]}, cashmere crewneck in ${p.colors.split(', ')[0]}, tailored column midi skirt in ${p.colors.split(', ')[3]}, quality leather bag, pointed-toe boots — quiet luxury, Toteme editorial aesthetic` })(),
    },
    {
      id: 'casual',
      labelKo: '캐주얼', labelEn: 'Casual', labelJa: 'カジュアル', labelZh: '休闲', labelEs: 'Casual',
      promptMale: (() => { const p = mp(scenarioOffsets[4]); return `relaxed weekend outfit: oversized cotton sweatshirt or clean hoodie in ${p.colors.split(', ')[2]}, comfortable straight-leg jeans or cargo pants in ${p.colors.split(', ')[3] || 'washed denim'}, clean white sneakers — effortless off-duty style, modern and comfortable` })(),
      promptFemale: (() => { const p = fp(scenarioOffsets[4]); return `chic casual outfit: oversized knit sweater in ${p.colors.split(', ')[0]}, high-waisted straight-leg jeans, clean sneakers or ${p.colors.split(', ')[3] || 'tan'} leather loafers, simple tote bag — elevated weekend style, comfortable yet polished` })(),
    },
    {
      id: 'daily',
      labelKo: '데일리', labelEn: 'Daily', labelJa: 'デイリー', labelZh: '日常', labelEs: 'Diario',
      promptMale: (() => { const p = mp(scenarioOffsets[5]); return `smart daily outfit: clean t-shirt or lightweight knit in ${p.colors.split(', ')[0]}, well-fitted chinos or relaxed trousers in ${p.colors.split(', ')[2]}, minimal leather watch, clean sneakers — modern daily wear, simple and put-together` })(),
      promptFemale: (() => { const p = fp(scenarioOffsets[5]); return `easy daily outfit: cotton or linen shirt in ${p.colors.split(', ')[1]}, comfortable wide-leg trousers or straight-leg jeans in ${p.colors.split(', ')[2]}, simple flat sandals or sneakers, minimal ${p.accent} necklace — effortless everyday style, clean and modern` })(),
    }
  ]
}

// ===== Retry Helper =====
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ===== Gemini Image Editing =====
function getSilhouetteGuide(gender: string, height?: string, weight?: string): string {
  const h = parseInt(height || '0')
  const w = parseInt(weight || '0')
  if (!h || !w) return ''

  const bmi = w / ((h / 100) ** 2)

  if (gender === 'female') {
    if (bmi < 18.5) return '\nSILHOUETTE: Slim build — add visual volume with layered textures, soft ruffles, and A-line shapes. Warm colors add presence.'
    if (bmi < 23) return '\nSILHOUETTE: Balanced build — most silhouettes work well. Highlight waist with belts or fitted mid-sections for defined proportions.'
    if (bmi < 27) return '\nSILHOUETTE: Curvy build — emphasize slim areas (wrists, ankles, collarbone). X-silhouette with defined waist. Vertical lines and monochromatic tones for a streamlined look.'
    return '\nSILHOUETTE: Fuller build — show slim areas (wrists, ankles, collarbone). Vertical lines and monochromatic tones for streamlined look. X-design with defined waist. Avoid overly tight or baggy.'
  }

  if (bmi < 18.5) return '\nSILHOUETTE: Slim build — add structure with layered pieces, textured fabrics, and structured shoulders to build visual volume.'
  if (bmi < 24) return '\nSILHOUETTE: Balanced build — most fits work well. Clean proportions with well-fitted pieces that follow the body naturally.'
  if (bmi < 28) return '\nSILHOUETTE: Stocky build — vertical lines, monochromatic color flow, and structured fabrics for a lean look. V-shaped layering draws eyes upward.'
  return '\nSILHOUETTE: Fuller build — dark vertical lines and structured fabrics for a streamlined silhouette. V-neck and open collars elongate. Avoid overly tight or boxy cuts.'
}

async function editPhotoWithGemini(
  photo: string,
  scenario: StyleScenario,
  gender: string,
  apiKey: string,
  openaiKey?: string,
  retryCount: number = 0,
  silhouetteGuide: string = ''
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

    const editPrompt = `You are the world's top personal stylist. Your job is to dress this person in the PERFECT outfit that complements their unique skin tone, face shape, and body proportions.

EDIT this photo - ONLY change the OUTFIT of the MAIN PERSON to: ${stylePrompt}

CRITICAL: This is a ${genderWord}. The outfit MUST be appropriate for a ${genderWord}.

STYLING APPROACH — PERSONAL COLOR ANALYSIS:
- Examine skin undertone from the photo:
  * WARM (golden, peachy, yellow): Best in terracotta, olive, camel, mustard, coral, cream. Avoid stark cool tones.
  * COOL (pink, rosy, bluish): Best in navy, lavender, ice blue, emerald, burgundy, pearl white. Avoid warm yellows/oranges.
- Dark skin + warm tones = striking harmony; light skin + cool tones = refined elegance
- The specified color palette is a SUGGESTION — shift shades warmer or cooler to suit this person's undertone
- Quality fabrics with natural texture and drape, not stiff or costume-like
- Avoid overly theatrical, costume-like, neon, or overly saturated outfits — keep it realistic, modern, and tasteful
- Think modern minimalist brands: COS, Zara, Uniqlo, Massimo Dutti — NOT costume or runway-only styles
- Colors should be muted and wearable — NO bright red, pumpkin orange, hot pink, or neon tones
- Prioritize neutral-based outfits with ONE subtle color accent at most
${gender === 'female' ? '- Use soft, feminine clothing — dresses, blouses, cardigans, skirts' : '- Relaxed, comfortable silhouette — NOT tight, NOT skinny fit\n- Trousers with comfortable straight-leg or slightly wide drape, jackets with soft natural shoulders\n- Mix of relaxed tailored fit and easy casual fit — modern men prefer comfort over constriction'}${silhouetteGuide}

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

BODY PROPORTION PRESERVATION (CRITICAL):
- The person's BODY PROPORTIONS must stay EXACTLY the same as the original photo
- LEG LENGTH must be IDENTICAL to the original — do NOT shorten or compress legs
- TORSO-to-LEG ratio must match the original exactly
- Waistline position must stay at the SAME height as in the original photo

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
10. Body proportions (especially leg length) - ZERO distortion allowed

This is a clothing REPLACEMENT task for the MAIN PERSON only.
Keep the person's HEAD and FACE at the EXACT same position.
The clothes should naturally fit the existing body shape.
DO NOT generate full body if original only shows partial body.

Generate the edited photo with IDENTICAL composition to the input.`

    // Try OpenAI gpt-image-1.5 first
    if (openaiKey) {
      console.log(`[OpenAI] Trying gpt-image-1.5 for ${scenario.id}`)
      const openaiResult = await editPhotoWithOpenAI(base64Data, mimeType, editPrompt, openaiKey)
      if (openaiResult) {
        console.log(`[OpenAI] Success for ${scenario.id}`)
        return openaiResult
      }
      console.log(`[OpenAI] Failed for ${scenario.id}, falling back to Gemini`)
    }

    // Fallback to Gemini
    const geminiModels = [
      'gemini-3-pro-image-preview',
      'gemini-2.5-flash-image'
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
        return editPhotoWithGemini(photo, scenario, gender, apiKey, openaiKey, retryCount + 1, silhouetteGuide)
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
      return editPhotoWithGemini(photo, scenario, gender, apiKey, openaiKey, retryCount + 1, silhouetteGuide)
    }

    return null
  } catch (error) {
    console.error(`Gemini error for ${scenario.id}:`, error)
    // Retry on exception
    if (retryCount < MAX_RETRIES) {
      const delay = (retryCount + 1) * 2000
      console.log(`[Gemini] Exception for ${scenario.id}, retrying in ${delay}ms`)
      await sleep(delay)
      return editPhotoWithGemini(photo, scenario, gender, apiKey, openaiKey, retryCount + 1, silhouetteGuide)
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
    const openaiKey = context.env.OPENAI_API_KEY
    const hasPhoto = photo && photo.length > 100

    // Generate diversity seed from user characteristics + timestamp
    const diversitySeed = (parseInt(height || '170') + parseInt(weight || '70') + Date.now()) % maleColorPalettes.length
    const styleScenarios = getVariedScenarios(diversitySeed)

    if (!geminiKey && !openaiKey) {
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

    const silhouetteGuide = getSilhouetteGuide(gender, height, weight)
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
          imageUrl = await editPhotoWithGemini(photo, scenario, gender, geminiKey, openaiKey, 0, silhouetteGuide)
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
