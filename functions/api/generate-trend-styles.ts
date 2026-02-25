import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { errors } from '../lib/errors'
import {
  getTrendScenarios,
  buildFashionEditPrompt,
  getColorInspiration,
  getSilhouetteGuide,
  type ScenarioConfig,
} from '../lib/stylist-prompts'
import {
  validateGenerateTrendStylesRequest,
  createValidationErrorResponse,
} from '../lib/validation'

interface Env {
  GEMINI_API_KEY: string
  OPENAI_API_KEY?: string
}

const GEMINI_MODELS = ['gemini-2.0-flash-exp', 'gemini-2.0-flash']
const MAX_RETRIES = 1

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function editPhotoWithModel(
  photo: string,
  scenarioId: string,
  editPrompt: string,
  apiKey: string,
  openaiKey?: string,
  retryCount = 0
): Promise<string | null> {
  if (openaiKey) {
    try {
      const base64Match = photo.match(/^data:image\/(\w+);base64,(.+)/)
      if (base64Match) {
        const imageBytes = base64Match[2]
        const mimeType = `image/${base64Match[1]}`

        const boundary = '----FormBoundary' + Math.random().toString(36).slice(2)
        const parts = [
          `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\ngpt-image-1.5`,
          `--${boundary}\r\nContent-Disposition: form-data; name="prompt"\r\n\r\n${editPrompt}`,
          `--${boundary}\r\nContent-Disposition: form-data; name="size"\r\n\r\nauto`,
          `--${boundary}\r\nContent-Disposition: form-data; name="quality"\r\n\r\nmedium`,
          `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="photo.jpg"\r\nContent-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n${imageBytes}`,
          `--${boundary}--\r\n`
        ]

        const resp = await fetch('https://api.openai.com/v1/images/edits', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
          },
          body: parts.join('\r\n'),
        })

        if (resp.ok) {
          const data = await resp.json() as { data?: Array<{ b64_json?: string }> }
          const b64 = data.data?.[0]?.b64_json
          if (b64) {
            console.log(`[OpenAI] Success for trend-${scenarioId}`)
            return `data:image/png;base64,${b64}`
          }
        }
        console.warn(`[OpenAI] Failed for trend-${scenarioId}: ${resp.status}`)
      }
    } catch (e) {
      console.warn(`[OpenAI] Exception for trend-${scenarioId}:`, e)
    }
  }

  try {
    const base64Match = photo.match(/^data:image\/(\w+);base64,(.+)/)
    if (!base64Match) return null

    let response: Response | null = null
    let lastError = ''

    for (const model of GEMINI_MODELS) {
      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                role: 'user',
                parts: [
                  { inlineData: { mimeType: `image/${base64Match[1]}`, data: base64Match[2] } },
                  { text: editPrompt },
                ],
              }],
              generationConfig: {
                responseModalities: ['IMAGE', 'TEXT'],
                temperature: 0.4,
              },
            }),
          }
        )
        if (response.ok) {
          console.log(`[Gemini] ${model} succeeded for trend-${scenarioId}`)
          break
        }
        lastError = `${model} failed (${response.status})`
        console.error(`[Gemini] ${lastError}`)
        response = null
      } catch (e) {
        lastError = `${model} exception: ${e}`
        console.error(`[Gemini] ${lastError}`)
      }
    }

    if (!response || !response.ok) {
      if (retryCount < MAX_RETRIES) {
        await sleep((retryCount + 1) * 2000)
        return editPhotoWithModel(photo, scenarioId, editPrompt, apiKey, openaiKey, retryCount + 1)
      }
      return null
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ inlineData?: { mimeType: string; data: string } }> }
      }>
    }

    for (const part of data.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
      }
    }

    if (retryCount < MAX_RETRIES) {
      await sleep((retryCount + 1) * 2000)
      return editPhotoWithModel(photo, scenarioId, editPrompt, apiKey, openaiKey, retryCount + 1)
    }
    return null
  } catch (error) {
    console.error(`Error for trend-${scenarioId}:`, error)
    if (retryCount < MAX_RETRIES) {
      await sleep((retryCount + 1) * 2000)
      return editPhotoWithModel(photo, scenarioId, editPrompt, apiKey, openaiKey, retryCount + 1)
    }
    return null
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    const body = await context.request.json()
    const validation = validateGenerateTrendStylesRequest(body)
    if (!validation.valid) {
      return createValidationErrorResponse(validation.errors!, corsHeaders)
    }

    const { photo, language, gender, height, weight, trendType } = validation.data!
    const geminiKey = context.env.GEMINI_API_KEY
    const openaiKey = context.env.OPENAI_API_KEY
    const hasPhoto = photo && photo.length > 100

    const trendScenarios = getTrendScenarios(trendType)

    if (!geminiKey && !openaiKey) {
      const demoResults = trendScenarios.map(scenario => ({
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

    console.log(`[API Trend] Generating ${trendScenarios.length} trend styles for ${trendType} (seed: ${diversitySeed})`)

    const results = await Promise.all(
      trendScenarios.map(async (scenario, index) => {
        if (index > 0) await sleep(index * 500)

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
    console.log(`[API Trend] Generated ${successCount}/${trendScenarios.length} trend styles`)

    return new Response(
      JSON.stringify({
        styles: results,
        trendType,
        debug: { hasPhoto, photoLength: photo?.length || 0, successCount, totalStyles: trendScenarios.length }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (error) {
    console.error('Trend styles error:', error)
    return errors.internal(corsHeaders)
  }
}

export const onRequestOptions: PagesFunction = async (context) => {
  return createCorsPreflightResponse(context.request)
}
