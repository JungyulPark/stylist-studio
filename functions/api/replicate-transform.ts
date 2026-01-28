interface Env {
  REPLICATE_API_KEY: string
  GEMINI_API_KEY: string
}

interface RequestBody {
  photo: string
  type: 'hairstyle' | 'fashion'
  styles: string[]
  gender: 'male' | 'female' | 'other'
  occasion?: string
  vibe?: string
  language: 'ko' | 'en'
}

interface ReplicateResponse {
  id: string
  status: string
  output?: string | string[]
  error?: string
}

// InstantID model version
const INSTANT_ID_VERSION = 'bc6f7be740ba7227787f7b3a112452aef703c021cec8daf50b91f5528e9f613c'

// ===== Hairstyle Prompt Mapping =====
const hairstylePrompts: Record<string, Record<string, string>> = {
  male: {
    'classic-short': 'professional man with classic short haircut, clean side part, well-groomed',
    'textured-crop': 'stylish man with textured messy crop haircut, modern skin fade',
    'slick-back': 'elegant man with slicked back hair, wet look, sophisticated',
    'two-block': 'Korean man with two-block haircut, volume on top, trendy K-style',
    'pompadour': 'man with modern pompadour hairstyle, height and volume',
    'buzz-fade': 'man with buzz cut and high fade, clean and sharp',
    'curtain': 'man with middle part curtain bangs, soft K-pop style',
    'quiff': 'man with textured quiff hairstyle, swept up front',
    'long-flow': 'man with medium long flowing hair, natural waves'
  },
  female: {
    'long-layers': 'beautiful woman with long layered hair, face framing layers',
    'bob': 'elegant woman with sleek chin-length bob cut, sophisticated',
    'beach-waves': 'woman with loose beach waves, natural texture, effortless',
    'pixie': 'chic woman with short pixie cut, modern and bold',
    'korean-perm': 'Korean woman with soft perm waves, gentle curls',
    'straight': 'woman with long sleek straight hair, glossy and smooth',
    'curtain': 'woman with curtain bangs, soft face-framing layers',
    'ponytail': 'woman with sleek high ponytail, polished look',
    'lob': 'woman with shoulder length long bob, modern lob cut'
  }
}

// ===== Fashion Prompt Mapping =====
const fashionPrompts: Record<string, Record<string, string>> = {
  male: {
    'luxury': 'man wearing luxury designer outfit, high-end fashion, premium quality',
    'interview': 'man in professional interview attire, navy suit, white shirt, silk tie',
    'date': 'man in stylish date outfit, smart casual, attractive',
    'business': 'man in business formal wear, corporate style, executive look',
    'casual': 'man in casual outfit, white t-shirt, slim jeans, sneakers',
    'party': 'man in party outfit, trendy evening wear, sophisticated',
    'travel': 'man in comfortable travel outfit, practical yet stylish',
    'sports': 'man in athletic wear, sporty outfit, fitness style'
  },
  female: {
    'luxury': 'woman wearing luxury designer outfit, high fashion, elegant',
    'interview': 'woman in professional interview attire, tailored blazer, sophisticated',
    'date': 'woman in romantic date outfit, feminine and attractive',
    'business': 'woman in business formal wear, corporate chic, powerful',
    'casual': 'woman in casual chic outfit, comfortable yet stylish',
    'party': 'woman in party dress, glamorous evening wear',
    'travel': 'woman in comfortable travel outfit, effortlessly stylish',
    'sports': 'woman in athletic wear, sporty and fit look'
  }
}

// ===== Replicate API =====
async function createPrediction(
  apiToken: string,
  imageUrl: string,
  prompt: string
): Promise<string> {
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: INSTANT_ID_VERSION,
      input: {
        image: imageUrl,
        prompt: prompt,
        negative_prompt: 'blurry, bad quality, distorted face, ugly, deformed, disfigured, bad anatomy, wrong proportions',
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
    const error = await response.text()
    throw new Error(`Replicate API error: ${response.status} - ${error}`)
  }

  const prediction: ReplicateResponse = await response.json()
  return prediction.id
}

async function waitForPrediction(
  apiToken: string,
  predictionId: string,
  maxAttempts: number = 60
): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${predictionId}`,
      {
        headers: { 'Authorization': `Bearer ${apiToken}` }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to get prediction: ${response.status}`)
    }

    const prediction: ReplicateResponse = await response.json()

    if (prediction.status === 'succeeded') {
      const output = prediction.output
      if (Array.isArray(output)) {
        return output[0]
      }
      return output || null
    }

    if (prediction.status === 'failed') {
      console.error('Prediction failed:', prediction.error)
      return null
    }

    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  return null
}

async function urlToBase64(url: string): Promise<string> {
  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce(
      (data, byte) => data + String.fromCharCode(byte),
      ''
    )
  )
  const contentType = response.headers.get('content-type') || 'image/webp'
  return `data:${contentType};base64,${base64}`
}

// ===== Replicate Transform =====
async function transformWithReplicate(
  photo: string,
  type: 'hairstyle' | 'fashion',
  styleName: string,
  gender: string,
  apiToken: string
): Promise<{ style: string; imageUrl: string | null }> {
  try {
    const genderKey = gender === 'female' ? 'female' : 'male'
    const prompts = type === 'hairstyle' ? hairstylePrompts : fashionPrompts

    let prompt = prompts[genderKey]?.[styleName.toLowerCase().replace(/\s+/g, '-')]

    if (!prompt) {
      prompt = type === 'hairstyle'
        ? `${gender === 'female' ? 'woman' : 'man'} with ${styleName} hairstyle, high quality portrait`
        : `${gender === 'female' ? 'woman' : 'man'} wearing ${styleName} outfit, fashion photography`
    }

    prompt += ', professional photography, high resolution, detailed, 8k'

    const predictionId = await createPrediction(apiToken, photo, prompt)
    const outputUrl = await waitForPrediction(apiToken, predictionId)

    if (!outputUrl) {
      return { style: styleName, imageUrl: null }
    }

    const base64Image = await urlToBase64(outputUrl)
    return { style: styleName, imageUrl: base64Image }
  } catch (error) {
    console.error(`Error transforming with Replicate for "${styleName}":`, error)
    return { style: styleName, imageUrl: null }
  }
}

// ===== Gemini Fallback =====
async function transformWithGemini(
  photo: string,
  type: 'hairstyle' | 'fashion',
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

    const editPrompt = type === 'hairstyle'
      ? `Transform this photo to show the person with ${styleName} hairstyle. Keep the face EXACTLY the same. Only change the hair.`
      : `Transform this photo to show the person wearing ${styleName} style outfit. Keep the face and body EXACTLY the same. Only change the clothes.`

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
        return {
          style: styleName,
          imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
        }
      }
    }

    return { style: styleName, imageUrl: null }
  } catch (error) {
    console.error(`Gemini fallback error for "${styleName}":`, error)
    return { style: styleName, imageUrl: null }
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
    const { photo, type, styles, gender } = body

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
        JSON.stringify({ error: 'API not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const results = await Promise.all(
      styles.map(async (styleName) => {
        // Replicate first
        if (replicateToken) {
          const result = await transformWithReplicate(photo, type, styleName, gender, replicateToken)
          if (result.imageUrl) {
            return result
          }
        }

        // Gemini fallback
        if (geminiKey) {
          return await transformWithGemini(photo, type, styleName, geminiKey)
        }

        return { style: styleName, imageUrl: null }
      })
    )

    return new Response(
      JSON.stringify({
        type,
        images: results,
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
