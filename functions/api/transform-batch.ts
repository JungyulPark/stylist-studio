import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { validateTransformBatchRequest, createValidationErrorResponse } from '../lib/validation'
import { errors } from '../lib/errors'
import { editPhotoWithOpenAI } from '../lib/openai-image'
import { buildBrandEditPrompt } from '../lib/stylist-prompts'

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 55_000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer))
}

interface Env {
  GEMINI_API_KEY: string
  OPENAI_API_KEY?: string
}

interface StyleOption {
  id: string
  ko: string
  en: string
  prompt: string
}

const hairstyles: Record<string, StyleOption[]> = {
  male: [
    { id: 'clean-short', ko: '클린 숏컷', en: 'Clean Short', prompt: 'Clean, neat short haircut. Sides tapered short, top 3-4cm, well-groomed. Like leaving a premium Korean barber. Natural hair color. Simple, masculine, sharp.' },
    { id: 'textured-medium', ko: '내추럴 미디엄', en: 'Natural Medium', prompt: 'Natural medium-length hair. Top 5-6cm with soft texture and gentle movement, sides neatly tapered. The kind of easy, stylish Korean male hairstyle seen on actors. Natural hair color.' },
    { id: 'comma-part', ko: '가르마 스타일', en: 'Styled Part', prompt: 'Side-parted medium hair with slight volume. Top 5-7cm, parted naturally to one side, styled but not stiff. Clean and modern — like a K-drama lead. Natural hair color.' },
  ],
  female: [
    { id: 'layered-medium', ko: '레이어드 미디', en: 'Layered Medium', prompt: 'Medium layered cut at collarbone length. Soft face-framing layers, natural movement, effortless and modern. Like leaving a premium Seoul salon. Natural hair color.' },
    { id: 'soft-long', ko: '소프트 롱', en: 'Soft Long', prompt: 'Long hair with soft gentle waves. Past shoulders, natural body and flow, romantic and feminine. Healthy, glossy texture. Natural hair color.' },
    { id: 'clean-bob', ko: '클린 밥', en: 'Clean Bob', prompt: 'Shoulder-length clean bob. One-length or slight layers, sleek with subtle inward curve at ends. Chic, modern, put-together. Natural hair color.' },
  ]
}

