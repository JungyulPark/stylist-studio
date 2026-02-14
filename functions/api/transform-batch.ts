import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { validateTransformBatchRequest, createValidationErrorResponse } from '../lib/validation'
import { errors } from '../lib/errors'

interface Env {
  GEMINI_API_KEY: string
}

interface StyleOption {
  id: string
  ko: string
  en: string
  prompt: string
}

const hairstyles: Record<string, StyleOption[]> = {
  male: [
    { id: 'clean-short', ko: '클린 숏컷', en: 'Clean Short', prompt: 'SHORT clean cut — sides closely tapered/faded, top about 2-3cm, neat and minimal. Like a clean crew cut or buzz fade. Very short and sharp. Keep natural hair color. Result should look like a real barber visit.' },
    { id: 'side-part', ko: '사이드 파트', en: 'Side Part', prompt: 'MEDIUM length classic side part — top about 5-7cm swept to one side, sides shorter and tapered, clean and polished. Think classic gentlemen style. Keep natural hair color. Result should look like a real barber visit.' },
    { id: 'textured-crop', ko: '텍스처드 크롭', en: 'Textured Crop', prompt: 'MEDIUM textured crop — top about 4-6cm with natural texture and movement, slightly messy and tousled, sides tapered. Modern and casual. Keep natural hair color. Result should look like a real barber visit.' },
    { id: 'comma-hair', ko: '쉼표 머리', en: 'Comma Hair', prompt: 'MEDIUM-LONG Korean comma hair — top about 7-10cm with a comma-shaped fringe falling to one side, soft and natural texture, sides layered. Trendy and youthful. Keep natural hair color. Result should look like a real salon visit.' },
    { id: 'wavy-natural', ko: '웨이비 내추럴', en: 'Wavy Natural', prompt: 'MEDIUM natural wavy style — top about 6-8cm with soft loose waves, relaxed and effortless volume, sides blended. Casual and approachable. Keep natural hair color. Result should look like a real salon visit.' }
  ],
  female: [
    { id: 'long-straight', ko: '롱 스트레이트', en: 'Long Straight', prompt: 'LONG sleek straight hair — past shoulders, smooth and glossy with subtle face-framing layers, elegant and refined. Keep natural hair color. Result should look like a real salon blowout.' },
    { id: 'shoulder-bob', ko: '숄더 밥', en: 'Shoulder Bob', prompt: 'SHOULDER-LENGTH bob — clean one-length or slightly layered bob ending at shoulders, sleek with subtle inward curve, chic and modern. Keep natural hair color. Result should look like a real salon cut.' },
    { id: 'soft-waves', ko: '소프트 웨이브', en: 'Soft Waves', prompt: 'MEDIUM-LONG soft waves — past shoulders with loose gentle waves, romantic and feminine volume, natural flow. Keep natural hair color. Result should look like a real salon styling.' },
    { id: 'layered-medium', ko: '레이어드 미디', en: 'Layered Medium', prompt: 'MEDIUM layered cut — collarbone length with face-framing layers, natural movement and body, effortless and modern. Keep natural hair color. Result should look like a real salon cut.' },
    { id: 'short-pixie', ko: '숏 픽시', en: 'Short Pixie', prompt: 'SHORT pixie or cropped bob — above ear or chin length, textured and bold, feminine yet edgy, easy to maintain. Keep natural hair color. Result should look like a real salon cut.' }
  ]
}

