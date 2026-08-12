/**
 * OpenAI gpt-image-1.5 image editing utility
 */

const FETCH_TIMEOUT_MS = 55_000
const RETRY_BASE_MS = 1500
const RETRY_JITTER_MS = 500

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function retryDelay(retryCount: number): number {
  return (retryCount + 1) * RETRY_BASE_MS + Math.random() * RETRY_JITTER_MS
}

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer))
}

export interface OpenAIImageOptions {
  /** gpt-image-1.5 quality tier. Premium one-time products use 'auto'
   * (resolves high); the daily cron pins 'medium' — emails render the
   * image at 240px, so high quality is invisible but 3-4x the cost. */
  quality?: 'low' | 'medium' | 'high' | 'auto'
  /** 시즌 컬렉션 레퍼런스 — 입힐 옷을 보여주는 두 번째 입력 이미지 */
  styleRef?: { base64: string; mimeType: string }
}

/**
 * Edit a photo using OpenAI gpt-image-1.5
 * Returns { result, error } - result is data URI or null, error is message if failed
 */
export async function editPhotoWithOpenAI(
  base64Data: string,
  mimeType: string,
  prompt: string,
  apiKey: string,
  retryCount: number = 0,
  options?: OpenAIImageOptions
): Promise<string | null> {
  const MAX_RETRIES = 1

  try {
    // Convert base64 to Blob for multipart upload
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    const extension = mimeType.split('/')[1] || 'png'
    const file = new File([bytes], `photo.${extension}`, { type: mimeType })

    const formData = new FormData()
    if (options?.styleRef) {
      // gpt-image edit는 image[] 다중 입력을 지원: [사람, 레퍼런스 옷]
      formData.append('image[]', file)
      const refBin = atob(options.styleRef.base64)
      const refBytes = new Uint8Array(refBin.length)
      for (let i = 0; i < refBin.length; i++) refBytes[i] = refBin.charCodeAt(i)
      const refExt = options.styleRef.mimeType.split('/')[1] || 'jpeg'
      formData.append('image[]', new File([refBytes], `style-ref.${refExt}`, { type: options.styleRef.mimeType }))
    } else {
      formData.append('image', file)
    }
    formData.append('prompt', prompt)
    formData.append('model', 'gpt-image-1.5')
    formData.append('n', '1')
    formData.append('size', 'auto')
    formData.append('quality', options?.quality || 'auto')
    formData.append('response_format', 'b64_json')

    console.log(`[OpenAI] Sending request: image=${(bytes.length/1024).toFixed(0)}KB, prompt=${prompt.substring(0, 80)}...`)

    const response = await fetchWithTimeout('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    })

    if (!response.ok) {
      const errorBody = await response.text()
      const errMsg = `OpenAI ${response.status}: ${errorBody.substring(0, 300)}`
      console.error(`[OpenAI] ${errMsg}`)

      // Don't retry on quota/billing/validation errors
      if (response.status === 429 || response.status === 402 || response.status === 400) {
        throw new Error(errMsg)
      }

      if (retryCount < MAX_RETRIES) {
        const delay = retryDelay(retryCount)
        console.log(`[OpenAI] Retrying in ${Math.round(delay)}ms (attempt ${retryCount + 2}/${MAX_RETRIES + 1})`)
        await sleep(delay)
        return editPhotoWithOpenAI(base64Data, mimeType, prompt, apiKey, retryCount + 1, options)
      }
      throw new Error(errMsg)
    }

    const data = await response.json() as {
      data?: Array<{ b64_json?: string; url?: string }>
    }

    if (data.data?.[0]?.b64_json) {
      console.log(`[OpenAI] gpt-image-1.5 succeeded`)
      return `data:image/png;base64,${data.data[0].b64_json}`
    }

    // No image in response — retry
    if (retryCount < MAX_RETRIES) {
      const delay = retryDelay(retryCount)
      console.log(`[OpenAI] No image returned, retrying in ${Math.round(delay)}ms`)
      await sleep(delay)
      return editPhotoWithOpenAI(base64Data, mimeType, prompt, apiKey, retryCount + 1, options)
    }

    throw new Error('OpenAI: no image in response after retries')
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('OpenAI')) {
      throw error // propagate specific errors
    }
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error(`[OpenAI] Error: ${errMsg}`)
    if (retryCount < MAX_RETRIES) {
      await sleep(retryDelay(retryCount))
      return editPhotoWithOpenAI(base64Data, mimeType, prompt, apiKey, retryCount + 1, options)
    }
    throw new Error(`OpenAI exception: ${errMsg}`)
  }
}