const fashionStyles: Record<string, StyleOption[]> = {
  male: [
    { id: 'hermes-exec', ko: '에르메스 비즈니스', en: 'Executive', prompt: `Channel Hermes executive elegance. ANALYZE this man's build and coloring, then create the perfect power-meets-craftsmanship look.
The DNA: precision with equestrian ease — unstructured shoulders, sharp trouser lines, extraordinary fabrics (wool gabardine, fine cashmere), horn buttons, glove-stitched edges.
Choose his most flattering combination from: navy blazer + dress shirt + pressed trousers, cashmere sport coat + fine knit + tailored pants, or structured coat + spread-collar shirt.
Polished leather derbies or chelsea boots. Muted sophisticated palette adapted to his skin tone.` },
    { id: 'cucinelli-smart', ko: '쿠치넬리 스마트', en: 'Smart Casual', prompt: `Channel Brunello Cucinelli smart casual. ANALYZE this man's proportions and coloring, then create the ideal warm relaxed elegance.
The DNA: layered fine-gauge knits over spread-collar shirts with collar and cuffs visible, cashmere-blend pieces, single-pleat trousers.
Choose the most flattering layered look from: crewneck sweater over oxford shirt, V-neck cashmere over crisp white shirt, or gilet + polo + trousers.
Suede loafers worn without socks. Earth and warm neutral tones adapted to his coloring. Minimal leather watch.` },
    { id: 'auralee-minimal', ko: '아우라리 미니멀', en: 'Minimal', prompt: `Channel Auralee Japanese minimalism. ANALYZE this man's frame, then create quiet impact through material quality.
The DNA: fabric takes the lead — garment-washed cotton poplin, boiled wool, baby cashmere. Dropped-shoulder seams, relaxed body with clean hems.
Choose from: oversized cotton shirt + dark wool trousers, cashmere crewneck + relaxed pants, or band-collar pullover + straight-leg trousers.
Simple leather sneakers or suede shoes. Matte textures, muted palette. Let the fabric speak.` },
    { id: 'loro-piana', ko: '로로피아나 럭셔리', en: 'Quiet Luxury', prompt: `Channel Loro Piana quiet luxury. ANALYZE this man's build, then create an outfit where extraordinary fabric speaks.
The DNA: razor-clean silhouette, tonal dressing in a single color family across textures. Storm System cashmere or fine merino.
Choose from: cashmere zip-front jacket + merino turtleneck + tailored trousers, unlined cashmere blazer + silk knit + pressed pants, or tonal coat + sweater + slim trousers.
Clean leather shoes. The outfit should whisper wealth through material quality alone.` },
    { id: 'lv-heritage', ko: 'LV 헤리티지', en: 'Heritage Modern', prompt: `Channel Louis Vuitton heritage modern. ANALYZE this man's frame, then reimagine classic patterns for his build.
The DNA: heritage patterns in updated proportions — tweed, herringbone, houndstooth with modern cut.
Choose from: herringbone sport coat + fine knit turtleneck + dark trousers, textured blazer + patterned shirt + pressed pants, or check overcoat + clean knitwear.
Polished boots, bold watch or ring. Classic fabrics, modern proportion.` },
    { id: 'bottega-modern', ko: '보테가 모던', en: 'Urban Modern', prompt: `Channel Bottega Veneta urban modern. ANALYZE this man's build, then create bold contemporary edge.
The DNA: deep colors, architectural shoulders, textured surfaces. Woven intrecciato-inspired details.
Choose from: forest green double-breasted overcoat + black knit + textured trousers, structured leather-accent jacket + dark separates, or architectural coat + half-zip sweater.
Deep palette with one statement accent. Lug-sole boots, matte black accessories.` },
    { id: 'weekend', ko: '위켄드 캐주얼', en: 'Weekend', prompt: `Create elevated weekend casual. ANALYZE this man's style potential, then design off-duty refinement.
The DNA: premium fabrics in relaxed silhouettes — quality over logos.
Choose from: French-terry crewneck + selvedge jeans, cashmere hoodie + relaxed chinos, or cotton overshirt + comfortable trousers.
Clean white leather sneakers. Simple watch with NATO strap. Effortless but never sloppy.` }
  ],
  female: [
    { id: 'hermes-chic', ko: '에르메스 시크', en: 'Polished Chic', prompt: `Channel Hermes polished femininity. ANALYZE this woman's body and coloring, then create the perfect power-meets-elegance look.
The DNA: fitted precision meets feminine power — nipped waist, defined lines, contrasting textures (ribbed knits with quilted leather, wool with shearling).
Choose her most flattering silhouette from: fitted blazer + silk camisole + pencil skirt, structured coat-dress with belt, or tailored blazer + flowing midi skirt.
Pointed-toe leather ankle boots, delicate gold layered necklace. Sharp yet sensual, power-feminine editorial.` },
    { id: 'auralee-soft', ko: '아우라리 소프트', en: 'Soft Minimal', prompt: `Channel Auralee soft femininity. ANALYZE this woman's proportions, then create fabric-first beauty.
The DNA: delicate baby-cashmere, flowing textures with touchable quality. One fitted piece for balance, otherwise soft drape.
Choose from: V-neck cashmere sweater + flowing pleated midi skirt, knit dress with gentle drape, or soft blouse + relaxed wide-leg trousers.
Simple tan suede mules or elegant flats. Delicate rose gold pendant. Muted natural palette.` },
    { id: 'row-modern', ko: '더로우 모던', en: 'Modern Elegant', prompt: `Channel The Row modern elegance. ANALYZE this woman's body, then create pared-back perfection.
The DNA: every seam intentional. Structured simplicity, minimal jewelry, extraordinary fit.
Choose from: sleeveless ribbed knit column dress, fluid silk blouse + high-waisted tailored midi skirt, or structured blazer + wide-leg trousers in tonal palette.
Pointed ballet flats or block-heel boots. Single gold cuff bracelet. Less is more.` },
    { id: 'lv-comfort', ko: 'LV 컴포트', en: 'Comfort Luxe', prompt: `Channel Louis Vuitton comfort luxury. ANALYZE this woman's figure, then create plush approachable femininity.
The DNA: flowing draperies, billowing silhouettes evoking comfort and femininity. Silky textures, graceful movement.
Choose from: champagne silk wrap dress with waist tie, flowing blouse + wide satin trousers, or elegant knit ensemble with soft drape.
Strappy flat leather sandals. Antique gold pendant necklace. Soft, serene, moves gracefully.` },
    { id: 'lemaire-natural', ko: '르메르 내추럴', en: 'Natural', prompt: `Channel Lemaire natural femininity. ANALYZE this woman's proportions, then create Mediterranean warmth.
The DNA: structured naturals — linen, woven textures, south-of-France effortlessness.
Choose from: soft linen blazer + fitted ribbed tank dress, structured cotton separates in warm tones, or belted linen dress with natural drape.
Woven leather flat sandals. Amber drop earrings. The kind of outfit that looks effortless on a terrace.` },
    { id: 'maxmara-classic', ko: '막스마라 클래식', en: 'Timeless', prompt: `Channel Max Mara timeless elegance. ANALYZE this woman's body, then create Italian sophistication that never ages.
The DNA: enduring craft — camel coats, silk blouses, wool-crepe construction. Warm earth tones.
Choose from: cashmere coat draped over shoulders + silk blouse + A-line midi skirt, structured coat-dress in warm neutral, or blazer + cream blouse + tailored trousers.
Nude pointed-toe pumps, cognac leather structured handbag. Timeless, never trendy.` },
    { id: 'weekend', ko: '위켄드 캐주얼', en: 'Weekend', prompt: `Create elevated French-girl weekend style. ANALYZE this woman's figure, then design effortlessly chic casual.
The DNA: carefree femininity — midi skirts with sneakers, oversized knits, woven bags. Never sloppy.
Choose from: oversized cashmere cardigan + fitted tee + midi skirt, relaxed shirt dress belted at waist, or Breton stripe + flowing skirt + sandals.
Clean sneakers or woven sandals. Delicate gold hoop earrings, basket or canvas bag. Chic and carefree.` }
  ]
}