const fashionStyles: Record<string, StyleOption[]> = {
  male: [
    { id: 'hermes-exec', ko: '에르메스 비즈니스', en: 'Executive', prompt: 'Hermès-inspired executive outfit: unstructured navy wool gabardine blazer with soft natural shoulders and horn buttons, crisp white spread-collar dress shirt, charcoal pressed wool trousers with straight-leg drape, polished black leather derby shoes, minimal gold-dial watch — quiet authority with artisanal precision' },
    { id: 'cucinelli-smart', ko: '쿠치넬리 스마트', en: 'Smart Casual', prompt: 'Brunello Cucinelli-inspired smart casual: oatmeal fine-gauge cashmere crewneck sweater over pale blue oxford shirt with collar and cuffs visible, straight-leg tan cotton chinos with single pleat, tan suede loafers worn without socks, brown woven leather belt — warm relaxed elegance' },
    { id: 'auralee-minimal', ko: '아우라리 미니멀', en: 'Minimal', prompt: 'Auralee-inspired minimal outfit: garment-washed oversized cotton poplin shirt in pale stone with dropped shoulder seams, relaxed straight-leg dark wool trousers with clean hem, simple leather sneakers in off-white, matte silver watch — Japanese quiet luxury where fabric speaks' },
    { id: 'loro-piana', ko: '로로피아나 럭셔리', en: 'Quiet Luxury', prompt: 'Loro Piana-inspired quiet luxury: camel cashmere zip-front bomber jacket over cream merino turtleneck, perfectly tailored charcoal wool flannel trousers with natural drape, polished dark brown leather chelsea boots, brushed gold cufflinks — extraordinary fabric with razor-clean silhouette' },
    { id: 'lv-heritage', ko: 'LV 헤리티지', en: 'Heritage Modern', prompt: 'Louis Vuitton-inspired heritage modern: herringbone tweed sport coat in warm brown tones over fine-knit charcoal turtleneck, dark navy straight-leg wool trousers, polished burgundy leather boots, bold brushed-metal watch — classic patterns reimagined with modern proportion' },
    { id: 'bottega-modern', ko: '보테가 모던', en: 'Urban Modern', prompt: 'Bottega Veneta-inspired urban modern: forest green double-breasted wool overcoat with soft shoulders, black merino half-zip sweater underneath, charcoal wool straight-leg trousers with subtle texture, polished black leather ankle boots with lug sole, matte black watch — bold yet refined contemporary edge' },
    { id: 'weekend', ko: '위켄드 캐주얼', en: 'Weekend', prompt: 'elevated weekend casual: premium cotton French-terry crewneck sweatshirt in heather grey, straight-leg dark indigo selvedge jeans with comfortable relaxed fit, clean white leather sneakers, minimal black dial watch with NATO strap — effortless off-duty refinement' }
  ],
  female: [
    { id: 'hermes-chic', ko: '에르메스 시크', en: 'Polished Chic', prompt: 'Hermès-inspired polished look: tailored cashmere-blend blazer in warm ivory with accentuated waist, silk camisole in champagne underneath, high-waisted pressed wool wide-leg trousers in charcoal, pointed-toe leather ankle boots, delicate gold layered necklace — fitted precision with contrasting textures' },
    { id: 'auralee-soft', ko: '아우라리 소프트', en: 'Soft Minimal', prompt: 'Auralee-inspired soft minimal: oversized baby-cashmere crewneck sweater in dusty rose with dropped shoulders, high-waisted cream straight-leg trousers in garment-dyed cotton, simple tan suede loafers, delicate rose gold pendant — fabric-first Japanese quiet luxury with matte textures' },
    { id: 'row-modern', ko: '더로우 모던', en: 'Modern Elegant', prompt: 'The Row-inspired modern elegance: ivory silk blouse with hidden placket and fluid drape, high-waisted camel wide-leg tailored trousers with knife pleat, pointed ballet flats in nude leather, single gold cuff bracelet, structured leather tote — pared-back perfection where every seam is intentional' },
    { id: 'lv-comfort', ko: 'LV 컴포트', en: 'Comfort Luxe', prompt: 'Louis Vuitton SS26-inspired comfort luxury: flowing champagne silk shirt dress with waist tie and soft billowing sleeves, flat leather sandals in natural tan, antique gold pendant necklace, woven straw clutch — plush approachable femininity with elegant fluidity' },
    { id: 'lemaire-natural', ko: '르메르 내추럴', en: 'Natural', prompt: 'Lemaire-inspired natural outfit: oversized linen-cotton blend blazer in warm sand, fitted ribbed tank in cream, high-waisted oatmeal wide-leg trousers, tan leather flat sandals, amber drop earrings — effortless Mediterranean warmth with clean architectural lines' },
    { id: 'maxmara-classic', ko: '막스마라 클래식', en: 'Timeless', prompt: 'Max Mara-inspired timeless elegance: double-breasted camel wool coat over cream silk blouse with soft bow neckline, high-waisted chocolate brown wool-crepe wide-leg trousers, nude pointed-toe pumps, tortoiseshell sunglasses, cognac leather structured handbag — Italian craftsmanship with enduring feminine sophistication' },
    { id: 'weekend', ko: '위켄드 캐주얼', en: 'Weekend', prompt: 'elevated weekend chic: luxurious oversized cashmere cardigan in soft grey draped open over fitted white cotton tee, high-waisted light-wash straight-leg jeans, clean white leather sneakers, delicate gold hoop earrings, minimalist leather crossbody bag — cozy yet polished off-duty style' }
  ]
}

