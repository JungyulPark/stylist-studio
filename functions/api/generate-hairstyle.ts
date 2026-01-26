interface Env {
  GEMINI_API_KEY: string
}

interface RequestBody {
  photo: string  // Base64 encoded user photo
  hairstyle: string  // Target hairstyle description
  language: 'ko' | 'en' | 'ja' | 'zh' | 'es'
}

const hairstylePrompts: Record<string, { ko: string; en: string; prompt: string }> = {
  'classic-short': {
    ko: '클래식 숏컷',
    en: 'Classic Short',
    prompt: 'classic short haircut, clean and professional, side-parted'
  },
  'textured-crop': {
    ko: '텍스처드 크롭',
    en: 'Textured Crop',
    prompt: 'textured crop haircut, modern messy top, faded sides'
  },
  'slick-back': {
    ko: '슬릭백',
    en: 'Slick Back',
    prompt: 'slicked back hairstyle, polished and sophisticated, gel finish'
  },
  'two-block': {
    ko: '투블럭',
    en: 'Two Block',
    prompt: 'Korean two-block haircut, volume on top, clean undercut sides'
  },
  'wavy-medium': {
    ko: '웨이브 미디움',
    en: 'Wavy Medium',
    prompt: 'medium length wavy hair, natural texture, soft waves'
  },
  'buzz-fade': {
    ko: '버즈 페이드',
    en: 'Buzz Fade',
    prompt: 'buzz cut with fade, clean and minimal, military style'
  },
  'long-layers': {
    ko: '롱 레이어드',
    en: 'Long Layers',
    prompt: 'long layered hair, flowing and natural, face-framing layers'
  },
  'curly-natural': {
    ko: '내추럴 컬리',
    en: 'Natural Curly',
    prompt: 'natural curly hair, defined curls, voluminous'
  },
  'pompadour': {
    ko: '폼파두르',
    en: 'Pompadour',
    prompt: 'modern pompadour, volume on top swept back, tapered sides'
  }
}

async function generateHairstyleImage(
  photo: string,
  hairstyleKey: string,
  apiKey: string
): Promise<string | null> {
  try {
    // Extract base64 data from photo
    const base64Match = photo.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!base64Match) {
      console.error('Invalid photo format')
      return null
    }

    const mimeType = `image/${base64Match[1]}`
    const base64Data = base64Match[2]

    const hairstyle = hairstylePrompts[hairstyleKey]
    if (!hairstyle) {
      console.error('Unknown hairstyle:', hairstyleKey)
      return null
    }

    // Use Gemini 2.0 Flash for image editing
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data
                }
              },
              {
                text: `Transform this person's hairstyle to: ${hairstyle.prompt}

IMPORTANT RULES:
- Keep the EXACT same face, facial features, skin tone, and expression
- ONLY change the hairstyle - nothing else
- Maintain the same lighting and background
- Make it look natural and realistic
- High quality, professional photo result

Generate the edited image with the new hairstyle.`
              }
            ]
          }],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
            temperature: 0.4
          }
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', response.status, errorText)
      return null
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string
            inlineData?: { mimeType: string; data: string }
          }>
        }
      }>
    }

    // Extract generated image
    for (const part of data.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
      }
    }

    return null
  } catch (error) {
    console.error('Error generating hairstyle:', error)
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
    const { photo, hairstyle, language } = body

    if (!photo || !hairstyle) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: photo and hairstyle' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const apiKey = context.env.GEMINI_API_KEY

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const imageUrl = await generateHairstyleImage(photo, hairstyle, apiKey)

    const hairstyleInfo = hairstylePrompts[hairstyle]
    const label = language === 'ko' ? hairstyleInfo?.ko : hairstyleInfo?.en

    return new Response(
      JSON.stringify({
        hairstyle,
        label: label || hairstyle,
        imageUrl,
        success: !!imageUrl
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

// Endpoint to get all available hairstyles
export const onRequestGet: PagesFunction<Env> = async () => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  const hairstyles = Object.entries(hairstylePrompts).map(([id, info]) => ({
    id,
    labelKo: info.ko,
    labelEn: info.en
  }))

  return new Response(
    JSON.stringify({ hairstyles }),
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
