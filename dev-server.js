import http from 'http'

const PORT = 8788

// Load environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

if (!OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is required')
  console.log('Usage: OPENAI_API_KEY=your-key GEMINI_API_KEY=your-key node dev-server.js')
  process.exit(1)
}

if (!GEMINI_API_KEY) {
  console.warn('Warning: GEMINI_API_KEY not set. Style image generation will use demo mode.')
}

const systemPrompt = `You are an expert personal stylist and fashion consultant.
Analyze the user's photo and body information to provide personalized style recommendations.

Your report should include:
1. Body Type Analysis - Identify body shape and proportions
2. Color Analysis - Recommend colors that suit their skin tone and features
3. Style Recommendations - Suggest clothing styles, cuts, and fits
4. Wardrobe Essentials - List must-have items for their wardrobe
5. Styling Tips - Specific tips to enhance their appearance
6. Outfit Ideas - 3-5 complete outfit suggestions

Be specific, practical, and encouraging. Focus on enhancing their natural features.`

const languagePrompts = {
  ko: '한국어로 답변해주세요.',
  en: 'Please respond in English.',
  ja: '日本語で回答してください。',
  zh: '请用中文回答。',
  es: 'Por favor responde en español.'
}

// Style scenarios for image generation
const styleScenarios = [
  {
    id: 'best-match',
    labelKo: '베스트 매치',
    labelEn: 'Best Match',
    labelJa: 'ベストマッチ',
    labelZh: '最佳搭配',
    labelEs: 'Mejor Combinación',
    prompt: 'elegant casual daily outfit, natural pose, full body fashion photo'
  },
  {
    id: 'interview',
    labelKo: '인터뷰룩',
    labelEn: 'Interview',
    labelJa: 'インタビュー',
    labelZh: '面试装',
    labelEs: 'Entrevista',
    prompt: 'professional interview outfit, business formal attire, confident pose, office setting'
  },
  {
    id: 'date',
    labelKo: '데이트룩',
    labelEn: 'Date Night',
    labelJa: 'デートルック',
    labelZh: '约会装',
    labelEs: 'Cita',
    prompt: 'romantic date night outfit, stylish and charming, soft lighting, elegant restaurant setting'
  },
  {
    id: 'luxury',
    labelKo: '럭셔리',
    labelEn: 'Luxury',
    labelJa: 'ラグジュアリー',
    labelZh: '奢华',
    labelEs: 'Lujo',
    prompt: 'high-end luxury fashion, designer outfit, sophisticated and exclusive, premium quality clothing'
  },
  {
    id: 'business',
    labelKo: '비즈니스',
    labelEn: 'Business',
    labelJa: 'ビジネス',
    labelZh: '商务',
    labelEs: 'Negocios',
    prompt: 'professional business attire, corporate style, polished and authoritative, modern office'
  },
  {
    id: 'elegant',
    labelKo: '고급스러운',
    labelEn: 'Elegant',
    labelJa: 'エレガント',
    labelZh: '优雅',
    labelEs: 'Elegante',
    prompt: 'elegant and refined outfit, graceful styling, timeless fashion, sophisticated appearance'
  },
  {
    id: 'casual',
    labelKo: '캐주얼',
    labelEn: 'Casual',
    labelJa: 'カジュアル',
    labelZh: '休闲',
    labelEs: 'Casual',
    prompt: 'relaxed casual outfit, comfortable yet stylish, weekend vibes, laid-back fashion'
  },
  {
    id: 'party',
    labelKo: '파티룩',
    labelEn: 'Party',
    labelJa: 'パーティー',
    labelZh: '派对',
    labelEs: 'Fiesta',
    prompt: 'glamorous party outfit, festive and eye-catching, nightclub or event setting, trendy fashion'
  },
  {
    id: 'street',
    labelKo: '스트릿',
    labelEn: 'Street Style',
    labelJa: 'ストリート',
    labelZh: '街头',
    labelEs: 'Urbano',
    prompt: 'trendy street style fashion, urban aesthetic, cool and edgy outfit, city background'
  }
]

function buildStylePrompt(scenario, gender, height, weight) {
  const genderDesc = gender === 'male' ? 'handsome young man' :
                     gender === 'female' ? 'beautiful young woman' :
                     'stylish person'

  const h = parseInt(height) || 170
  const w = parseInt(weight) || 65
  const bmi = w / ((h / 100) ** 2)

  let bodyDesc = ''
  if (bmi < 18.5) bodyDesc = 'slim and slender'
  else if (bmi < 25) bodyDesc = 'fit and well-proportioned'
  else if (bmi < 30) bodyDesc = 'healthy and solid build'
  else bodyDesc = 'confident presence'

  return `Fashion photography of a ${genderDesc} with ${bodyDesc} physique, ${scenario.prompt}, high quality, professional lighting, magazine editorial style, 4k, detailed clothing texture`
}

