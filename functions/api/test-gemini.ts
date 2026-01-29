import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'

interface Env {
  GEMINI_API_KEY: string
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  const geminiKey = context.env.GEMINI_API_KEY

  if (!geminiKey) {
    return new Response(
      JSON.stringify({ error: 'GEMINI_API_KEY not configured', keyExists: false }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }

  // Test simple text generation first
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: 'Say "API working" in 2 words' }]
          }],
          generationConfig: {
            responseModalities: ['TEXT']
          }
        })
      }
    )

    const responseText = await response.text()

    return new Response(
      JSON.stringify({
        keyExists: true,
        keyLength: geminiKey.length,
        keyPrefix: geminiKey.substring(0, 8) + '...',
        apiStatus: response.status,
        apiOk: response.ok,
        apiResponse: responseText.substring(0, 1000)
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        keyExists: true,
        keyLength: geminiKey.length,
        error: String(error)
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
}

export const onRequestOptions: PagesFunction = async (context) => {
  return createCorsPreflightResponse(context.request)
}