// ===== Gemini Image Editing =====
async function transformWithGemini(
  photo: string,
  type: 'hairstyle' | 'fashion',
  style: StyleOption,
  gender: string,
  apiKey: string
): Promise<string | null> {
  try {
    const base64Match = photo.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!base64Match) return null

    const mimeType = `image/${base64Match[1]}`
    const base64Data = base64Match[2]

    const genderWord = gender === 'female' ? 'woman' : 'man'
    const genderGuideHair = gender === 'female'
      ? 'This is a WOMAN. Style should be feminine and suit women.'
      : 'This is a MAN. The hairstyle should suit a man naturally. Perms, soft waves, textured styles are fine. Just avoid overly feminine or women\'s hairstyles.'

    const genderGuideFashion = gender === 'female'
      ? 'This is a WOMAN. The outfit MUST be soft and feminine - use dresses, blouses, cardigans, skirts in soft/pastel colors. NO masculine suits, NO blazers, NO formal business wear.'
      : 'This is a MAN. The outfit MUST be masculine and designed for men. Use suits, shirts, masculine jackets, pants - NOT women\'s clothing.'

    const beautyRetouch = gender === 'female'
      ? `BEAUTY ENHANCEMENT for the face:
- Apply soft, natural skin smoothing (reduce wrinkles and blemishes subtly)
- Add gentle soft-focus glow effect on the face
- Even out skin tone with warm, healthy glow
- Keep the face looking NATURAL - not overly edited`
      : `SUBTLE BEAUTY ENHANCEMENT for the face:
- Apply light natural skin smoothing (reduce blemishes subtly)
- Add subtle soft-focus glow effect on the face
- Even out skin tone slightly for a clean, fresh look
- Keep the face looking NATURAL and masculine - not overly edited`

    const editPrompt = type === 'hairstyle'
      ? `EDIT this photo - ONLY change the HAIRSTYLE to: ${style.prompt}

${genderGuideHair}

CRITICAL - DO NOT CHANGE:
- Face, eyes, nose, mouth - MUST stay IDENTICAL
- Skin tone and body shape - MUST stay IDENTICAL
- Expression and pose - MUST stay IDENTICAL
- Hair color - KEEP the ORIGINAL natural hair color, do NOT change it

FORBIDDEN - DO NOT ADD:
- NO hair accessories (clips, pins, ribbons, bows, headbands)
- NO butterfly clips, flower clips, or decorative items
- NO unnatural or fantasy hair colors
- NO extreme or avant-garde hairstyles

ONLY modify the hair shape and style, keeping it natural and realistic.
Also apply subtle beauty retouching: smooth clear skin, even skin tone, soft professional studio lighting.

Generate the edited photo.`
      : `EDIT this photo - ONLY change the OUTFIT of the MAIN PERSON to: ${style.prompt}

CRITICAL: ${genderGuideFashion}

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

This is a clothing REPLACEMENT task for the MAIN ${genderWord} only.
Keep the person's HEAD and FACE at the EXACT same position.
The ${genderWord}'s clothes should naturally fit the existing body shape.
DO NOT generate full body if original only shows partial body.

Generate the edited photo with IDENTICAL composition to the input.`

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

    if (!geminiKey) {
      console.error('[transform-batch] Image generation API not configured')
      return errors.configError(corsHeaders)
    }

    const genderKey = gender === 'female' ? 'female' : 'male'
    const styles = type === 'hairstyle' ? hairstyles[genderKey] : fashionStyles[genderKey]

    console.log(`[transform-batch] Generating ${styles.length} ${type} styles with Gemini`)

    const results = await Promise.all(
      styles.map(async (style) => {
        const imageUrl = await transformWithGemini(photo, type, style, genderKey, geminiKey)
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