async function generateStyledImage(photo, type, styleName) {
  if (!GEMINI_API_KEY) {
    return null
  }

  try {
    const base64Match = photo.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!base64Match) return null

    const mimeType = `image/${base64Match[1]}`
    const base64Data = base64Match[2]

    const editPrompt = type === 'hairstyle'
      ? `EDIT this photo - ONLY change the HAIRSTYLE to: ${styleName}

CRITICAL - DO NOT CHANGE:
- Face shape, eyes, nose, mouth, ears - MUST stay IDENTICAL
- Skin tone and texture - MUST stay IDENTICAL
- Body shape and proportions - MUST stay IDENTICAL
- Expression and pose - MUST stay IDENTICAL
- Background and lighting - MUST stay IDENTICAL

ONLY modify the hair to match the style "${styleName}". Generate the edited photo.`
      : `EDIT this photo - ONLY change the OUTFIT to match the style: ${styleName}

CRITICAL - DO NOT CHANGE:
- Face shape, eyes, nose, mouth, ears - MUST stay IDENTICAL
- Hairstyle and hair color - MUST stay IDENTICAL
- Skin tone - MUST stay IDENTICAL
- Body proportions - MUST stay IDENTICAL
- Expression and pose - MUST stay IDENTICAL

ONLY change the clothes/outfit to match "${styleName}" style. Generate the edited photo.`

    let response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
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

    if (!response.ok) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${GEMINI_API_KEY}`,
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
    }

    if (!response.ok) {
      console.error(`Gemini error for "${styleName}":`, response.status)
      return null
    }

    const data = await response.json()

    for (const part of data.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
      }
    }

    return null
  } catch (error) {
    console.error(`Error generating "${styleName}":`, error.message)
    return null
  }
}

async function generateStyleImage(prompt) {
  if (!GEMINI_API_KEY) {
    return null
  }

  try {
    // Using Gemini 3 Pro Image Preview (Nano Banana Pro)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
            imageConfig: {
              image_size: '1K'
            }
          }
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', response.status, errorText)
      return null
    }

    const data = await response.json()

    // Extract image from response
    if (data.candidates && data.candidates[0]?.content?.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error generating image:', error.message)
    return null
  }
}

async function generateStyles(body) {
  const { gender, height, weight, photo, language } = body

  const labelKey = language === 'ko' ? 'labelKo' :
                   language === 'ja' ? 'labelJa' :
                   language === 'zh' ? 'labelZh' :
                   language === 'es' ? 'labelEs' : 'labelEn'

  if (!GEMINI_API_KEY) {
    // Demo mode
    return {
      styles: styleScenarios.map(scenario => ({
        id: scenario.id,
        label: scenario[labelKey],
        imageUrl: null,
        isDemo: true
      })),
      demo: true
    }
  }

  const hasPhoto = photo && photo.length > 100

  // Generate images - use photo editing if photo available
  const results = await Promise.all(
    styleScenarios.map(async (scenario) => {
      let imageUrl = null

      if (hasPhoto) {
        console.log(`Editing photo for: ${scenario.id}`)
        imageUrl = await generateStyledImage(photo, 'fashion', scenario.prompt)
      }

      // Fallback to text-to-image if no photo or editing failed
      if (!imageUrl) {
        const prompt = buildStylePrompt(scenario, gender, height, weight)
        console.log(`Generating: ${scenario.id}`)
        imageUrl = await generateStyleImage(prompt)
      }

      return {
        id: scenario.id,
        label: scenario[labelKey],
        imageUrl,
        isDemo: false
      }
    })
  )

  return { styles: results }
}

async function callOpenAI(body) {
  const { photo, height, weight, gender, language } = body

  const genderText = { male: 'male', female: 'female', other: 'person' }[gender]

  const userMessage = `Please analyze this ${genderText}'s photo and provide a comprehensive style consultation report.

Body Information:
- Height: ${height} cm
- Weight: ${weight} kg
- Gender: ${genderText}

${languagePrompts[language] || languagePrompts.en}

Provide a detailed, personalized style report based on the photo and body information.`

  // Try Responses API first
  console.log('Calling OpenAI Responses API...')

  let response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      input: [
        {
          role: 'developer',
          content: [{ type: 'input_text', text: systemPrompt }]
        },
        {
          role: 'user',
          content: [
            { type: 'input_text', text: userMessage },
            { type: 'input_image', image_url: photo, detail: 'high' }
          ]
        }
      ],
      text: { format: { type: 'text' } },
      store: false
    })
  })

  if (response.ok) {
    const data = await response.json()
    console.log('Responses API success')

    if (data.output && data.output.length > 0) {
      const lastOutput = data.output[data.output.length - 1]
      if (lastOutput.content) {
        const textContent = lastOutput.content.find(c => c.type === 'output_text')
        if (textContent && textContent.text) {
          return textContent.text
        }
      }
    }
  }

  // Fallback to Chat Completions API
  console.log('Falling back to Chat Completions API...')

  response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userMessage },
            { type: 'image_url', image_url: { url: photo, detail: 'high' } }
          ]
        }
      ],
      max_tokens: 4096,
      temperature: 0.7
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('OpenAI API error:', error)
    throw new Error('Failed to analyze image')
  }

  const data = await response.json()
  console.log('Chat Completions API success')
  return data.choices[0]?.message?.content || 'No analysis available'
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'POST' && req.url === '/api/analyze') {
    let body = ''

    req.on('data', chunk => {
      body += chunk.toString()
    })

    req.on('end', async () => {
      try {
        const data = JSON.parse(body)

        if (!data.photo || !data.height || !data.weight || !data.gender) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Missing required fields' }))
          return
        }

        console.log(`\nAnalyzing: ${data.gender}, ${data.height}cm, ${data.weight}kg, lang=${data.language}`)

        const report = await callOpenAI(data)

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ report }))
      } catch (error) {
        console.error('Error:', error.message)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: error.message }))
      }
    })
  } else if (req.method === 'POST' && req.url === '/api/generate-hair-styles') {
    let body = ''

    req.on('data', chunk => {
      body += chunk.toString()
    })

    req.on('end', async () => {
      try {
        const data = JSON.parse(body)

        if (!data.photo || !data.styles || data.styles.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Photo and styles are required' }))
          return
        }

        console.log(`\nGenerating hair styles: ${data.styles.join(', ')}`)

        const images = await Promise.all(
          data.styles.map(async (styleName) => {
            const imageUrl = await generateStyledImage(data.photo, 'hairstyle', styleName)
            return { style: styleName, imageUrl }
          })
        )

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ images }))
      } catch (error) {
        console.error('Error:', error.message)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: error.message }))
      }
    })
  } else if (req.method === 'POST' && req.url === '/api/generate-fashion-styles') {
    let body = ''

    req.on('data', chunk => {
      body += chunk.toString()
    })

    req.on('end', async () => {
      try {
        const data = JSON.parse(body)

        if (!data.photo || !data.styles || data.styles.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Photo and styles are required' }))
          return
        }

        console.log(`\nGenerating fashion styles: ${data.styles.join(', ')}`)

        const images = await Promise.all(
          data.styles.map(async (styleName) => {
            const imageUrl = await generateStyledImage(data.photo, 'fashion', styleName)
            return { style: styleName, imageUrl }
          })
        )

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ images }))
      } catch (error) {
        console.error('Error:', error.message)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: error.message }))
      }
    })
  } else if (req.method === 'POST' && req.url === '/api/generate-styles') {
    let body = ''

    req.on('data', chunk => {
      body += chunk.toString()
    })

    req.on('end', async () => {
      try {
        const data = JSON.parse(body)

        if (!data.gender || !data.height || !data.weight) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Missing required fields' }))
          return
        }

        console.log(`\nGenerating styles: ${data.gender}, ${data.height}cm, ${data.weight}kg`)

        const result = await generateStyles(data)

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(result))
      } catch (error) {
        console.error('Error:', error.message)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: error.message }))
      }
    })
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
  }
})

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║     Personal Stylist Studio - Dev API Server              ║
╠═══════════════════════════════════════════════════════════╣
║  API Server:  http://localhost:${PORT}                       ║
║  Endpoints:                                               ║
║    POST /api/analyze              - Style analysis        ║
║    POST /api/generate-styles      - AI style images       ║
║    POST /api/generate-hair-styles - Hair synthesis        ║
║    POST /api/generate-fashion-styles - Fashion synthesis  ║
║                                                           ║
║  Gemini: ${GEMINI_API_KEY ? 'Configured' : 'Not set (demo mode)'}                                  ║
║                                                           ║
║  Run frontend: npm run dev                                ║
║  Then open:    http://localhost:5173                      ║
╚═══════════════════════════════════════════════════════════╝
`)
})
