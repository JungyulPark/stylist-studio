interface Env {
  GEMINI_API_KEY: string
}

interface RequestBody {
  photo: string
  gender: 'male' | 'female' | 'other'
  language: 'ko' | 'en' | 'ja' | 'zh' | 'es'
}

interface HairstyleInfo {
  id: string
  ko: string
  en: string
  prompt: string
}

const maleHairstyles: HairstyleInfo[] = [
  { id: 'classic-short', ko: '클래식 숏컷', en: 'Classic Short', prompt: 'classic short haircut, clean side part, professional' },
  { id: 'textured-crop', ko: '텍스처드 크롭', en: 'Textured Crop', prompt: 'textured crop, messy top, skin fade sides' },
  { id: 'slick-back', ko: '슬릭백', en: 'Slick Back', prompt: 'slicked back hair, polished wet look, sophisticated' },
  { id: 'two-block', ko: '투블럭', en: 'Two Block', prompt: 'Korean two-block cut, volume on top, disconnected sides' },
  { id: 'pompadour', ko: '폼파두르', en: 'Pompadour', prompt: 'modern pompadour, height on top, tapered sides' },
  { id: 'buzz-fade', ko: '버즈 페이드', en: 'Buzz Fade', prompt: 'buzz cut with high fade, clean minimal look' },
  { id: 'curtain-bangs', ko: '커튼뱅', en: 'Curtain Bangs', prompt: 'middle part curtain bangs, soft layers, K-pop style' },
  { id: 'quiff', ko: '퀴프', en: 'Quiff', prompt: 'textured quiff, volume at front, short sides' },
  { id: 'man-bun', ko: '맨번', en: 'Man Bun', prompt: 'long hair tied in man bun, clean undercut' }
]

const femaleHairstyles: HairstyleInfo[] = [
  { id: 'long-layers', ko: '롱 레이어드', en: 'Long Layers', prompt: 'long layered hair, face-framing layers, flowing' },
  { id: 'bob-cut', ko: '단발', en: 'Bob Cut', prompt: 'classic bob cut, chin length, sleek and polished' },
  { id: 'beach-waves', ko: '비치 웨이브', en: 'Beach Waves', prompt: 'loose beach waves, effortless texture, natural' },
  { id: 'pixie-cut', ko: '픽시컷', en: 'Pixie Cut', prompt: 'modern pixie cut, short and chic, textured' },
  { id: 'korean-perm', ko: '코리안 펌', en: 'Korean Perm', prompt: 'soft Korean perm, natural waves, voluminous' },
  { id: 'straight-long', ko: '스트레이트 롱', en: 'Straight Long', prompt: 'long straight hair, sleek and shiny, middle part' },
  { id: 'curtain-bangs', ko: '커튼뱅', en: 'Curtain Bangs', prompt: 'curtain bangs with layers, soft face-framing' },
  { id: 'high-ponytail', ko: '하이 포니테일', en: 'High Ponytail', prompt: 'sleek high ponytail, polished elegant look' },
  { id: 'lob', ko: '로브', en: 'Long Bob', prompt: 'long bob (lob), shoulder length, modern cut' }
]

async function generateHairstyleImage(
  photo: string,
  hairstyle: HairstyleInfo,
  apiKey: string
): Promise<{ id: string; label: string; imageUrl: string | null }> {
  try {
    const base64Match = photo.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!base64Match) {
      return { id: hairstyle.id, label: hairstyle.en, imageUrl: null }
    }

    const mimeType = `image/${base64Match[1]}`
    const base64Data = base64Match[2]

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { inlineData: { mimeType, data: base64Data } },
              {
                text: `Edit this photo to change ONLY the hairstyle to: ${hairstyle.prompt}

CRITICAL RULES:
- Keep the EXACT same face, eyes, nose, mouth, skin tone
- Keep the same expression and pose
- ONLY modify the hair
- Maintain same lighting and background
- Result must look natural and realistic
- Professional quality photo

Generate the image with the new hairstyle.`
              }
            ]
          }],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
            temperature: 0.3
          }
        })
      }
    )

    if (!response.ok) {
      console.error('Gemini error for', hairstyle.id, ':', response.status)
      return { id: hairstyle.id, label: hairstyle.en, imageUrl: null }
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
          id: hairstyle.id,
          label: hairstyle.en,
          imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
        }
      }
    }

    return { id: hairstyle.id, label: hairstyle.en, imageUrl: null }
  } catch (error) {
    console.error('Error for', hairstyle.id, ':', error)
    return { id: hairstyle.id, label: hairstyle.en, imageUrl: null }
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
    const { photo, gender, language } = body

    if (!photo) {
      return new Response(
        JSON.stringify({ error: 'Photo is required for hairstyle generation' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const apiKey = context.env.GEMINI_API_KEY
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Select hairstyles based on gender
    const hairstyles = gender === 'female' ? femaleHairstyles : maleHairstyles

    // Generate all hairstyles in parallel (limit concurrency to avoid rate limits)
    const results = await Promise.all(
      hairstyles.map(style => generateHairstyleImage(photo, style, apiKey))
    )

    // Add localized labels
    const localizedResults = results.map((result, index) => ({
      ...result,
      label: language === 'ko' ? hairstyles[index].ko : hairstyles[index].en
    }))

    return new Response(
      JSON.stringify({ hairstyles: localizedResults }),
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