// ===== Gemini Image Editing =====
async function transformWithGemini(
  photo: string,
  type: 'hairstyle' | 'fashion',
  style: StyleOption,
  gender: string,
  apiKey: string,
  openaiKey?: string
): Promise<string | null> {
  try {
    const base64Match = photo.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!base64Match) return null

    const mimeType = `image/${base64Match[1]}`
    const base64Data = base64Match[2]

    const genderGuideHair = gender === 'female'
      ? 'This is a WOMAN. Style should be feminine and suit women.'
      : 'This is a MAN. The hairstyle should suit a man naturally. Perms, soft waves, textured styles are fine. Just avoid overly feminine or women\'s hairstyles.'

    const editPrompt = type === 'hairstyle'
      ? `You are a top hair designer. Show this person a beautiful, natural hairstyle.

RULE #1 — DO NOT CROP OR ZOOM. Output MUST have IDENTICAL framing as input. Same head position, same body position, same space above head.

EDIT this photo - ONLY change the HAIRSTYLE to: ${style.prompt}

${genderGuideHair}

FACE SHAPE: Classify (oval/round/oblong/square/heart) and adapt the style to flatter this face shape.

RULES:
- FACE must remain IDENTICAL — same eyes, nose, mouth, expression. Do NOT regenerate the face.
- Keep ORIGINAL natural hair color. NO accessories, NO unnatural colors.
- Skin tone, pose, background — ZERO changes.
- Result must look like a real salon visit — natural, wearable, NOT extreme.
- Apply subtle beauty retouching: smooth skin, even tone, soft lighting.

REMINDER: DO NOT CROP OR ZOOM. Keep IDENTICAL framing as input.

Generate the edited photo.`
      : buildBrandEditPrompt({ brandDirective: style.prompt, gender })

    // Try OpenAI gpt-image-1.5 first
    if (openaiKey) {
      try {
        console.log(`[OpenAI] Trying gpt-image-1.5 for ${style.id}`)
        const openaiResult = await editPhotoWithOpenAI(base64Data, mimeType, editPrompt, openaiKey)
        if (openaiResult) {
          console.log(`[OpenAI] Success for ${style.id}`)
          return openaiResult
        }
      } catch (e) {
        console.log(`[OpenAI] Error for ${style.id}: ${e instanceof Error ? e.message : e}`)
      }
      console.log(`[OpenAI] Failed for ${style.id}, falling back to Gemini`)
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
          console.log(`[Gemini] ${model} succeeded for ${style.id}`)
          break
        }
        console.log(`[Gemini] ${model} failed (${response.status}) for ${style.id}`)
      } catch (e) {
        console.error(`[Gemini] ${model} error:`, e)
      }
    }

    if (!response || !response.ok) {
      console.error(`[Gemini] All models failed for ${style.id}`)
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
    console.error(`Gemini error for ${style.id}:`, error)
    return null
  }
}

// ===== API Handler =====
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    const body = await context.request.json()

    // Validate request body
    const validation = validateTransformBatchRequest(body)
    if (!validation.valid) {
      return createValidationErrorResponse(validation.errors!, corsHeaders)
    }

    const { photo, type, gender, language } = validation.data!

    const geminiKey = context.env.GEMINI_API_KEY
    const openaiKey = context.env.OPENAI_API_KEY

    if (!geminiKey && !openaiKey) {
      console.error('[transform-batch] Image generation API not configured')
      return errors.configError(corsHeaders)
    }

    const genderKey = gender === 'female' ? 'female' : 'male'
    const styles = type === 'hairstyle' ? hairstyles[genderKey] : fashionStyles[genderKey]

    console.log(`[transform-batch] Generating ${styles.length} ${type} styles (OpenAI primary, Gemini fallback)`)

    const results = await Promise.all(
      styles.map(async (style) => {
        const imageUrl = await transformWithGemini(photo, type, style, genderKey, geminiKey, openaiKey)
        const label = language === 'ko' ? style.ko : style.en
        return { id: style.id, label, imageUrl }
      })
    )

    const successCount = results.filter(r => r.imageUrl).length
    console.log(`[transform-batch] Success: ${successCount}/${styles.length}`)

    return new Response(
      JSON.stringify({
        type,
        results,
        successCount
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
