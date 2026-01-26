interface Env {
  GEMINI_API_KEY: string
  OPENAI_API_KEY: string
}

interface RequestBody {
  photo: string  // Base64 user photo
  type: 'hairstyle' | 'fashion'
  style: string  // Style description or ID
  gender: 'male' | 'female' | 'other'
  language: 'ko' | 'en'
}

// 헤어스타일 옵션
const hairstyles = {
  male: [
    { id: 'classic-short', ko: '클래식 숏컷', en: 'Classic Short', prompt: 'classic short haircut with clean side part' },
    { id: 'textured-crop', ko: '텍스처드 크롭', en: 'Textured Crop', prompt: 'textured messy crop with skin fade' },
    { id: 'slick-back', ko: '슬릭백', en: 'Slick Back', prompt: 'slicked back wet look hair' },
    { id: 'two-block', ko: '투블럭', en: 'Two Block', prompt: 'Korean two-block haircut with volume on top' },
    { id: 'pompadour', ko: '폼파두르', en: 'Pompadour', prompt: 'modern pompadour with height' },
    { id: 'buzz-fade', ko: '버즈 페이드', en: 'Buzz Fade', prompt: 'buzz cut with high fade' },
    { id: 'curtain', ko: '커튼뱅', en: 'Curtain Bangs', prompt: 'middle part curtain bangs K-style' },
    { id: 'quiff', ko: '퀴프', en: 'Quiff', prompt: 'textured quiff swept up' },
    { id: 'long-flow', ko: '롱 플로우', en: 'Long Flow', prompt: 'medium long flowing hair' }
  ],
  female: [
    { id: 'long-layers', ko: '롱 레이어드', en: 'Long Layers', prompt: 'long layered hair with face framing' },
    { id: 'bob', ko: '단발', en: 'Bob Cut', prompt: 'sleek chin-length bob cut' },
    { id: 'beach-waves', ko: '비치 웨이브', en: 'Beach Waves', prompt: 'loose beach waves natural texture' },
    { id: 'pixie', ko: '픽시컷', en: 'Pixie Cut', prompt: 'short chic pixie cut' },
    { id: 'korean-perm', ko: '코리안 펌', en: 'Korean Perm', prompt: 'soft Korean style perm waves' },
    { id: 'straight', ko: '스트레이트', en: 'Straight Long', prompt: 'long sleek straight hair' },
    { id: 'curtain', ko: '커튼뱅', en: 'Curtain Bangs', prompt: 'curtain bangs with soft layers' },
    { id: 'ponytail', ko: '포니테일', en: 'Ponytail', prompt: 'sleek high ponytail' },
    { id: 'lob', ko: '로브', en: 'Long Bob', prompt: 'shoulder length long bob' }
  ]
}

// 패션 스타일 옵션
const fashionStyles = {
  male: [
    { id: 'business', ko: '비즈니스', en: 'Business', prompt: 'wearing navy suit with white shirt and tie' },
    { id: 'casual', ko: '캐주얼', en: 'Casual', prompt: 'wearing white t-shirt and slim jeans with sneakers' },
    { id: 'smart-casual', ko: '스마트 캐주얼', en: 'Smart Casual', prompt: 'wearing blazer over polo shirt with chinos' },
    { id: 'streetwear', ko: '스트릿웨어', en: 'Streetwear', prompt: 'wearing hoodie and joggers with sneakers' },
    { id: 'formal', ko: '포멀', en: 'Formal', prompt: 'wearing black tuxedo with bow tie' },
    { id: 'preppy', ko: '프레피', en: 'Preppy', prompt: 'wearing sweater over oxford shirt with khakis' }
  ],
  female: [
    { id: 'business', ko: '비즈니스', en: 'Business', prompt: 'wearing tailored blazer with pencil skirt' },
    { id: 'casual', ko: '캐주얼', en: 'Casual', prompt: 'wearing comfortable sweater and jeans' },
    { id: 'elegant', ko: '엘레강스', en: 'Elegant', prompt: 'wearing elegant midi dress' },
    { id: 'streetwear', ko: '스트릿웨어', en: 'Streetwear', prompt: 'wearing crop top and high-waist pants' },
    { id: 'formal', ko: '포멀', en: 'Formal', prompt: 'wearing evening gown' },
    { id: 'romantic', ko: '로맨틱', en: 'Romantic', prompt: 'wearing flowy floral dress' }
  ]
}

async function transformWithGemini(
  photo: string,
  type: 'hairstyle' | 'fashion',
  stylePrompt: string,
  apiKey: string
): Promise<string | null> {
  try {
    const base64Match = photo.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!base64Match) return null

    const mimeType = `image/${base64Match[1]}`
    const base64Data = base64Match[2]

    const editPrompt = type === 'hairstyle'
      ? `EDIT this photo - ONLY change the HAIRSTYLE to: ${stylePrompt}

CRITICAL - DO NOT CHANGE:
- Face shape, eyes, nose, mouth, ears - MUST stay IDENTICAL
- Skin tone and texture - MUST stay IDENTICAL
- Body shape and proportions - MUST stay IDENTICAL
- Expression and pose - MUST stay IDENTICAL
- Background and lighting - MUST stay IDENTICAL

ONLY modify the hair. Generate the edited photo.`
      : `EDIT this photo - ONLY change the OUTFIT to: ${stylePrompt}

CRITICAL - DO NOT CHANGE:
- Face shape, eyes, nose, mouth, ears - MUST stay IDENTICAL
- Hairstyle and hair color - MUST stay IDENTICAL
- Skin tone - MUST stay IDENTICAL
- Body proportions - MUST stay IDENTICAL
- Expression and pose - MUST stay IDENTICAL

ONLY change the clothes/outfit. Generate the edited photo.`

    // Use Gemini 3 Flash for image editing
    let response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${apiKey}`,
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

    // If Gemini 2.0 fails, try Gemini 3 Pro Image
    if (!response.ok) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
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
    }

    if (!response.ok) {
      console.error('Gemini error:', response.status)
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
    console.error('Transform error:', error)
    return null
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  try {
    const body: RequestBody = await context.request.json()
    const { photo, type, style, gender, language } = body

    if (!photo || !type || !style) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const apiKey = context.env.GEMINI_API_KEY
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Get style options based on type and gender
    const genderKey = gender === 'female' ? 'female' : 'male'
    const styleOptions = type === 'hairstyle' ? hairstyles[genderKey] : fashionStyles[genderKey]
    const selectedStyle = styleOptions.find(s => s.id === style)

    if (!selectedStyle) {
      return new Response(
        JSON.stringify({ error: 'Invalid style' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const imageUrl = await transformWithGemini(photo, type, selectedStyle.prompt, apiKey)

    return new Response(
      JSON.stringify({
        success: !!imageUrl,
        imageUrl,
        style: {
          id: selectedStyle.id,
          label: language === 'ko' ? selectedStyle.ko : selectedStyle.en
        }
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

// GET: 사용 가능한 스타일 목록 반환
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  const url = new URL(context.request.url)
  const gender = url.searchParams.get('gender') || 'male'
  const genderKey = gender === 'female' ? 'female' : 'male'

  return new Response(
    JSON.stringify({
      hairstyles: hairstyles[genderKey],
      fashionStyles: fashionStyles[genderKey]
    }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  )
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}
