interface Env {
  GEMINI_API_KEY: string
}

interface RequestBody {
  gender: 'male' | 'female' | 'other'
  height: string
  weight: string
  skinTone?: string
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
    prompt: 'elegant casual daily outfit, natural pose, full body fashion photo'
  },
  {
    id: 'interview',
    labelKo: '인터뷰룩',
    labelEn: 'Interview',
    labelJa: 'インタビュー',
    labelZh: '面试装',
    labelEs: 'Entrevista',
    prompt: 'professional interview outfit, business formal attire, confident pose, office setting'
  },
  {
    id: 'date',
    labelKo: '데이트룩',
    labelEn: 'Date Night',
    labelJa: 'デートルック',
    labelZh: '约会装',
    labelEs: 'Cita',
    prompt: 'romantic date night outfit, stylish and charming, soft lighting, elegant restaurant setting'
  },
  {
    id: 'luxury',
    labelKo: '럭셔리',
    labelEn: 'Luxury',
    labelJa: 'ラグジュアリー',
    labelZh: '奢华',
    labelEs: 'Lujo',
    prompt: 'high-end luxury fashion, designer outfit, sophisticated and exclusive, premium quality clothing'
  },
  {
    id: 'business',
    labelKo: '비즈니스',
    labelEn: 'Business',
    labelJa: 'ビジネス',
    labelZh: '商务',
    labelEs: 'Negocios',
    prompt: 'professional business attire, corporate style, polished and authoritative, modern office'
  },
  {
    id: 'elegant',
    labelKo: '고급스러운',
    labelEn: 'Elegant',
    labelJa: 'エレガント',
    labelZh: '优雅',
    labelEs: 'Elegante',
    prompt: 'elegant and refined outfit, graceful styling, timeless fashion, sophisticated appearance'
  },
  {
    id: 'casual',
    labelKo: '캐주얼',
    labelEn: 'Casual',
    labelJa: 'カジュアル',
    labelZh: '休闲',
    labelEs: 'Casual',
    prompt: 'relaxed casual outfit, comfortable yet stylish, weekend vibes, laid-back fashion'
  },
  {
    id: 'party',
    labelKo: '파티룩',
    labelEn: 'Party',
    labelJa: 'パーティー',
    labelZh: '派对',
    labelEs: 'Fiesta',
    prompt: 'glamorous party outfit, festive and eye-catching, nightclub or event setting, trendy fashion'
  },
  {
    id: 'street',
    labelKo: '스트릿',
    labelEn: 'Street Style',
    labelJa: 'ストリート',
    labelZh: '街头',
    labelEs: 'Urbano',
    prompt: 'trendy street style fashion, urban aesthetic, cool and edgy outfit, city background'
  }
]

function buildPrompt(scenario: StyleScenario, gender: string, height: string, weight: string): string {
  const genderDesc = gender === 'male' ? 'handsome young man' :
                     gender === 'female' ? 'beautiful young woman' :
                     'stylish person'

  // Calculate body type hint
  const h = parseInt(height) || 170
  const w = parseInt(weight) || 65
  const bmi = w / ((h / 100) ** 2)

  let bodyDesc = ''
  if (bmi < 18.5) bodyDesc = 'slim and slender'
  else if (bmi < 25) bodyDesc = 'fit and well-proportioned'
  else if (bmi < 30) bodyDesc = 'healthy and solid build'
  else bodyDesc = 'confident presence'

  return `Fashion photography of a ${genderDesc} with ${bodyDesc} physique, ${scenario.prompt}, high quality, professional lighting, magazine editorial style, 4k, detailed clothing texture`
}

async function generateImageWithGemini(prompt: string, apiKey: string): Promise<string | null> {
  try {
    // Using Imagen 3 (Nano Banana Pro)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [
            { prompt: prompt }
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: '3:4',
            personGeneration: 'allow_adult'
          }
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Imagen 3 API error:', response.status, errorText)

      // Fallback to Gemini 2.0 Flash native image generation
      const fallbackResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `Generate an image: ${prompt}` }]
              }
            ],
            generationConfig: {
              responseModalities: ['IMAGE', 'TEXT']
            }
          })
        }
      )

      if (!fallbackResponse.ok) {
        console.error('Fallback also failed')
        return null
      }

      const fallbackData = await fallbackResponse.json() as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              inlineData?: { mimeType: string; data: string }
            }>
          }
        }>
      }

      if (fallbackData.candidates?.[0]?.content?.parts) {
        for (const part of fallbackData.candidates[0].content.parts) {
          if (part.inlineData?.data) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
          }
        }
      }
      return null
    }

    const data = await response.json() as {
      predictions?: Array<{
        bytesBase64Encoded: string
        mimeType: string
      }>
    }

    // Extract image from Imagen 3 response
    if (data.predictions && data.predictions[0]?.bytesBase64Encoded) {
      const mimeType = data.predictions[0].mimeType || 'image/png'
      return `data:${mimeType};base64,${data.predictions[0].bytesBase64Encoded}`
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
    const { gender, height, weight, language } = body

    if (!gender || !height || !weight) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const apiKey = context.env.GEMINI_API_KEY

    if (!apiKey) {
      // Return demo mode with placeholder images
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

    // Generate images in parallel (limited concurrency)
    const results = await Promise.all(
      styleScenarios.map(async (scenario) => {
        const prompt = buildPrompt(scenario, gender, height, weight)
        const imageUrl = await generateImageWithGemini(prompt, apiKey)

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
