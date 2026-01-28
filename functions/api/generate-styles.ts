interface Env {
  GEMINI_API_KEY: string
  REPLICATE_API_KEY: string
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

interface ReplicateResponse {
  id: string
  status: string
  output?: string | string[]
  error?: string
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
  }
]

// ===== Replicate Model Versions =====
const INSTANT_ID_VERSION = '2e4785a4d80dadf580077b2244c8d7c05d8e3faac04a04c02d8e099dd2876789'

// ===== Replicate Helpers =====
async function createPrediction(
  apiToken: string,
  version: string,
  input: Record<string, unknown>
): Promise<string> {
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ version, input })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Replicate API error: ${response.status} - ${errorText}`)
  }

  const prediction: ReplicateResponse = await response.json()
  return prediction.id
}

async function pollPrediction(
  apiToken: string,
  predictionId: string,
  maxWaitMs: number = 120000
): Promise<string | null> {
  const startTime = Date.now()

  while (Date.now() - startTime < maxWaitMs) {
    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${predictionId}`,
      { headers: { 'Authorization': `Bearer ${apiToken}` } }
    )

    if (!response.ok) {
      throw new Error(`Failed to poll prediction: ${response.status}`)
    }

    const prediction: ReplicateResponse = await response.json()

    if (prediction.status === 'succeeded') {
      const output = prediction.output
      return Array.isArray(output) ? output[0] : (output || null)
    }

    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      console.error('Prediction failed:', prediction.error)
      return null
    }

    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  console.error('Prediction timeout')
  return null
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url)
  const buffer = await response.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64 = btoa(binary)
  const contentType = response.headers.get('content-type') || 'image/webp'
  return `data:${contentType};base64,${base64}`
}

// ===== Replicate 2-Step Pipeline =====
async function generateWithReplicate(
  photo: string,
  scenario: StyleScenario,
  gender: string,
  apiToken: string
): Promise<string | null> {
  try {
    const genderWord = gender === 'female' ? 'woman' : 'man'
    const prompt = `one single ${genderWord} wearing ${scenario.prompt}, solo person, fashion photography, professional studio lighting, high quality, 8k resolution`

    console.log(`[InstantID] Generating: ${scenario.id}`)

    const predictionId = await createPrediction(apiToken, INSTANT_ID_VERSION, {
      image: photo,
      prompt: prompt,
      negative_prompt: 'blurry, bad quality, distorted face, ugly, deformed, disfigured, bad anatomy, wrong proportions, low quality, worst quality, watermark, text, naked, nude, nsfw, multiple people, group photo, crowd',
      num_inference_steps: 30,
      guidance_scale: 7.5,
      ip_adapter_scale: 0.9,
      controlnet_conditioning_scale: 0.8,
      num_outputs: 1,
      scheduler: 'EulerDiscreteScheduler',
      face_detection_input_width: 640,
      face_detection_input_height: 640,
      enhance_nonface_region: true,
      output_format: 'webp',
      output_quality: 90
    })

    const styledImageUrl = await pollPrediction(apiToken, predictionId)
    if (!styledImageUrl) {
      console.log(`[InstantID] Failed for: ${scenario.id}`)
      return null
    }

    console.log(`[InstantID] Success: ${scenario.id}`)
    return await fetchImageAsBase64(styledImageUrl)
  } catch (error) {
    console.error(`[Replicate] Error for ${scenario.id}:`, error)
    return null
  }
}

// ===== Gemini Photo Editing (fallback) =====
async function editPhotoWithGemini(
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

    const geminiModels = [
      'gemini-2.0-flash-exp-image-generation',
      'gemini-2.5-flash-image'
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
          console.log(`[Gemini] ${model} succeeded for ${scenario.id}`)
          break
        }
        console.log(`[Gemini] ${model} failed (${response.status}) for ${scenario.id}, trying next...`)
      } catch (e) {
        console.error(`[Gemini] ${model} error:`, e)
      }
    }

    if (!response || !response.ok) {
      console.error(`[Gemini] All models failed for ${scenario.id}`)
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
    console.error(`Gemini error for ${scenario.id}:`, error)
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

    const replicateToken = context.env.REPLICATE_API_KEY
    const geminiKey = context.env.GEMINI_API_KEY
    const hasPhoto = photo && photo.length > 100

    if (!replicateToken && !geminiKey) {
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

    console.log(`[API Styles] Generating ${styleScenarios.length} styles, hasPhoto: ${hasPhoto}, hasReplicate: ${!!replicateToken}`)

    const results = await Promise.all(
      styleScenarios.map(async (scenario) => {
        let imageUrl: string | null = null

        // Priority 1: Replicate 2-step pipeline (best face preservation)
        if (hasPhoto && replicateToken) {
          imageUrl = await generateWithReplicate(photo, scenario, gender, replicateToken)
          if (imageUrl) {
            console.log(`[Replicate] Success: ${scenario.id}`)
          }
        }

        // Priority 2: Gemini photo editing (decent face preservation)
        if (!imageUrl && hasPhoto && geminiKey) {
          console.log(`[Fallback] Trying Gemini edit for: ${scenario.id}`)
          imageUrl = await editPhotoWithGemini(photo, scenario, geminiKey)
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
    console.log(`[API Styles] Generated ${successCount}/${styleScenarios.length} styles successfully`)

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
