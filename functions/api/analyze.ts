import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { validateAnalyzeRequest, createValidationErrorResponse } from '../lib/validation'
import { errors } from '../lib/errors'

interface Env {
  OPENAI_API_KEY: string
}

// API 활성화
const ENABLE_API = true

// 사용할 모델 설정
const MODEL = 'gpt-4o-mini'

const languagePrompts: Record<string, string> = {
  ko: '한국어로 답변해주세요.',
  en: 'Please respond in English.',
  ja: '日本語で回答してください。',
  zh: '请用中文回答。',
  es: 'Por favor responde en español.'
}

// 사진이 있을 때 시스템 프롬프트 (얼굴/헤어스타일 분석 포함)
const systemPromptWithPhoto = `You are a luxury personal stylist. Provide a CONCISE, elegant style report.

IMPORTANT FORMATTING RULES:
- Keep each section SHORT (2-4 bullet points max)
- Use elegant, minimal language
- No lengthy explanations - just actionable recommendations
- Format with clean markdown headers

REPORT STRUCTURE:

## 💎 Your Style Profile
One sentence summary of their overall style type.

## 💇 Hair Recommendations
- 3 specific hairstyle names with one-line descriptions

## 🎨 Your Colors
- Best colors (list 4-5)
- Avoid (list 2-3)

## 👔 Signature Style
- Body type in one line
- 3 key style rules

## 🛍️ Must-Have Items
List 5 essential items only

## ✨ 3 Complete Looks
For each look: Name + 4 items (top, bottom, shoes, accessory)

Keep the entire response under 400 words. Be elegant and direct.`

// 사진이 없을 때 시스템 프롬프트 (일반적인 추천)
const systemPromptNoPhoto = `You are a luxury personal stylist. Provide a CONCISE, elegant style report.

IMPORTANT FORMATTING RULES:
- Keep each section SHORT (2-4 bullet points max)
- Use elegant, minimal language
- No lengthy explanations - just actionable recommendations
- Format with clean markdown headers

REPORT STRUCTURE:

## 💎 Your Style Profile
One sentence summary based on body proportions.

## 🎨 Recommended Colors
- Best colors (list 4-5)
- Avoid (list 2-3)

## 👔 Signature Style
- Body type analysis in one line
- 3 key style rules for your proportions

## 🛍️ Must-Have Items
List 5 essential wardrobe items only

## ✨ 3 Complete Looks
For each look: Name + 4 items (top, bottom, shoes, accessory)

## 💡 Pro Tip
One powerful styling tip.

Note: Upload a photo for personalized hairstyle and color analysis.

Keep the entire response under 350 words. Be elegant and direct.`

