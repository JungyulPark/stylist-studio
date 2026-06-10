import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { errors } from '../lib/errors'

interface Env {
  OPENAI_API_KEY: string
}

// Model fallback chain (fast models for chat)
const MODELS = ['gpt-5-mini', 'gpt-4.1', 'gpt-4o']

const languagePrompts: Record<string, string> = {
  ko: '한국어로 답변해주세요.',
  en: 'Please respond in English.',
  ja: '日本語で回答してください。',
  zh: '请用中文回答。',
  es: 'Por favor responde en español.'
}

const SYSTEM_PROMPT = `You are the world's most elite AI style advisor — a fusion of the expertise of Tom Ford (overall style direction), Grace Coddington (editorial sense), Sam McKnight (hair styling), Pat McGrath (beauty reference), and Law Roach (celebrity styling).

PERSONA:
- Confident, specific, and actionable in every recommendation
- Luxurious sensibility but always practical and wearable
- Warm and encouraging — make the user feel like they have a personal stylist on call
- Reference specific brands, colors, silhouettes, and styling techniques

CAPABILITIES:
- Outfit recommendations for any occasion (work, date, casual, formal, travel)
- Color coordination and seasonal palette advice
- Body-type-aware styling tips
- Hair and accessory pairing suggestions
- Wardrobe building and capsule wardrobe planning
- Trend interpretation — what works for real people
- Shopping advice with budget-conscious alternatives

RULES:
- Keep responses concise: 2-4 short paragraphs max
- Use bullet points for specific item recommendations
- Never ask more than one clarifying question at a time
- If the user's question is vague, give your best recommendation first, then ask one follow-up
- Always give concrete, specific answers (not generic "it depends" responses)
- Format with minimal markdown (bold for emphasis, bullets for lists)`

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    const body = await context.request.json() as {
      message?: string
      history?: ChatMessage[]
      language?: string
    }

    const { message, history = [], language = 'en' } = body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return errors.validation('Message is required', corsHeaders)
    }

    if (message.length > 1000) {
      return errors.validation('Message too long (max 1000 characters)', corsHeaders)
    }

    const apiKey = context.env.OPENAI_API_KEY
    if (!apiKey || apiKey.length < 20) {
      console.error('[style-chat] OpenAI API key not configured')
      return errors.configError(corsHeaders)
    }

    // Build messages array: system + recent history (max 10) + current message
    const recentHistory = history.slice(-10)
    const messages = [
      {
        role: 'system',
        content: `${SYSTEM_PROMPT}\n\n${languagePrompts[language] || languagePrompts.en}`
      },
      ...recentHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message.trim() }
    ]

    let reply = ''
    let lastError = ''
    const MODEL_TIMEOUT_MS = 15_000 // 15s per model (chat should be fast)

    for (const model of MODELS) {
      try {
        console.log(`[style-chat] Trying model: ${model}`)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS)

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages,
            max_completion_tokens: 500,
            // gpt-5 family only supports default temperature
            ...(model.startsWith('gpt-5') ? {} : { temperature: 0.8 })
          }),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorData = await response.text()
          lastError = `${model}: ${response.status} - ${errorData.substring(0, 300)}`
          console.error(`[style-chat] ${lastError}`)
          continue
        }

        const data = await response.json() as {
          choices: Array<{ message: { content: string } }>
          usage?: { total_tokens: number }
        }

        reply = data.choices[0]?.message?.content || ''
        if (reply) {
          console.log(`[style-chat] Success with model: ${model}, tokens: ${data.usage?.total_tokens || 'unknown'}`)
          break
        }
      } catch (e) {
        const isTimeout = e instanceof DOMException && e.name === 'AbortError'
        lastError = `${model}: ${isTimeout ? 'TIMEOUT after 15s' : e}`
        console.error(`[style-chat] ${lastError}`)
      }
    }

    if (!reply) {
      console.error(`[style-chat] All models failed. Last: ${lastError}`)
      return errors.externalApi('OpenAI', corsHeaders)
    }

    return new Response(
      JSON.stringify({ reply }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )

  } catch (error) {
    console.error('[style-chat] Error:', error)
    return errors.internal(corsHeaders)
  }
}

export const onRequestOptions: PagesFunction = async (context) => {
  return createCorsPreflightResponse(context.request)
}
