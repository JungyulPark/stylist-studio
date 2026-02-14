/**
 * Shared Gemini image generation utilities
 * Extracted from generate-styles.ts for reuse in daily-style-cron.ts
 */

export interface ImageScenario {
  id: string
  prompt: string
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Edit a photo using Gemini image inpainting
 * @param photo - base64 data URI of the photo
 * @param scenario - { id, prompt } describing the outfit
 * @param gender - 'male' | 'female'
 * @param apiKey - Gemini API key
 * @param retryCount - internal retry counter
 * @returns base64 data URI of the edited photo, or null on failure
 */
export async function editPhotoWithGemini(
  photo: string,
  scenario: ImageScenario,
  gender: string,
  apiKey: string,
  retryCount: number = 0
): Promise<string | null> {
  const MAX_RETRIES = 2

  try {
    const base64Match = photo.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!base64Match) return null

    const mimeType = `image/${base64Match[1]}`
    const base64Data = base64Match[2]

    const genderWord = gender === 'female' ? 'woman' : 'man'

    const beautyRetouch = gender === 'female'
      ? `BEAUTY ENHANCEMENT for the face:
- Apply soft, natural skin smoothing (reduce wrinkles and blemishes subtly)
- Add gentle soft-focus glow effect on the face
- Even out skin tone with warm, healthy glow
- Enhance with soft studio lighting effect
- Keep the face looking NATURAL - not overly edited`
      : `SUBTLE BEAUTY ENHANCEMENT for the face:
- Apply light natural skin smoothing (reduce blemishes subtly)
- Add subtle soft-focus glow effect on the face
- Even out skin tone slightly for a clean, fresh look
- Keep the face looking NATURAL and masculine - not overly edited`

    const editPrompt = `HIGH-END FASHION EDITORIAL — Style this photo as if shooting for Vogue or GQ. The result must look like a professionally styled luxury fashion photograph.

EDIT this photo - ONLY change the OUTFIT of the MAIN PERSON to: ${scenario.prompt}

CRITICAL: This is a ${genderWord}. The outfit MUST be appropriate for a ${genderWord}. Choose clothing that flatters THIS specific person's body proportions and complexion.
${gender === 'female' ? 'STYLING DIRECTION (Max Mara, The Row aesthetic): Naturally draped tailored silhouette with elegant proportions. Use soft, feminine clothing — dresses, blouses, cardigans, skirts in refined colors. Fabrics should have visible weight and texture, draping naturally on the body.' : 'STYLING DIRECTION (Loro Piana, Brunello Cucinelli aesthetic): Naturally draped tailored silhouette with relaxed elegance. Trousers should have comfortable drape with a straight or tapered leg. Jackets sit naturally on shoulders with soft structure. Fabrics have visible weight and texture, falling naturally on the body.'}

${beautyRetouch}

FOCUS ON MAIN SUBJECT ONLY:
- Only edit the MAIN person in the center/foreground of the photo
- If there are OTHER PEOPLE in the background, LEAVE THEM COMPLETELY UNCHANGED
- Do NOT modify, remove, or add any other people
- Keep all background elements exactly as they are

INPAINTING RULES - THIS IS AN INPAINTING TASK:
1. ONLY replace the clothing/fabric within the MAIN PERSON's body silhouette
2. DO NOT generate a new person or body - use the EXACT existing body outline
3. The new clothes must fit WITHIN the original body boundaries
4. Body parts (arms, legs, torso) stay in EXACT same position
5. Clothing layers: body underneath, clothes on top - NEVER overlap incorrectly
6. DO NOT extend the image or add new body parts that weren't visible

ABSOLUTE REQUIREMENTS - VIOLATION IS FAILURE:
1. NEVER CROP OR ZOOM - output must have IDENTICAL framing as input
2. NEVER change aspect ratio - if input is portrait, output is portrait
3. Face position, size, and features MUST be PIXEL-PERFECT identical
4. Keep EXACTLY what is visible in the original - do not extend or add content
5. Hairstyle, hair color, skin tone base - ZERO changes allowed
6. Background and OTHER PEOPLE - ZERO changes allowed
7. Output resolution MUST match input resolution exactly
8. Legs must be BEHIND/INSIDE pants or skirt - NEVER on top of clothing
9. Arms must be THROUGH sleeves - NEVER floating above clothes

This is a clothing REPLACEMENT task for the MAIN PERSON only.
Keep the person's HEAD and FACE at the EXACT same position.
The clothes should naturally fit the existing body shape.
DO NOT generate full body if original only shows partial body.

Generate the edited photo with IDENTICAL composition to the input.`

    const geminiModels = ['gemini-2.5-flash-image', 'gemini-3-pro-image-preview']
    const requestBody = JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: editPrompt }
        ]
      }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
        imageConfig: { imageSize: '1K' }
      }
    })

    let response: Response | null = null
    for (const model of geminiModels) {
      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody
          }
        )
        if (response.ok) {
          console.log(`[Gemini] ${model} succeeded for ${scenario.id}`)
          break
        }
        console.log(`[Gemini] ${model} failed (${response.status}) for ${scenario.id}`)
      } catch (e) {
        console.error(`[Gemini] ${model} error:`, e)
      }
    }

    if (!response || !response.ok) {
      const errorBody = response ? await response.text() : 'No response'
      console.error(`[Gemini] All models failed for ${scenario.id}: ${errorBody.substring(0, 500)}`)
      if (retryCount < MAX_RETRIES) {
        const delay = (retryCount + 1) * 2000
        console.log(`[Gemini] Retrying ${scenario.id} in ${delay}ms (attempt ${retryCount + 2}/${MAX_RETRIES + 1})`)
        await sleep(delay)
        return editPhotoWithGemini(photo, scenario, gender, apiKey, retryCount + 1)
      }
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

    // No image in response - retry
    if (retryCount < MAX_RETRIES) {
      const delay = (retryCount + 1) * 2000
      console.log(`[Gemini] No image returned for ${scenario.id}, retrying in ${delay}ms`)
      await sleep(delay)
      return editPhotoWithGemini(photo, scenario, gender, apiKey, retryCount + 1)
    }

    return null
  } catch (error) {
    console.error(`[Gemini] Error for ${scenario.id}:`, error)
    if (retryCount < MAX_RETRIES) {
      const delay = (retryCount + 1) * 2000
      await sleep(delay)
      return editPhotoWithGemini(photo, scenario, gender, apiKey, retryCount + 1)
    }
    return null
  }
}
