interface Env {
  GEMINI_API_KEY: string
}

interface RequestBody {
  photo: string
  type: 'hairstyle' | 'fashion'
  gender: 'male' | 'female' | 'other'
  language: 'ko' | 'en'
}

interface StyleOption {
  id: string
  ko: string
  en: string
  prompt: string
}

const hairstyles: Record<string, StyleOption[]> = {
  male: [
    { id: 'two-block', ko: '투블럭', en: 'Two Block', prompt: 'Korean two-block haircut with volume on top' },
    { id: 'textured-crop', ko: '텍스처드 크롭', en: 'Textured Crop', prompt: 'textured messy crop with skin fade' },
    { id: 'slick-back', ko: '슬릭백', en: 'Slick Back', prompt: 'slicked back wet look hair' },
    { id: 'pompadour', ko: '폼파두르', en: 'Pompadour', prompt: 'modern pompadour with height' }
  ],
  female: [
    { id: 'long-layers', ko: '롱 레이어드', en: 'Long Layers', prompt: 'long layered hair with face framing' },
    { id: 'bob', ko: '단발', en: 'Bob Cut', prompt: 'sleek chin-length bob cut' },
    { id: 'korean-perm', ko: '코리안 펌', en: 'Korean Perm', prompt: 'soft Korean style perm waves' },
    { id: 'beach-waves', ko: '비치 웨이브', en: 'Beach Waves', prompt: 'loose beach waves natural texture' }
  ]
}

const fashionStyles: Record<string, StyleOption[]> = {
  male: [
    { id: 'business', ko: '비즈니스', en: 'Business', prompt: 'navy suit with white shirt and silk tie, professional' },
    { id: 'casual', ko: '캐주얼', en: 'Casual', prompt: 'white t-shirt, slim blue jeans, white sneakers' },
    { id: 'streetwear', ko: '스트릿', en: 'Streetwear', prompt: 'oversized hoodie, jogger pants, chunky sneakers' },
    { id: 'luxury', ko: '럭셔리', en: 'Luxury', prompt: 'designer luxury outfit, high-end fashion, premium' }
  ],
  female: [
    { id: 'business', ko: '비즈니스', en: 'Business', prompt: 'tailored blazer, pencil skirt, professional elegant' },
    { id: 'casual', ko: '캐주얼', en: 'Casual', prompt: 'cozy sweater, comfortable jeans, casual chic' },
    { id: 'elegant', ko: '엘레강스', en: 'Elegant', prompt: 'elegant midi dress, sophisticated feminine' },
    { id: 'luxury', ko: '럭셔리', en: 'Luxury', prompt: 'designer luxury outfit, high fashion, premium' }
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

    const genderGuide = gender === 'female'
      ? 'This is a WOMAN. Style should be feminine and suit women.'
      : 'This is a MAN. Style should be masculine and suit men. For hair: keep SHORT to MEDIUM length only, no long/flowing hair.'

    const editPrompt = type === 'hairstyle'
      ? `EDIT this photo - ONLY change the HAIRSTYLE to: ${style.prompt}

${genderGuide}

CRITICAL - DO NOT CHANGE:
- Face, eyes, nose, mouth - MUST stay IDENTICAL
- Skin tone and body shape - MUST stay IDENTICAL
- Expression and pose - MUST stay IDENTICAL

ONLY modify the hair.
Also apply subtle beauty retouching: smooth clear skin, even skin tone, soft professional studio lighting.

Generate the edited photo.`
      : `EDIT this photo - ONLY change the OUTFIT to: ${style.prompt}

CRITICAL - DO NOT CHANGE:
- Face and hairstyle - MUST stay IDENTICAL
- Skin tone and body shape - MUST stay IDENTICAL
- Expression and pose - MUST stay IDENTICAL

ONLY change the clothes.
Also apply subtle beauty retouching: smooth clear skin, even skin tone, soft professional studio lighting.

Generate the edited photo.`

    const geminiModels = [
      'nano-banana-pro-preview',
      'gemini-2.0-flash-exp-image-generation'
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
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  try {
    const body: RequestBody = await context.request.json()
    const { photo, type, gender, language } = body

    if (!photo) {
      return new Response(
        JSON.stringify({ error: 'Photo is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const geminiKey = context.env.GEMINI_API_KEY

    if (!geminiKey) {
      return new Response(
        JSON.stringify({ error: 'API not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
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
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}
