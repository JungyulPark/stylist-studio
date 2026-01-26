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

const fashionStyles: Record<string, StyleOption[]> = {
  male: [
    { id: 'business', ko: '비즈니스', en: 'Business', prompt: 'navy suit with white shirt and silk tie, professional' },
    { id: 'casual', ko: '캐주얼', en: 'Casual', prompt: 'white t-shirt, slim blue jeans, white sneakers' },
    { id: 'smart-casual', ko: '스마트 캐주얼', en: 'Smart Casual', prompt: 'navy blazer, light blue polo, beige chinos' },
    { id: 'streetwear', ko: '스트릿', en: 'Streetwear', prompt: 'oversized hoodie, jogger pants, chunky sneakers' },
    { id: 'formal', ko: '포멀', en: 'Formal', prompt: 'black tuxedo with bow tie, elegant formal wear' },
    { id: 'preppy', ko: '프레피', en: 'Preppy', prompt: 'cable knit sweater over oxford shirt, khaki pants' },
    { id: 'minimalist', ko: '미니멀', en: 'Minimalist', prompt: 'black turtleneck, gray wool pants, clean minimal' },
    { id: 'sporty', ko: '스포티', en: 'Sporty', prompt: 'athletic wear, track jacket, performance outfit' },
    { id: 'luxury', ko: '럭셔리', en: 'Luxury', prompt: 'designer luxury outfit, high-end fashion, premium' }
  ],
  female: [
    { id: 'business', ko: '비즈니스', en: 'Business', prompt: 'tailored blazer, pencil skirt, professional elegant' },
    { id: 'casual', ko: '캐주얼', en: 'Casual', prompt: 'cozy sweater, comfortable jeans, casual chic' },
    { id: 'elegant', ko: '엘레강스', en: 'Elegant', prompt: 'elegant midi dress, sophisticated feminine' },
    { id: 'streetwear', ko: '스트릿', en: 'Streetwear', prompt: 'crop top, high-waist cargo pants, sneakers' },
    { id: 'formal', ko: '포멀', en: 'Formal', prompt: 'beautiful evening gown, formal elegant' },
    { id: 'romantic', ko: '로맨틱', en: 'Romantic', prompt: 'flowy floral dress, soft romantic style' },
    { id: 'minimalist', ko: '미니멀', en: 'Minimalist', prompt: 'clean lines, neutral colors, minimal chic' },
    { id: 'bohemian', ko: '보헤미안', en: 'Bohemian', prompt: 'flowing boho dress, layered accessories' },
    { id: 'luxury', ko: '럭셔리', en: 'Luxury', prompt: 'designer luxury outfit, high fashion, premium' }
  ]
}

async function transformImage(
  photo: string,
  type: 'hairstyle' | 'fashion',
  style: StyleOption,
  apiKey: string,
  language: string
): Promise<{ id: string; label: string; imageUrl: string | null }> {
  try {
    const base64Match = photo.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!base64Match) {
      return { id: style.id, label: language === 'ko' ? style.ko : style.en, imageUrl: null }
    }

    const mimeType = `image/${base64Match[1]}`
    const base64Data = base64Match[2]

    const editPrompt = type === 'hairstyle'
      ? `Transform this person's hairstyle to: ${style.prompt}. Keep the EXACT same face, eyes, skin tone, expression. Only change the hair. Make it look natural and realistic. High quality photo result.`
      : `Change this person's outfit to: ${style.prompt}. Keep the EXACT same face, hairstyle, expression. Only change the clothes. Natural, realistic result. High quality photo.`

    // Gemini 3.0 Pro Image for high quality image editing
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.0-pro-image:generateContent?key=${apiKey}`,
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

    if (!response.ok) {
      console.error(`Gemini error for ${style.id}:`, response.status)
      return { id: style.id, label: language === 'ko' ? style.ko : style.en, imageUrl: null }
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
        return {
          id: style.id,
          label: language === 'ko' ? style.ko : style.en,
          imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
        }
      }
    }

    return { id: style.id, label: language === 'ko' ? style.ko : style.en, imageUrl: null }
  } catch (error) {
    console.error(`Error for ${style.id}:`, error)
    return { id: style.id, label: language === 'ko' ? style.ko : style.en, imageUrl: null }
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
    const { photo, type, gender, language } = body

    if (!photo) {
      return new Response(
        JSON.stringify({ error: 'Photo is required' }),
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

    const genderKey = gender === 'female' ? 'female' : 'male'
    const styles = type === 'hairstyle' ? hairstyles[genderKey] : fashionStyles[genderKey]

    // Generate all 9 styles in parallel
    const results = await Promise.all(
      styles.map(style => transformImage(photo, type, style, apiKey, language || 'en'))
    )

    return new Response(
      JSON.stringify({
        type,
        results,
        successCount: results.filter(r => r.imageUrl).length
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
