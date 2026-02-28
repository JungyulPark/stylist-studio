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

/**
 * Edit a photo using OpenAI gpt-image-1.5
 * @param base64Data - raw base64 image data (without data URI prefix)
 * @param mimeType - e.g. "image/jpeg", "image/png"
 * @param prompt - the editing prompt
 * @param apiKey - OpenAI API key
 * @param retryCount - internal retry counter
 * @returns base64 data URI of the edited photo, or null on failure
 */
export async function editPhotoWithOpenAI(
  base64Data: string,
  mimeType: string,
  prompt: string,
  apiKey: string,
  retryCount: number = 0
): Promise<string | null> {
  const MAX_RETRIES = 2

  try {
    // Convert base64 to Blob for multipart upload
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    const extension = mimeType.split('/')[1] || 'png'
    const blob = new Blob([bytes], { type: mimeType })

    const formData = new FormData()
    formData.append('image', blob, `photo.${extension}`)
    formData.append('prompt', prompt)
    formData.append('model', 'gpt-image-1.5')
    formData.append('n', '1')
    formData.append('size', '1024x1024')
    formData.append('quality', 'auto')
    formData.append('background', 'auto')
    formData.append('moderation', 'auto')
    formData.append('input_fidelity', 'high')
    formData.append('response_format', 'b64_json')

    const response = await fetchWithTimeout('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`[OpenAI] gpt-image-1.5 failed (${response.status}): ${errorBody.substring(0, 500)}`)

      // Don't retry on quota/billing errors (429, 402) — they won't resolve on retry
      if (response.status === 429 || response.status === 402) {
        return null
      }

      if (retryCount < MAX_RETRIES) {
        const delay = retryDelay(retryCount)
        console.log(`[OpenAI] Retrying in ${Math.round(delay)}ms (attempt ${retryCount + 2}/${MAX_RETRIES + 1})`)
        await sleep(delay)
        return editPhotoWithOpenAI(base64Data, mimeType, prompt, apiKey, retryCount + 1)
      }
      return null
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
      return editPhotoWithOpenAI(base64Data, mimeType, prompt, apiKey, retryCount + 1)
    }

    return null
  } catch (error) {
    console.error(`[OpenAI] Error:`, error)
    if (retryCount < MAX_RETRIES) {
      await sleep(retryDelay(retryCount))
      return editPhotoWithOpenAI(base64Data, mimeType, prompt, apiKey, retryCount + 1)
    }
    return null
  }
}
