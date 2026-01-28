interface Env {
  GEMINI_API_KEY: string
  REPLICATE_API_KEY: string
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

interface ReplicateResponse {
  id: string
  status: string
  output?: string | string[]
  error?: string
}

const hairstyles: Record<string, StyleOption[]> = {
  male: [
    { id: 'two-block', ko: '투블럭', en: 'Two Block', prompt: 'Korean two-block haircut with volume on top' },
    { id: 'textured-crop', ko: '텍스처드 크롭', en: 'Textured Crop', prompt: 'textured messy crop with skin fade' },
    { id: 'slick-back', ko: '슬릭백', en: 'Slick Back', prompt: 'slicked back wet look hair' },
    { id: 'pompadour', ko: '폼파두르', en: 'Pompadour', prompt: 'modern pompadour with height' }
  ],
  female: [
    { id: 'long-layers', ko: '롱 레이어드', en: 'Long Layers', prompt: 'long layered hair with face framing' },
    { id: 'bob', ko: '단발', en: 'Bob Cut', prompt: 'sleek chin-length bob cut' },
    { id: 'korean-perm', ko: '코리안 펌', en: 'Korean Perm', prompt: 'soft Korean style perm waves' },
    { id: 'beach-waves', ko: '비치 웨이브', en: 'Beach Waves', prompt: 'loose beach waves natural texture' }
  ]
}

const fashionStyles: Record<string, StyleOption[]> = {
  male: [
    { id: 'business', ko: '비즈니스', en: 'Business', prompt: 'navy suit with white shirt and silk tie, professional' },
    { id: 'casual', ko: '캐주얼', en: 'Casual', prompt: 'white t-shirt, slim blue jeans, white sneakers' },
    { id: 'streetwear', ko: '스트릿', en: 'Streetwear', prompt: 'oversized hoodie, jogger pants, chunky sneakers' },
    { id: 'luxury', ko: '럭셔리', en: 'Luxury', prompt: 'designer luxury outfit, high-end fashion, premium' }
  ],
  female: [
    { id: 'business', ko: '비즈니스', en: 'Business', prompt: 'tailored blazer, pencil skirt, professional elegant' },
    { id: 'casual', ko: '캐주얼', en: 'Casual', prompt: 'cozy sweater, comfortable jeans, casual chic' },
    { id: 'elegant', ko: '엘레강스', en: 'Elegant', prompt: 'elegant midi dress, sophisticated feminine' },
    { id: 'luxury', ko: '럭셔리', en: 'Luxury', prompt: 'designer luxury outfit, high fashion, premium' }
  ]
}

// ===== Replicate Model Versions =====
const INSTANT_ID_VERSION = '2e4785a4d80dadf580077b2244c8d7c05d8e3faac04a04c02d8e099dd2876789'
const FACE_SWAP_VERSION = '278a81e7ebb22db98bcba54de985d22cc1abeead2754eb1f2af717247be69b34'

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
async function transformWithReplicate(
  photo: string,
  type: 'hairstyle' | 'fashion',
  style: StyleOption,
  gender: string,
  apiToken: string
): Promise<string | null> {
  try {
    const genderWord = gender === 'female' ? 'woman' : 'man'

    const prompt = type === 'hairstyle'
      ? `close-up portrait of one single ${genderWord} with ${style.prompt} hairstyle, solo person, professional portrait photography, studio lighting, high quality, detailed hair texture, 8k resolution`
      : `one single ${genderWord} wearing ${style.prompt}, solo person, fashion photography, professional studio lighting, high quality, 8k resolution`

    console.log(`[Step 1] InstantID: ${style.id}`)

    // Step 1: Generate styled image with InstantID
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
      console.log(`[Step 1] InstantID failed for: ${style.id}`)
      return null
    }

    console.log(`[Step 2] FaceSwap: ${style.id}`)

    // Step 2: Swap original face onto styled image
    const fusionId = await createPrediction(apiToken, FACE_SWAP_VERSION, {
      input_image: styledImageUrl,
      swap_image: photo
    })

    const fusedImageUrl = await pollPrediction(apiToken, fusionId, 30000)

    if (!fusedImageUrl) {
      console.log(`[Step 2] FaceSwap failed, using InstantID result: ${style.id}`)
      return await fetchImageAsBase64(styledImageUrl)
    }

    console.log(`[Done] Success with face swap: ${style.id}`)
    return await fetchImageAsBase64(fusedImageUrl)
  } catch (error) {
    console.error(`[Replicate] Error for ${style.id}:`, error)
    return null
  }
}

