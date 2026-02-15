/**
 * OpenAI gpt-image-1.5 image editing utility
 */

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
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
    formData.append('size', '1024x1024')
    formData.append('quality', 'medium')
    formData.append('response_format', 'b64_json')

    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`[OpenAI] gpt-image-1.5 failed (${response.status}): ${errorBody.substring(0, 500)}`)

      if (retryCount < MAX_RETRIES) {
        const delay = (retryCount + 1) * 2000
        console.log(`[OpenAI] Retrying in ${delay}ms (attempt ${retryCount + 2}/${MAX_RETRIES + 1})`)
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
      const delay = (retryCount + 1) * 2000
      console.log(`[OpenAI] No image returned, retrying in ${delay}ms`)
      await sleep(delay)
      return editPhotoWithOpenAI(base64Data, mimeType, prompt, apiKey, retryCount + 1)
    }

    return null
  } catch (error) {
    console.error(`[OpenAI] Error:`, error)
    if (retryCount < MAX_RETRIES) {
      const delay = (retryCount + 1) * 2000
      await sleep(delay)
      return editPhotoWithOpenAI(base64Data, mimeType, prompt, apiKey, retryCount + 1)
    }
    return null
  }
}
