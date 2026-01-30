import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { errors } from '../lib/errors'
import { Resend } from 'resend'

interface Env {
  RESEND_API_KEY: string
}

interface PaymentEmailRequest {
  email: string
  productType: 'hair' | 'full'
  amount: number
  currency: string
  language?: string
}

const productNames: Record<string, Record<string, string>> = {
  hair: {
    ko: '헤어스타일 변환',
    en: 'Hair Transformation',
    ja: 'ヘアスタイル変換',
    zh: '发型变换',
    es: 'Transformación de Peinado'
  },
  full: {
    ko: '풀 스타일 패키지',
    en: 'Full Style Package',
    ja: 'フルスタイルパッケージ',
    zh: '全套风格套餐',
    es: 'Paquete de Estilo Completo'
  }
}

const emailContent: Record<string, { subject: string; greeting: string; thankYou: string; productLabel: string; amountLabel: string; instructions: string; warning: string; footer: string }> = {
  ko: {
    subject: '결제 완료 - PERSONAL STYLIST',
    greeting: '안녕하세요!',
    thankYou: 'PERSONAL STYLIST를 이용해 주셔서 감사합니다. 결제가 완료되었습니다.',
    productLabel: '구매 상품',
    amountLabel: '결제 금액',
    instructions: '이제 스타일 분석이 자동으로 시작됩니다. 잠시만 기다려주세요.',
    warning: '중요: 이 이메일은 결제 시 입력하신 이메일 주소로 전송되었습니다. 이메일 주소 오타로 인한 수신 불가는 환불 사유가 되지 않습니다.',
    footer: '분석 결과는 완료 후 "이메일로 받기" 버튼을 통해 받아보실 수 있습니다.'
  },
  en: {
    subject: 'Payment Confirmed - PERSONAL STYLIST',
    greeting: 'Hello!',
    thankYou: 'Thank you for using PERSONAL STYLIST. Your payment has been confirmed.',
    productLabel: 'Product',
    amountLabel: 'Amount',
    instructions: 'Your style analysis will now begin automatically. Please wait a moment.',
    warning: 'Important: This email was sent to the address you provided during checkout. Email address typos do not qualify for refunds.',
    footer: 'After the analysis is complete, you can receive your results via email using the "Email Report" button.'
  },
  ja: {
    subject: '決済完了 - PERSONAL STYLIST',
    greeting: 'こんにちは！',
    thankYou: 'PERSONAL STYLISTをご利用いただきありがとうございます。お支払いが完了しました。',
    productLabel: '購入商品',
    amountLabel: 'お支払い金額',
    instructions: 'スタイル分析が自動的に開始されます。しばらくお待ちください。',
    warning: '重要：このメールは、チェックアウト時にご入力いただいたメールアドレスに送信されています。メールアドレスの入力ミスによる受信不可は返金対象外となります。',
    footer: '分析完了後、「メールで受け取る」ボタンから結果を受け取ることができます。'
  },
  zh: {
    subject: '支付成功 - PERSONAL STYLIST',
    greeting: '您好！',
    thankYou: '感谢使用PERSONAL STYLIST。您的付款已确认。',
    productLabel: '购买商品',
    amountLabel: '支付金额',
    instructions: '您的风格分析将自动开始。请稍候。',
    warning: '重要提示：此邮件已发送至您结账时提供的邮箱地址。因邮箱地址输入错误导致无法接收不属于退款范围。',
    footer: '分析完成后，您可以通过"发送到邮箱"按钮接收结果。'
  },
  es: {
    subject: 'Pago Confirmado - PERSONAL STYLIST',
    greeting: '¡Hola!',
    thankYou: 'Gracias por usar PERSONAL STYLIST. Tu pago ha sido confirmado.',
    productLabel: 'Producto',
    amountLabel: 'Monto',
    instructions: 'Tu análisis de estilo comenzará automáticamente. Por favor espera un momento.',
    warning: 'Importante: Este correo fue enviado a la dirección que proporcionaste durante el pago. Los errores tipográficos en la dirección de correo no califican para reembolso.',
    footer: 'Después de completar el análisis, puedes recibir tus resultados por correo usando el botón "Enviar por Email".'
  }
}

