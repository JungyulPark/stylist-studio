import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { validateGenerateStylesRequest, createValidationErrorResponse } from '../lib/validation'
import { errors } from '../lib/errors'
import { editPhotoWithOpenAI } from '../lib/openai-image'
import {
  type ScenarioConfig,
  getScenarios,
  getColorInspiration,
  getSilhouetteGuide,
  buildFashionEditPrompt,
} from '../lib/stylist-prompts'

interface Env {
  GEMINI_API_KEY: string
  OPENAI_API_KEY?: string
}

// ===== Retry & Timeout Helpers =====
const FETCH_TIMEOUT_MS = 25_000
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

// ===== Image Editing (OpenAI primary → Gemini fallback) =====
async function editPhotoWithModel(
  photo: string,
  scenarioId: string,
  editPrompt: string,
  apiKey: string,
  openaiKey?: string,
  retryCount: number = 0
): Promise<string | null> {
  const MAX_RETRIES = 2

  try {
    const base64Match = photo.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!base64Match) return null

    const mimeType = `image/${base64Match[1]}`
    const base64Data = base64Match[2]

    // Try OpenAI gpt-image-1.5 first
    if (openaiKey) {
      try {
        console.log(`[OpenAI] Trying gpt-image-1.5 for ${scenarioId}`)
        const openaiResult = await editPhotoWithOpenAI(base64Data, mimeType, editPrompt, openaiKey)
        if (openaiResult) {
          console.log(`[OpenAI] Success for ${scenarioId}`)
          return openaiResult
        }
      } catch (e) {
        console.log(`[OpenAI] Error for ${scenarioId}: ${e instanceof Error ? e.message : e}`)
      }
      console.log(`[OpenAI] Failed for ${scenarioId}, falling back to Gemini`)
    }

    // Fallback to Gemini
    const geminiModels = [
      'gemini-3-pro-image-preview',
      'gemini-2.5-flash-image'
    ]

    let response: Response | null = null
    let lastError: string = ''

    for (const model of geminiModels) {
      try {
        console.log(`[Gemini] Trying model: ${model} for ${scenarioId}`)
        response = await fetchWithTimeout(
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
          console.log(`[Gemini] ${model} succeeded for ${scenarioId}`)
          break
        }
        const errorBody = await response.text()
        lastError = `${model} failed (${response.status}): ${errorBody.substring(0, 500)}`
        console.error(`[Gemini] ${lastError}`)
        response = null // Reset so we try next model
      } catch (e) {
        lastError = `${model} exception: ${e}`
        console.error(`[Gemini] ${lastError}`)
      }
    }

    if (!response || !response.ok) {
      console.error(`[Gemini] All models failed for ${scenarioId}. Last error: ${lastError}`)
      // Retry with exponential backoff
      if (retryCount < MAX_RETRIES) {
        const delay = retryDelay(retryCount) // 2s, 4s
        console.log(`[Gemini] Retrying ${scenarioId} in ${delay}ms (attempt ${retryCount + 2}/${MAX_RETRIES + 1})`)
        await sleep(delay)
        return editPhotoWithModel(photo, scenarioId, editPrompt, apiKey, openaiKey, retryCount + 1)
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
      console.log(`[Gemini] No image returned for ${scenarioId}, retrying in ${delay}ms`)
      await sleep(delay)
      return editPhotoWithModel(photo, scenarioId, editPrompt, apiKey, openaiKey, retryCount + 1)
    }

    return null
  } catch (error) {
    console.error(`Error for ${scenarioId}:`, error)
    // Retry on exception
    if (retryCount < MAX_RETRIES) {
      const delay = retryDelay(retryCount)
      console.log(`[Gemini] Exception for ${scenarioId}, retrying in ${delay}ms`)
      await sleep(delay)
      return editPhotoWithModel(photo, scenarioId, editPrompt, apiKey, openaiKey, retryCount + 1)
    }
    return null
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    const body = await context.request.json()

    // Validate request body
    const validation = validateGenerateStylesRequest(body)
    if (!validation.valid) {
      return createValidationErrorResponse(validation.errors!, corsHeaders)
    }

    const { photo, language, gender, height, weight } = validation.data!

    const geminiKey = context.env.GEMINI_API_KEY
    const openaiKey = context.env.OPENAI_API_KEY
    const hasPhoto = photo && photo.length > 100

    const styleScenarios = getScenarios()

    if (!geminiKey && !openaiKey) {
      const demoResults = styleScenarios.map(scenario => ({
        id: scenario.id,
        label: scenario[`label${language === 'ko' ? 'Ko' : language === 'ja' ? 'Ja' : language === 'zh' ? 'Zh' : language === 'es' ? 'Es' : 'En'}` as keyof ScenarioConfig] as string,
        imageUrl: null,
        isDemo: true
      }))

      return new Response(
        JSON.stringify({ styles: demoResults, demo: true }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Build per-scenario prompts with varied color inspiration
    const silhouetteGuide = getSilhouetteGuide(gender, height, weight)
    const diversitySeed = (parseInt(height || '170') + parseInt(weight || '70') + Date.now()) % 10
    const scenarioOffsets = [0, 2, 4, 6, 1, 3]

    console.log(`[API Styles] Generating ${styleScenarios.length} styles (seed: ${diversitySeed}), hasPhoto: ${hasPhoto}`)

    const results = await Promise.all(
      styleScenarios.map(async (scenario, index) => {

        let imageUrl: string | null = null

        if (hasPhoto) {
          const directive = gender === 'female' ? scenario.directiveFemale : scenario.directiveMale
          const colorInspiration = getColorInspiration(gender, diversitySeed + scenarioOffsets[index])
          const editPrompt = buildFashionEditPrompt({
            directive,
            gender,
            colorInspiration,
            silhouetteGuide,
          })
          imageUrl = await editPhotoWithModel(photo, scenario.id, editPrompt, geminiKey, openaiKey)
        }

        const labelKey = `label${language === 'ko' ? 'Ko' : language === 'ja' ? 'Ja' : language === 'zh' ? 'Zh' : language === 'es' ? 'Es' : 'En'}` as keyof ScenarioConfig

        return {
          id: scenario.id,
          label: scenario[labelKey] as string,
          imageUrl,
          isDemo: false
        }
      })
    )

    const successCount = results.filter(r => r.imageUrl).length
    console.log(`[API Styles] Generated ${successCount}/${styleScenarios.length} styles`)

    return new Response(
      JSON.stringify({
        styles: results,
        debug: {
          hasPhoto,
          photoLength: photo?.length || 0,
          successCount,
          totalStyles: styleScenarios.length
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )

  } catch (error) {
    console.error('Error:', error)
    return errors.internal(corsHeaders)
  }
}

export const onRequestOptions: PagesFunction = async (context) => {
  return createCorsPreflightResponse(context.request)
}
