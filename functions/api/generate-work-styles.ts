import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { errors } from '../lib/errors'
import { editPhotoWithOpenAI } from '../lib/openai-image'
import {
  getWorkScenarios,
  buildFashionEditPrompt,
  getColorInspiration,
  getSilhouetteGuide,
  type ScenarioConfig,
} from '../lib/stylist-prompts'
import {
  validateGenerateWorkStylesRequest,
  createValidationErrorResponse,
} from '../lib/validation'

interface Env {
  GEMINI_API_KEY: string
  OPENAI_API_KEY?: string
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

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
      console.log(`[OpenAI] Trying gpt-image-1.5 for work-${scenarioId}`)
      const openaiResult = await editPhotoWithOpenAI(base64Data, mimeType, editPrompt, openaiKey)
      if (openaiResult) {
        console.log(`[OpenAI] Success for work-${scenarioId}`)
        return openaiResult
      }
      console.log(`[OpenAI] Failed for work-${scenarioId}, falling back to Gemini`)
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
        console.log(`[Gemini] Trying model: ${model} for work-${scenarioId}`)
        response = await fetch(
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
                responseModalities: ['IMAGE', 'TEXT'],
                imageConfig: {
                  imageSize: '1K'
                }
              }
            })
          }
        )
        if (response.ok) {
          console.log(`[Gemini] ${model} succeeded for work-${scenarioId}`)
          break
        }
        const errorBody = await response.text()
        lastError = `${model} failed (${response.status}): ${errorBody.substring(0, 500)}`
        console.error(`[Gemini] ${lastError}`)
        response = null
      } catch (e) {
        lastError = `${model} exception: ${e}`
        console.error(`[Gemini] ${lastError}`)
      }
    }

    if (!response || !response.ok) {
      console.error(`[Gemini] All models failed for work-${scenarioId}. Last error: ${lastError}`)
      if (retryCount < MAX_RETRIES) {
        const delay = (retryCount + 1) * 2000
        console.log(`[Gemini] Retrying work-${scenarioId} in ${delay}ms (attempt ${retryCount + 2}/${MAX_RETRIES + 1})`)
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

    if (retryCount < MAX_RETRIES) {
      const delay = (retryCount + 1) * 2000
      console.log(`[Gemini] No image returned for work-${scenarioId}, retrying in ${delay}ms`)
      await sleep(delay)
      return editPhotoWithModel(photo, scenarioId, editPrompt, apiKey, openaiKey, retryCount + 1)
    }
    return null
  } catch (error) {
    console.error(`Error for work-${scenarioId}:`, error)
    if (retryCount < MAX_RETRIES) {
      const delay = (retryCount + 1) * 2000
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
    const validation = validateGenerateWorkStylesRequest(body)
    if (!validation.valid) {
      return createValidationErrorResponse(validation.errors!, corsHeaders)
    }

    const { photo, language, gender, height, weight, jobType } = validation.data!
    const geminiKey = context.env.GEMINI_API_KEY
    const openaiKey = context.env.OPENAI_API_KEY
    const hasPhoto = photo && photo.length > 100

    const workScenarios = getWorkScenarios(jobType)

    if (!geminiKey && !openaiKey) {
      const demoResults = workScenarios.map(scenario => ({
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

    const silhouetteGuide = getSilhouetteGuide(gender, height, weight)
    const diversitySeed = (parseInt(height || '170') + parseInt(weight || '70') + Date.now()) % 10

    console.log(`[API Work] Generating ${workScenarios.length} work styles for ${jobType} (seed: ${diversitySeed})`)

    const results = await Promise.all(
      workScenarios.map(async (scenario) => {

        let imageUrl: string | null = null

        if (hasPhoto) {
          const directive = gender === 'female' ? scenario.directiveFemale : scenario.directiveMale
          const colorInspiration = getColorInspiration(gender, diversitySeed + index)
          const editPrompt = buildFashionEditPrompt({
            directive,
            gender,
            colorInspiration,
            silhouetteGuide,
          })
          imageUrl = await editPhotoWithModel(photo!, scenario.id, editPrompt, geminiKey, openaiKey)
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
    console.log(`[API Work] Generated ${successCount}/${workScenarios.length} work styles`)

    return new Response(
      JSON.stringify({
        styles: results,
        jobType,
        debug: { hasPhoto, photoLength: photo?.length || 0, successCount, totalStyles: workScenarios.length }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (error) {
    console.error('Work styles error:', error)
    return errors.internal(corsHeaders)
  }
}

export const onRequestOptions: PagesFunction = async (context) => {
  return createCorsPreflightResponse(context.request)
}
