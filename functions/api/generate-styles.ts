interface Env {
  GEMINI_API_KEY: string
}

interface RequestBody {
  gender: 'male' | 'female' | 'other'
  height: string
  weight: string
  photo?: string  // Base64 encoded user photo
  language: 'ko' | 'en' | 'ja' | 'zh' | 'es'
}

interface StyleScenario {
  id: string
  labelKo: string
  labelEn: string
  labelJa: string
  labelZh: string
  labelEs: string
  prompt: string
}

const styleScenarios: StyleScenario[] = [
  {
    id: 'best-match',
    labelKo: '베스트 매치',
    labelEn: 'Best Match',
    labelJa: 'ベストマッチ',
    labelZh: '最佳搭配',
    labelEs: 'Mejor Combinación',
    prompt: 'elegant casual daily outfit, clean minimal style'
  },
  {
    id: 'interview',
    labelKo: '인터뷰룩',
    labelEn: 'Interview',
    labelJa: 'インタビュー',
    labelZh: '面试装',
    labelEs: 'Entrevista',
    prompt: 'professional interview outfit, business formal suit, confident'
  },
  {
    id: 'date',
    labelKo: '데이트룩',
    labelEn: 'Date Night',
    labelJa: 'デートルック',
    labelZh: '约会装',
    labelEs: 'Cita',
    prompt: 'romantic date night outfit, stylish and charming, smart casual'
  },
  {
    id: 'luxury',
    labelKo: '럭셔리',
    labelEn: 'Luxury',
    labelJa: 'ラグジュアリー',
    labelZh: '奢华',
    labelEs: 'Lujo',
    prompt: 'high-end luxury designer fashion, premium quality, sophisticated'
  },
  {
    id: 'business',
    labelKo: '비즈니스',
    labelEn: 'Business',
    labelJa: 'ビジネス',
    labelZh: '商务',
    labelEs: 'Negocios',
    prompt: 'professional business attire, corporate style, modern office look'
  },
  {
    id: 'casual',
    labelKo: '캐주얼',
    labelEn: 'Casual',
    labelJa: 'カジュアル',
    labelZh: '休闲',
    labelEs: 'Casual',
    prompt: 'relaxed casual outfit, comfortable streetwear, weekend style'
  }
]

// Edit user's photo with a specific outfit style using Gemini image editing
async function editPhotoWithStyle(
  photo: string,
  scenario: StyleScenario,
  apiKey: string
): Promise<string | null> {
  try {
    const base64Match = photo.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!base64Match) return null

    const mimeType = `image/${base64Match[1]}`
    const base64Data = base64Match[2]

    const editPrompt = `EDIT this photo - ONLY change the OUTFIT to: ${scenario.prompt}

CRITICAL - DO NOT CHANGE:
- Face shape, eyes, nose, mouth, ears - MUST stay IDENTICAL
- Hairstyle and hair color - MUST stay IDENTICAL
- Skin tone - MUST stay IDENTICAL
- Body proportions - MUST stay IDENTICAL
- Expression and pose - MUST stay IDENTICAL

ONLY change the clothes/outfit. Generate the edited photo.`

    let response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
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
      console.error(`Photo edit failed for ${scenario.id}:`, response.status)
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
    console.error(`Error editing photo for ${scenario.id}:`, error)
    return null
  }
}

function buildPrompt(scenario: StyleScenario, gender: string, height: string, weight: string, photoDescription: string): string {
  const genderDesc = gender === 'male' ? 'man' : gender === 'female' ? 'woman' : 'person'

  // Parse photo description if available
  let appearanceDesc = ''
  if (photoDescription) {
    const lines = photoDescription.split('\n')
    const traits: string[] = []

    for (const line of lines) {
      if (line.includes('ETHNICITY:')) traits.push(line.split(':')[1]?.trim())
      if (line.includes('SKIN_TONE:')) traits.push(line.split(':')[1]?.trim() + ' skin')
      if (line.includes('HAIR_COLOR:')) traits.push(line.split(':')[1]?.trim() + ' hair')
      if (line.includes('HAIR_STYLE:')) traits.push(line.split(':')[1]?.trim())
      if (line.includes('AGE_RANGE:')) traits.push('in ' + line.split(':')[1]?.trim())
    }

    appearanceDesc = traits.filter(t => t && t !== 'undefined').join(', ')
  }

  // Calculate body type
  const h = parseInt(height) || 170
  const w = parseInt(weight) || 65
  const bmi = w / ((h / 100) ** 2)

  let bodyDesc = 'fit'
  if (bmi < 18.5) bodyDesc = 'slim'
  else if (bmi < 25) bodyDesc = 'fit and athletic'
  else if (bmi < 30) bodyDesc = 'solid build'
  else bodyDesc = 'confident build'

  const personDesc = appearanceDesc
    ? `${appearanceDesc}, ${bodyDesc} ${genderDesc}`
    : `${bodyDesc} ${genderDesc}`

  return `Fashion editorial photo: ${personDesc} wearing ${scenario.prompt}. Full body shot, studio lighting, clean white background, high fashion magazine quality, 4K resolution, sharp details`
}

async function generateImageWithGemini(prompt: string, apiKey: string): Promise<string | null> {
  try {
    // Try Imagen 3 first
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '3:4',
            personGeneration: 'allow_adult'
          }
        })
      }
    )

    if (response.ok) {
      const data = await response.json() as {
        predictions?: Array<{ bytesBase64Encoded: string; mimeType: string }>
      }

      if (data.predictions?.[0]?.bytesBase64Encoded) {
        const mimeType = data.predictions[0].mimeType || 'image/png'
        return `data:${mimeType};base64,${data.predictions[0].bytesBase64Encoded}`
      }
    }

    // Fallback to Gemini 2.0 Flash
    const fallbackResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: `Generate a fashion photo: ${prompt}` }]
          }],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT']
          }
        })
      }
    )

    if (!fallbackResponse.ok) return null

    const fallbackData = await fallbackResponse.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ inlineData?: { mimeType: string; data: string } }>
        }
      }>
    }

    for (const part of fallbackData.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
      }
    }

    return null
  } catch (error) {
    console.error('Error generating image:', error)
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
    const { gender, height, weight, photo, language } = body

    if (!gender || !height || !weight) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const apiKey = context.env.GEMINI_API_KEY

    if (!apiKey) {
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

    const hasPhoto = photo && photo.length > 100 // base64 photo will be much longer

    // Generate images - use photo editing if photo available, otherwise text-to-image
    const results = await Promise.all(
      styleScenarios.map(async (scenario) => {
        let imageUrl: string | null = null

        if (hasPhoto) {
          // Edit the user's actual photo - preserves their face/body
          imageUrl = await editPhotoWithStyle(photo, scenario, apiKey)
        }

        // Fallback to text-to-image generation if no photo or photo editing failed
        if (!imageUrl) {
          const prompt = buildPrompt(scenario, gender, height, weight, '')
          imageUrl = await generateImageWithGemini(prompt, apiKey)
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

    return new Response(
      JSON.stringify({ styles: results }),
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
