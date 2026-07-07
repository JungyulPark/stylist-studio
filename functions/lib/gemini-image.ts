/**
 * Shared image generation utilities
 * Uses OpenAI gpt-image-1.5 as primary, Gemini as fallback
 */

import { editPhotoWithOpenAI } from './openai-image'

export interface ImageScenario {
  id: string
  prompt: string
}

export interface ImageGenOptions {
  /**
   * Cost tier. 'premium' (default): OpenAI auto-quality first, Gemini 3 Pro
   * -> 2.5 Flash fallback — used by paid one-time products.
   * 'economy': Gemini 2.5 Flash first, OpenAI medium-quality fallback — used
   * by the daily cron, where images render at 240px in email and per-image
   * cost decides whether the $6.99/mo subscription is profitable at all.
   */
  tier?: 'premium' | 'economy'
}

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
 * Edit a photo using OpenAI (primary) or Gemini (fallback)
 * @param photo - base64 data URI of the photo
 * @param scenario - { id, prompt } describing the outfit
 * @param gender - 'male' | 'female'
 * @param apiKey - Gemini API key
 * @param openaiKey - OpenAI API key (optional, used as primary)
 * @param retryCount - internal retry counter
 * @returns base64 data URI of the edited photo, or null on failure
 */
export async function editPhotoWithGemini(
  photo: string,
  scenario: ImageScenario,
  gender: string,
  apiKey: string,
  openaiKey?: string,
  retryCount: number = 0,
  options?: ImageGenOptions
): Promise<string | null> {
  const MAX_RETRIES = 2

  // Guard: need at least one API key
  if (!apiKey && !openaiKey) {
    console.error('[ImageGen] No API keys available (neither Gemini nor OpenAI)')
    return null
  }

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

    const editPrompt = `You are the world's top personal stylist. Your job is to dress this person in the PERFECT outfit that complements their unique skin tone, face shape, and body proportions.

⚠️ FACE IDENTITY LOCK — HIGHEST PRIORITY ⚠️
This is NOT a generation task. This is a CLOTHING SWAP on an EXISTING photo.
- The person's FACE must remain 100% IDENTICAL to the input — same eyes, nose, mouth, jawline, skin texture, facial hair, makeup, expression
- Do NOT regenerate, redraw, or reinterpret the face in ANY way
- The face must be a PIXEL-LEVEL COPY from the original photo
- If you cannot preserve the face exactly, return the original photo unchanged rather than altering the face

EDIT this photo - ONLY change the OUTFIT of the MAIN PERSON to: ${scenario.prompt}

CRITICAL: This is a ${genderWord}. The outfit MUST be appropriate for a ${genderWord}.

STYLING APPROACH — PROFESSIONAL PERSONAL COLOR & BODY ANALYSIS:
- Diagnose the person's seasonal color type from their skin undertone:
  * SPRING WARM (golden, peachy glow): Coral, warm peach, cream, light camel — vivid warm radiance
  * SUMMER COOL (pink, delicate): Lavender, dusty rose, powder blue, mauve — muted cool elegance
  * AUTUMN WARM (deep golden/olive): Terracotta, olive, mustard, burgundy, forest green — rich depth
  * WINTER COOL (high contrast, clear): Cobalt, emerald, magenta, true red, black, white — bold clarity
- Visually analyze body type and choose the most flattering silhouette strategy
- The specified color palette is a SUGGESTION — shift to match this person's seasonal color type
- Quality fabrics with natural texture and drape — cashmere, silk, fine wool, supple leather
- Avoid overly theatrical or costume-like outfits — keep it realistic, modern, and luxurious
${gender === 'female' ? '- Use a MIX of feminine clothing — tailored trousers, wide-leg pants, blouses, knits, dresses, skirts. Do NOT default to only skirts/dresses.' : '- Relaxed, comfortable silhouette — NOT tight, NOT skinny fit\n- Trousers with comfortable straight-leg or slightly wide drape, jackets with soft natural shoulders\n- Mix of relaxed tailored fit and easy casual fit — modern men prefer comfort over constriction'}

BODY PROPORTION STYLING:
- Observe body proportions and select silhouettes that FLATTER this build
- For shorter torsos: visual waistline higher for longer leg line
- Use vertical lines and monochromatic color flow for elongation

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

BODY PROPORTION PRESERVATION (CRITICAL):
- The person's BODY PROPORTIONS must stay EXACTLY the same as the original photo
- LEG LENGTH must be IDENTICAL to the original — do NOT shorten or compress legs
- TORSO-to-LEG ratio must match the original exactly
- Waistline position must stay at the SAME height as in the original photo
- If the person's legs are visible, they must remain the SAME length and shape

ABSOLUTE REQUIREMENTS - VIOLATION IS FAILURE:
1. FACE IDENTITY: The face must be an EXACT COPY of the input — same person, same features, same expression. If the output face looks like a DIFFERENT PERSON, the result is FAILED
2. NEVER CROP OR ZOOM - output must have PIXEL-PERFECT IDENTICAL framing, zoom level, and composition as input. The person's HEAD must be fully visible with the SAME space above it.
3. NEVER change aspect ratio - if input is portrait, output is portrait. Output dimensions MUST match input.
4. Hairstyle, hair color, skin tone base - ZERO changes allowed
5. Keep EXACTLY what is visible in the original - do not extend or add content
6. Background and OTHER PEOPLE - ZERO changes allowed
7. Output resolution MUST match input resolution exactly
8. Legs must be BEHIND/INSIDE pants or skirt - NEVER on top of clothing
9. Arms must be THROUGH sleeves - NEVER floating above clothes
10. Body proportions (especially leg length) - ZERO distortion allowed

REMINDER: DO NOT CROP OR ZOOM. Keep IDENTICAL framing as input. Head must be fully visible.

Generate the edited photo.`

    const economy = options?.tier === 'economy'

    const tryOpenAI = async (): Promise<string | null> => {
      if (!openaiKey) return null
      try {
        console.log(`[OpenAI] Trying gpt-image-1.5 (${economy ? 'medium' : 'auto'}) for ${scenario.id}`)
        const openaiResult = await editPhotoWithOpenAI(
          base64Data, mimeType, editPrompt, openaiKey, 0,
          { quality: economy ? 'medium' : 'auto' }
        )
        if (openaiResult) {
          console.log(`[OpenAI] Success for ${scenario.id}`)
          return openaiResult
        }
      } catch (e) {
        console.log(`[OpenAI] Error for ${scenario.id}: ${e instanceof Error ? e.message : String(e)}`)
      }
      return null
    }

    // Premium: OpenAI first. Economy: skip straight to cheap Gemini Flash.
    if (!economy) {
      const openaiResult = await tryOpenAI()
      if (openaiResult) return openaiResult
      if (openaiKey) console.log(`[OpenAI] Failed for ${scenario.id}, falling back to Gemini`)
    }

    // Gemini attempt — economy uses Flash only (Pro preview costs as much as OpenAI high)
    const geminiModels = economy
      ? ['gemini-2.5-flash-image']
      : ['gemini-3-pro-image-preview', 'gemini-2.5-flash-image']
    const requestBody = JSON.stringify({
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

    let response: Response | null = null
    for (const model of geminiModels) {
      try {
        response = await fetchWithTimeout(
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
      const statusCode = response?.status || 0
      const errorBody = response ? await response.text() : 'No response'
      console.error(`[Gemini] All models failed for ${scenario.id}: ${errorBody.substring(0, 500)}`)

      // Economy tier: Gemini was primary, so fall back to OpenAI (medium) before retrying
      if (economy) {
        const openaiResult = await tryOpenAI()
        if (openaiResult) return openaiResult
      }

      // Don't retry on quota/billing errors (429, 402) — they won't resolve on retry
      if (statusCode === 429 || statusCode === 402) {
        return null
      }

      if (retryCount < MAX_RETRIES) {
        const delay = retryDelay(retryCount)
        console.log(`[Gemini] Retrying ${scenario.id} in ${Math.round(delay)}ms (attempt ${retryCount + 2}/${MAX_RETRIES + 1})`)
        await sleep(delay)
        return editPhotoWithGemini(photo, scenario, gender, apiKey, openaiKey, retryCount + 1, options)
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
      const delay = retryDelay(retryCount)
      console.log(`[Gemini] No image returned for ${scenario.id}, retrying in ${Math.round(delay)}ms`)
      await sleep(delay)
      return editPhotoWithGemini(photo, scenario, gender, apiKey, openaiKey, retryCount + 1, options)
    }

    return null
  } catch (error) {
    console.error(`[Gemini] Error for ${scenario.id}:`, error)
    if (retryCount < MAX_RETRIES) {
      await sleep(retryDelay(retryCount))
      return editPhotoWithGemini(photo, scenario, gender, apiKey, openaiKey, retryCount + 1, options)
    }
    return null
  }
}