// Mock 응답 (API 비활성화 시 사용)
const mockResponses: Record<string, string> = {
  ko: `## 스타일 컨설팅 리포트

### 1. 체형 분석
입력하신 정보를 바탕으로 분석한 결과, 균형 잡힌 체형을 가지고 계십니다.

### 2. 컬러 분석
- 추천 컬러: 네이비, 차콜 그레이, 화이트, 베이지
- 포인트 컬러: 버건디, 딥 블루, 포레스트 그린

### 3. 스타일 추천
- 슬림핏 셔츠와 테이퍼드 팬츠 조합
- 캐주얼한 블레이저로 세미 포멀 연출
- 깔끔한 니트와 치노팬츠 매칭

### 4. 필수 아이템
1. 화이트/네이비 기본 셔츠
2. 슬림핏 청바지
3. 베이지 치노팬츠
4. 네이비 블레이저
5. 화이트 스니커즈

### 5. 스타일링 팁
- 레이어링으로 깊이감 연출
- 액세서리는 심플하게
- 신발은 항상 깔끔하게 관리

### 6. 코디 제안
**데일리룩**: 화이트 티셔츠 + 슬림 청바지 + 화이트 스니커즈
**오피스룩**: 라이트 블루 셔츠 + 네이비 슬랙스 + 로퍼
**데이트룩**: 니트 + 치노팬츠 + 첼시부츠

---
*이 리포트는 데모 버전입니다. 실제 AI 분석은 결제 후 이용 가능합니다.*`,

  en: `## Style Consultation Report

### 1. Body Type Analysis
Based on your information, you have a well-balanced body type.

### 2. Color Analysis
- Recommended Colors: Navy, Charcoal Gray, White, Beige
- Accent Colors: Burgundy, Deep Blue, Forest Green

### 3. Style Recommendations
- Slim-fit shirts with tapered pants
- Casual blazers for semi-formal looks
- Clean knits with chino pants

### 4. Wardrobe Essentials
1. White/Navy basic shirts
2. Slim-fit jeans
3. Beige chino pants
4. Navy blazer
5. White sneakers

### 5. Styling Tips
- Use layering for depth
- Keep accessories simple
- Always maintain clean footwear

### 6. Outfit Ideas
**Daily Look**: White tee + Slim jeans + White sneakers
**Office Look**: Light blue shirt + Navy slacks + Loafers
**Date Look**: Knit sweater + Chinos + Chelsea boots

---
*This is a demo report. Actual AI analysis available after payment.*`,

  ja: `## スタイルコンサルティングレポート

### 1. 体型分析
入力された情報に基づき、バランスの取れた体型です。

### 2. カラー分析
- おすすめカラー：ネイビー、チャコールグレー、ホワイト、ベージュ
- アクセントカラー：バーガンディ、ディープブルー、フォレストグリーン

### 3. スタイル提案
- スリムフィットシャツとテーパードパンツの組み合わせ
- カジュアルブレザーでセミフォーマルに
- きれいめニットとチノパンのマッチング

### 4. 必須アイテム
1. ホワイト/ネイビーの基本シャツ
2. スリムフィットジーンズ
3. ベージュチノパン
4. ネイビーブレザー
5. ホワイトスニーカー

---
*これはデモレポートです。実際のAI分析は決済後にご利用いただけます。*`,

  zh: `## 风格咨询报告

### 1. 体型分析
根据您的信息，您拥有均衡的体型。

### 2. 色彩分析
- 推荐颜色：海军蓝、炭灰色、白色、米色
- 点缀色：酒红色、深蓝色、森林绿

### 3. 风格建议
- 修身衬衫搭配锥形裤
- 休闲西装打造半正式造型
- 简洁针织衫搭配休闲裤

---
*这是演示报告。实际AI分析需付费后使用。*`,

  es: `## Informe de Consultoría de Estilo

### 1. Análisis de Tipo de Cuerpo
Según tu información, tienes un tipo de cuerpo bien equilibrado.

### 2. Análisis de Color
- Colores Recomendados: Azul marino, Gris carbón, Blanco, Beige
- Colores de Acento: Burdeos, Azul profundo, Verde bosque

### 3. Recomendaciones de Estilo
- Camisas slim-fit con pantalones de corte cónico
- Blazers casuales para looks semi-formales

---
*Este es un informe de demostración. El análisis real de IA está disponible después del pago.*`
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    const body = await context.request.json()

    // Validate request body
    const validation = validateAnalyzeRequest(body)
    if (!validation.valid) {
      return createValidationErrorResponse(validation.errors!, corsHeaders)
    }

    const { photo, height, weight, gender, language } = validation.data!

    // API key 확인
    const apiKey = context.env.OPENAI_API_KEY

    if (!apiKey || apiKey.length < 20) {
      console.error('[analyze] OpenAI API key not configured or invalid')
      return errors.configError(corsHeaders)
    }

    // API 비활성화 시 Mock 응답 반환
    if (!ENABLE_API) {
      const mockReport = mockResponses[language] || mockResponses.en
      return new Response(
        JSON.stringify({ report: mockReport, demo: true }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // === 아래는 결제 연동 후 활성화 ===
    const genderText = { male: 'male', female: 'female', other: 'person' }[gender]

    const hasPhoto = photo && photo.length > 0

    const userMessage = hasPhoto
      ? `Please analyze this ${genderText}'s photo and provide a comprehensive style consultation report.

Body Information:
- Height: ${height} cm
- Weight: ${weight} kg
- Gender: ${genderText}

${languagePrompts[language] || languagePrompts.en}

Provide a detailed, personalized style report based on the photo and body information.`
      : `Please provide a comprehensive style consultation report based on the following body information.

Body Information:
- Height: ${height} cm
- Weight: ${weight} kg
- Gender: ${genderText}

${languagePrompts[language] || languagePrompts.en}

Provide a detailed, personalized style report with general recommendations based on body type and proportions.`

    // OpenAI Chat Completions API 호출
    const userContent = hasPhoto
      ? [
          { type: 'text', text: userMessage },
          { type: 'image_url', image_url: { url: photo, detail: 'high' } }
        ]
      : userMessage

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: hasPhoto ? systemPromptWithPhoto : systemPromptNoPhoto },
          {
            role: 'user',
            content: userContent
          }
        ],
        max_completion_tokens: 1500,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('OpenAI API Error:', errorData)
      return errors.externalApi('OpenAI', corsHeaders)
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>
    }

    const report = data.choices[0]?.message?.content || 'No analysis available'

    return new Response(
      JSON.stringify({ report }),
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