function createPaymentEmailHtml(
  productType: 'hair' | 'full',
  amount: number,
  currency: string,
  language: string
): string {
  const content = emailContent[language] || emailContent.en
  const productName = productNames[productType]?.[language] || productNames[productType]?.en || productType

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#111;border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="padding:40px 40px 20px;text-align:center;border-bottom:1px solid #222;">
          <div style="font-size:24px;font-weight:bold;color:#c9a962;letter-spacing:2px;">PERSONAL STYLIST</div>
          <div style="font-size:12px;color:#888;margin-top:8px;letter-spacing:1px;">PAYMENT CONFIRMED</div>
        </td></tr>

        <!-- Content -->
        <tr><td style="padding:40px;">
          <p style="color:#e0e0e0;font-size:16px;margin:0 0 20px;">${content.greeting}</p>
          <p style="color:#e0e0e0;line-height:1.7;margin:0 0 30px;">${content.thankYou}</p>

          <!-- Order Details -->
          <div style="background:rgba(201,169,98,0.1);border:1px solid rgba(201,169,98,0.3);border-radius:8px;padding:20px;margin-bottom:30px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color:#888;padding:8px 0;">${content.productLabel}</td>
                <td style="color:#fff;text-align:right;padding:8px 0;font-weight:bold;">${productName}</td>
              </tr>
              <tr>
                <td style="color:#888;padding:8px 0;border-top:1px solid rgba(255,255,255,0.1);">${content.amountLabel}</td>
                <td style="color:#c9a962;text-align:right;padding:8px 0;font-weight:bold;font-size:1.2em;border-top:1px solid rgba(255,255,255,0.1);">$${(amount / 100).toFixed(2)} ${currency.toUpperCase()}</td>
              </tr>
            </table>
          </div>

          <p style="color:#e0e0e0;line-height:1.7;margin:0 0 20px;">${content.instructions}</p>
          <p style="color:#888;font-size:0.9em;line-height:1.6;margin:0 0 20px;">${content.footer}</p>

          <!-- Warning -->
          <div style="background:rgba(255,107,107,0.1);border-left:3px solid #ff6b6b;padding:15px;margin-top:30px;">
            <p style="color:#ff6b6b;font-size:0.85em;margin:0;line-height:1.6;">${content.warning}</p>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:30px 40px;background-color:#0a0a0a;text-align:center;">
          <a href="https://kstylist.cc" style="display:inline-block;padding:12px 32px;background-color:#c9a962;color:#000;text-decoration:none;font-weight:bold;font-size:12px;letter-spacing:1px;border-radius:4px;">VISIT KSTYLIST.CC</a>
          <p style="color:#555;font-size:11px;margin:20px 0 0;">© 2026 PERSONAL STYLIST. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const corsHeaders = getCorsHeaders(request)

  try {
    if (!env.RESEND_API_KEY) {
      console.error('[send-payment-email] RESEND_API_KEY not configured')
      return errors.configError(corsHeaders)
    }

    let body: PaymentEmailRequest
    try {
      body = await request.json() as PaymentEmailRequest
    } catch {
      return errors.invalidJson(corsHeaders)
    }

    const { email, productType, amount, currency, language = 'en' } = body

    if (!email || !productType || amount === undefined) {
      return errors.validation('Email, productType, and amount are required', corsHeaders)
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return errors.validation('Invalid email format', corsHeaders)
    }

    const resend = new Resend(env.RESEND_API_KEY)
    const content = emailContent[language] || emailContent.en

    const { data, error } = await resend.emails.send({
      from: 'PERSONAL STYLIST <noreply@kstylist.cc>',
      to: email,
      subject: content.subject,
      html: createPaymentEmailHtml(productType, amount, currency, language)
    })

    if (error) {
      console.error('[send-payment-email] Resend error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to send email', message: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    console.log('[send-payment-email] Email sent:', data?.id)

    return new Response(
      JSON.stringify({ success: true, messageId: data?.id }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (err) {
    console.error('[send-payment-email] Unexpected error:', err)
    return errors.internal(corsHeaders)
  }
}

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return createCorsPreflightResponse(request)
}