// ===== Gemini Fallback =====
async function transformWithGemini(
  photo: string,
  type: 'hairstyle' | 'fashion',
  style: StyleOption,
  apiKey: string
): Promise<string | null> {
  try {
    const base64Match = photo.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!base64Match) return null

    const mimeType = `image/${base64Match[1]}`
    const base64Data = base64Match[2]

    const editPrompt = type === 'hairstyle'
      ? `EDIT this photo - ONLY change the HAIRSTYLE to: ${style.prompt}

CRITICAL - DO NOT CHANGE:
- Face, eyes, nose, mouth - MUST stay IDENTICAL
- Skin tone and body shape - MUST stay IDENTICAL
- Expression and pose - MUST stay IDENTICAL

ONLY modify the hair. Generate the edited photo.`
      : `EDIT this photo - ONLY change the OUTFIT to: ${style.prompt}

CRITICAL - DO NOT CHANGE:
- Face and hairstyle - MUST stay IDENTICAL
- Skin tone and body shape - MUST stay IDENTICAL
- Expression and pose - MUST stay IDENTICAL

ONLY change the clothes. Generate the edited photo.`

    const response = await fetch(
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
      console.error(`Gemini error for ${style.id}:`, response.status)
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
    console.error(`Gemini error for ${style.id}:`, error)
    return null
  }
}

// ===== Main Transform (Replicate → Gemini fallback) =====
async function transformImage(
  photo: string,
  type: 'hairstyle' | 'fashion',
  style: StyleOption,
  gender: string,
  language: string,
  replicateToken: string | undefined,
  geminiKey: string | undefined
): Promise<{ id: string; label: string; imageUrl: string | null }> {
  const label = language === 'ko' ? style.ko : style.en
  let imageUrl: string | null = null

  // Priority 1: Replicate 2-step pipeline (best face preservation)
  if (replicateToken) {
    imageUrl = await transformWithReplicate(photo, type, style, gender, replicateToken)
    if (imageUrl) {
      return { id: style.id, label, imageUrl }
    }
    console.log(`[Fallback] Replicate failed for ${style.id}, trying Gemini...`)
  }

  // Priority 2: Gemini photo editing
  if (geminiKey) {
    imageUrl = await transformWithGemini(photo, type, style, geminiKey)
  }

  return { id: style.id, label, imageUrl }
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
    const { photo, type, gender, language } = body

    if (!photo) {
      return new Response(
        JSON.stringify({ error: 'Photo is required' }),
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

    const genderKey = gender === 'female' ? 'female' : 'male'
    const styles = type === 'hairstyle' ? hairstyles[genderKey] : fashionStyles[genderKey]

    console.log(`[transform-batch] Generating ${styles.length} ${type} styles (Replicate: ${!!replicateToken}, Gemini: ${!!geminiKey})`)

    // Generate all 9 styles in parallel
    const results = await Promise.all(
      styles.map(style => transformImage(photo, type, style, gender, language || 'en', replicateToken, geminiKey))
    )

    const successCount = results.filter(r => r.imageUrl).length
    console.log(`[transform-batch] Success: ${successCount}/${styles.length}`)

    return new Response(
      JSON.stringify({
        type,
        results,
        successCount
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
