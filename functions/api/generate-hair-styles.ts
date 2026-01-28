interface Env {
  REPLICATE_API_KEY: string
  GEMINI_API_KEY: string
}

interface RequestBody {
  photo: string
  occasion: string
  vibe: string
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

// ===== Model Versions =====
const INSTANT_ID_VERSION = '2e4785a4d80dadf580077b2244c8d7c05d8e3faac04a04c02d8e099dd2876789'
const FACE_FUSION_VERSION = '52edbb2b42beb4e19242f0c9ad5717211a96c63ff1f0b0320caa518b2745f4f7'

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

// ===== Step 1: InstantID - Generate styled image =====
async function generateStyledImage(
  apiToken: string,
  photo: string,
  prompt: string
): Promise<string | null> {
  const predictionId = await createPrediction(apiToken, INSTANT_ID_VERSION, {
    image: photo,
    prompt: prompt,
    negative_prompt: 'blurry, bad quality, distorted face, ugly, deformed, disfigured, bad anatomy, wrong proportions, low quality, worst quality, watermark, text, multiple people, group photo, crowd',
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

  return await pollPrediction(apiToken, predictionId)
}

// ===== Step 2: FaceFusion - Swap original face onto styled image =====
async function swapFace(
  apiToken: string,
  templateImageUrl: string,
  userFacePhoto: string
): Promise<string | null> {
  const predictionId = await createPrediction(apiToken, FACE_FUSION_VERSION, {
    template_image: templateImageUrl,
    user_image: userFacePhoto
  })

  return await pollPrediction(apiToken, predictionId, 60000)
}

// ===== Replicate 2-Step Pipeline =====
async function generateHairImageWithReplicate(
  photo: string,
  styleName: string,
  gender: string,
  apiToken: string
): Promise<{ style: string; imageUrl: string | null }> {
  try {
    const genderWord = gender === 'female' ? 'woman' : 'man'
    const prompt = `close-up portrait of one single ${genderWord} with ${styleName} hairstyle, solo person, professional portrait photography, studio lighting, high quality, detailed hair texture, 8k resolution`

    console.log(`[Step 1] InstantID generating style: ${styleName}`)

    // Step 1: Generate styled image with InstantID
    const styledImageUrl = await generateStyledImage(apiToken, photo, prompt)

    if (!styledImageUrl) {
      console.log(`[Step 1] InstantID failed for: ${styleName}`)
      return { style: styleName, imageUrl: null }
    }

    console.log(`[Step 2] FaceFusion swapping face: ${styleName}`)

    // Step 2: Swap original face onto styled image
    const fusedImageUrl = await swapFace(apiToken, styledImageUrl, photo)

    if (!fusedImageUrl) {
      // If face swap fails, still return InstantID result
      console.log(`[Step 2] FaceFusion failed, using InstantID result: ${styleName}`)
      const base64Image = await fetchImageAsBase64(styledImageUrl)
      return { style: styleName, imageUrl: base64Image }
    }

    const base64Image = await fetchImageAsBase64(fusedImageUrl)

    console.log(`[Done] Success with face swap: ${styleName}`)
    return { style: styleName, imageUrl: base64Image }
  } catch (error) {
    console.error(`[Replicate] Error for "${styleName}":`, error)
    return { style: styleName, imageUrl: null }
  }
}

// ===== Gemini Fallback =====
async function generateHairImageWithGemini(
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

    const editPrompt = `EDIT this photo - ONLY change the HAIRSTYLE to: ${styleName}

CRITICAL REQUIREMENTS:
- The person's FACE must remain EXACTLY identical (same eyes, nose, mouth, face shape)
- Skin tone must stay the same
- Expression and pose must not change
- Only the HAIR should be modified to "${styleName}" style

Generate the edited photo with the new hairstyle.`

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
      console.error(`[Gemini] Error for ${styleName}:`, response.status)
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
        console.log(`[Gemini] Success: ${styleName}`)
        return {
          style: styleName,
          imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
        }
      }
    }

    return { style: styleName, imageUrl: null }
  } catch (error) {
    console.error(`[Gemini] Error for "${styleName}":`, error)
    return { style: styleName, imageUrl: null }
  }
}

// ===== Replicate -> Gemini Fallback =====
async function generateHairImage(
  photo: string,
  styleName: string,
  gender: string,
  replicateToken: string | undefined,
  geminiKey: string | undefined
): Promise<{ style: string; imageUrl: string | null }> {
  if (replicateToken) {
    const result = await generateHairImageWithReplicate(photo, styleName, gender, replicateToken)
    if (result.imageUrl) {
      return result
    }
    console.log(`[Fallback] Replicate failed for ${styleName}, trying Gemini...`)
  }

  if (geminiKey) {
    return await generateHairImageWithGemini(photo, styleName, geminiKey)
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

    console.log(`[API] Generating ${styles.length} hairstyles (InstantID + FaceFusion pipeline)`)

    const images = await Promise.all(
      styles.map(styleName =>
        generateHairImage(photo, styleName, gender, replicateToken, geminiKey)
      )
    )

    const successCount = images.filter(r => r.imageUrl).length
    console.log(`[API] Generated ${successCount}/${styles.length} hairstyles successfully`)

    return new Response(
      JSON.stringify({
        images,
        successCount,
        provider: replicateToken ? 'replicate' : 'gemini'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (error) {
    console.error('[API] Error:', error)
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
