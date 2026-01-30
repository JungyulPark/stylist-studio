import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { validateSendReportRequest, createValidationErrorResponse } from '../lib/validation'
import { errors } from '../lib/errors'
import { Resend } from 'resend'

interface Env {
  RESEND_API_KEY: string
}

const emailSubjects: Record<string, string> = {
  ko: '당신의 스타일 분석 리포트 - PERSONAL STYLIST',
  en: 'Your Style Analysis Report - PERSONAL STYLIST',
  ja: 'あなたのスタイル分析レポート - PERSONAL STYLIST',
  zh: '您的风格分析报告 - PERSONAL STYLIST',
  es: 'Tu Informe de Análisis de Estilo - PERSONAL STYLIST'
}

const emailIntros: Record<string, string> = {
  ko: '안녕하세요! PERSONAL STYLIST 스타일 분석 결과를 보내드립니다.',
  en: 'Hello! Here is your style analysis from PERSONAL STYLIST.',
  ja: 'こんにちは！PERSONAL STYLISTのスタイル分析結果をお届けします。',
  zh: '您好！这是您的PERSONAL STYLIST风格分析结果。',
  es: '¡Hola! Aquí está tu análisis de estilo de PERSONAL STYLIST.'
}

const emailFooters: Record<string, string> = {
  ko: '더 많은 스타일 팁을 원하시면 언제든지 다시 방문해주세요!',
  en: 'Visit us again anytime for more styling tips!',
  ja: 'もっとスタイリングのヒントが欲しい場合は、いつでもお越しください！',
  zh: '想要更多穿搭技巧，欢迎随时再来！',
  es: '¡Visítanos de nuevo en cualquier momento para más consejos de estilo!'
}

function convertMarkdownToHtml(markdown: string): string {
  return markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3 style="color: #c9a962; margin-top: 1.5em; margin-bottom: 0.5em; font-size: 1.1em;">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="color: #c9a962; margin-top: 1.5em; margin-bottom: 0.5em; font-size: 1.3em;">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 style="color: #c9a962; margin-top: 1.5em; margin-bottom: 0.5em; font-size: 1.5em;">$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Bullet points
    .replace(/^\s*[-*]\s+(.*)$/gim, '<li style="margin: 0.3em 0;">$1</li>')
    // Wrap consecutive list items in ul
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ul style="margin: 0.5em 0; padding-left: 1.5em;">$&</ul>')
    // Line breaks
    .replace(/\n\n/g, '</p><p style="margin: 0.8em 0;">')
    .replace(/\n/g, '<br>')
}

function createEmailHtml(report: string, language: string): string {
  const intro = emailIntros[language] || emailIntros.en
  const footer = emailFooters[language] || emailFooters.en
  const reportHtml = convertMarkdownToHtml(report)

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #111111; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #222;">
              <div style="font-size: 24px; font-weight: bold; color: #c9a962; letter-spacing: 2px;">
                PERSONAL STYLIST
              </div>
              <div style="font-size: 12px; color: #888; margin-top: 8px; letter-spacing: 1px;">
                YOUR STYLE ANALYSIS REPORT
              </div>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding: 30px 40px 20px;">
              <p style="color: #e0e0e0; font-size: 14px; line-height: 1.6; margin: 0;">
                ${intro}
              </p>
            </td>
          </tr>

          <!-- Report Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <div style="color: #e0e0e0; font-size: 14px; line-height: 1.7;">
                ${reportHtml}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px 40px; border-top: 1px solid #222;">
              <p style="color: #888; font-size: 12px; line-height: 1.6; margin: 0 0 20px;">
                ${footer}
              </p>
              <div style="text-align: center;">
                <a href="https://kstylist.cc" style="display: inline-block; padding: 12px 32px; background-color: #c9a962; color: #000; text-decoration: none; font-weight: bold; font-size: 12px; letter-spacing: 1px; border-radius: 4px;">
                  VISIT KSTYLIST.CC
                </a>
              </div>
            </td>
          </tr>

          <!-- Copyright -->
          <tr>
            <td style="padding: 20px 40px; background-color: #0a0a0a; text-align: center;">
              <p style="color: #555; font-size: 11px; margin: 0;">
                © 2026 PERSONAL STYLIST. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return createCorsPreflightResponse(request)
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const corsHeaders = getCorsHeaders(request)

  try {
    // Check API key
    if (!env.RESEND_API_KEY) {
      console.error('[send-report] RESEND_API_KEY not configured')
      return errors.internal(corsHeaders)
    }

    // Parse request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errors.invalidJson(corsHeaders)
    }

    // Validate request
    const validation = validateSendReportRequest(body)
    if (!validation.valid) {
      return createValidationErrorResponse(validation.errors!, corsHeaders)
    }

    const { email, report, language } = validation.data!

    // Initialize Resend
    const resend = new Resend(env.RESEND_API_KEY)

    // Create email HTML
    const htmlContent = createEmailHtml(report, language)
    const subject = emailSubjects[language] || emailSubjects.en

    // Send email
    const { data, error } = await resend.emails.send({
      from: 'PERSONAL STYLIST <noreply@kstylist.cc>',
      to: email,
      subject,
      html: htmlContent
    })

    if (error) {
      console.error('[send-report] Resend error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to send email',
          code: 'EMAIL_SEND_FAILED',
          message: error.message
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      )
    }

    console.log('[send-report] Email sent successfully:', data?.id)

    return new Response(
      JSON.stringify({ success: true, messageId: data?.id }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    )
  } catch (err) {
    console.error('[send-report] Unexpected error:', err)
    return errors.internal(corsHeaders)
  }
}
