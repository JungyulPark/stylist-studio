interface Env {
  REPLICATE_API_KEY: string
  GEMINI_API_KEY: string
}

interface RequestBody {
  photo: string
  occasion: string
  gender: 'male' | 'female' | 'other'
  styles: string[]
  language: string
}

interface ReplicateResponse {
  id: string
  status: string
  output?: string | string[]
  error?: string
}

// ===== Replicate API =====
async function createReplicatePrediction(
  apiToken: string,
  imageData: string,
  prompt: string
): Promise<string> {
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: 'bc6f7be740ba7227787f7b3a112452aef703c021cec8daf50b91f5528e9f613c',
      input: {
        image: imageData,
        prompt: prompt,
        negative_prompt: 'blurry, bad quality, distorted face, ugly, deformed, disfigured, bad anatomy, wrong proportions, low quality, worst quality, watermark, text, naked, nude, nsfw',
        num_inference_steps: 30,
        guidance_scale: 5,
        ip_adapter_scale: 0.8,
        controlnet_conditioning_scale: 0.8,
        num_outputs: 1,
        scheduler: 'EulerDiscreteScheduler',
        output_format: 'webp',
        output_quality: 90
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Replicate API error: ${response.status} - ${errorText}`)
  }

  const prediction: ReplicateResponse = await response.json()
  return prediction.id
}

async function pollReplicatePrediction(
  apiToken: string,
  predictionId: string,
  maxWaitMs: number = 120000
): Promise<string | null> {
  const startTime = Date.now()

  while (Date.now() - startTime < maxWaitMs) {
    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${predictionId}`,
      {
        headers: { 'Authorization': `Bearer ${apiToken}` }
      }
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

// ===== Fashion Prompt Mapping =====
const fashionPromptDetails: Record<string, Record<string, string>> = {
  male: {
    'luxury': 'wearing luxury designer suit, Gucci or Louis Vuitton style, high-end fashion, elegant, wealthy look',
    'interview': 'wearing professional navy blue suit with crisp white shirt and silk tie, job interview attire, confident',
    'date': 'wearing stylish smart casual outfit, fitted blazer over casual shirt, charming date look',
    'business': 'wearing formal business attire, executive suit, corporate professional look',
    'casual': 'wearing casual weekend outfit, quality t-shirt with well-fitted jeans, relaxed style',
    'party': 'wearing trendy party outfit, fashionable evening wear, stylish and modern',
    'travel': 'wearing comfortable travel outfit, casual but stylish, practical fashion',
    'sports': 'wearing athletic sportswear, fitness outfit, sporty and active look'
  },
  female: {
    'luxury': 'wearing luxury designer dress, Chanel or Dior style, high fashion, elegant and sophisticated',
    'interview': 'wearing professional interview outfit, tailored blazer with elegant blouse, confident and polished',
    'date': 'wearing beautiful date night outfit, feminine and attractive dress, romantic style',
    'business': 'wearing business formal attire, power suit or elegant corporate wear, professional',
    'casual': 'wearing casual chic outfit, stylish everyday wear, comfortable yet fashionable',
    'party': 'wearing glamorous party dress, evening wear, sophisticated and stunning',
    'travel': 'wearing comfortable travel outfit, practical but stylish, effortlessly chic',
    'sports': 'wearing athletic sportswear, yoga or fitness outfit, sporty and fit'
  }
}

// ===== Replicate =====
async function generateFashionImageWithReplicate(
  photo: string,
  styleName: string,
  gender: string,
  apiToken: string
): Promise<{ style: string; imageUrl: string | null }> {
  try {
    const genderWord = gender === 'female' ? 'beautiful woman' : 'handsome man'
    const genderKey = gender === 'female' ? 'female' : 'male'

    const styleKey = styleName.toLowerCase().replace(/\s+/g, '-')
    const styleDetail = fashionPromptDetails[genderKey]?.[styleKey] || `wearing ${styleName} style outfit`

    const prompt = `A ${genderWord} ${styleDetail}, full body fashion photography, professional studio lighting, high quality, same person same face, 8k resolution`

    console.log(`[Replicate Fashion] Generating: ${styleName}`)

    const predictionId = await createReplicatePrediction(apiToken, photo, prompt)
    const outputUrl = await pollReplicatePrediction(apiToken, predictionId)

    if (!outputUrl) {
      console.log(`[Replicate Fashion] No output for: ${styleName}`)
      return { style: styleName, imageUrl: null }
    }

    const base64Image = await fetchImageAsBase64(outputUrl)

    console.log(`[Replicate Fashion] Success: ${styleName}`)
    return { style: styleName, imageUrl: base64Image }
  } catch (error) {
    console.error(`[Replicate Fashion] Error for "${styleName}":`, error)
    return { style: styleName, imageUrl: null }
  }
}

// ===== Gemini Fallback =====
async function generateFashionImageWithGemini(
  photo: string,
  styleName: string,
  apiKey: string
): Promise<{ style: string; imageUrl: string | null }> {
  try {
    const base64Match = photo.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!base64Match) {
      return { style: styleName, imageUrl: null }
    }

    const mimeType = `image/${base64Match[1]}`
    const base64Data = base64Match[2]

    const editPrompt = `EDIT this photo - ONLY change the OUTFIT to match the style: ${styleName}

CRITICAL REQUIREMENTS:
- The person's FACE must remain EXACTLY identical
- Hairstyle must stay the same
- Body proportions must not change
- Only the CLOTHING should be modified to "${styleName}" style

Generate the edited photo with the new outfit.`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`,
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
      console.error(`[Gemini Fashion] Error for ${styleName}:`, response.status)
      return { style: styleName, imageUrl: null }
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
        console.log(`[Gemini Fashion] Success: ${styleName}`)
        return {
          style: styleName,
          imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
        }
      }
    }

    return { style: styleName, imageUrl: null }
  } catch (error) {
    console.error(`[Gemini Fashion] Error for "${styleName}":`, error)
    return { style: styleName, imageUrl: null }
  }
}

// ===== Replicate -> Gemini Fallback =====
async function generateFashionImage(
  photo: string,
  styleName: string,
  gender: string,
  replicateToken: string | undefined,
  geminiKey: string | undefined
): Promise<{ style: string; imageUrl: string | null }> {
  // 1. Replicate (InstantID)
  if (replicateToken) {
    const result = await generateFashionImageWithReplicate(photo, styleName, gender, replicateToken)
    if (result.imageUrl) {
      return result
    }
    console.log(`[Fallback] Replicate failed for ${styleName}, trying Gemini...`)
  }

  // 2. Gemini fallback
  if (geminiKey) {
    return await generateFashionImageWithGemini(photo, styleName, geminiKey)
  }

  return { style: styleName, imageUrl: null }
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
    const { photo, styles, gender } = body

    if (!photo || !styles || styles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Photo and styles are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const replicateToken = context.env.REPLICATE_API_KEY
    const geminiKey = context.env.GEMINI_API_KEY

    if (!replicateToken && !geminiKey) {
      return new Response(
        JSON.stringify({ error: 'API not configured. Please set REPLICATE_API_KEY or GEMINI_API_KEY.' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    console.log(`[API Fashion] Generating ${styles.length} fashion styles with ${replicateToken ? 'Replicate' : 'Gemini'}`)

    const images = await Promise.all(
      styles.map(styleName =>
        generateFashionImage(photo, styleName, gender, replicateToken, geminiKey)
      )
    )

    const successCount = images.filter(r => r.imageUrl).length
    console.log(`[API Fashion] Generated ${successCount}/${styles.length} fashion styles successfully`)

    return new Response(
      JSON.stringify({
        images,
        successCount,
        provider: replicateToken ? 'replicate' : 'gemini'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (error) {
    console.error('[API Fashion] Error:', error)
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
