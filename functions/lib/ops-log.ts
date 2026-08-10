/**
 * 운영 로그 + 오너 알림.
 *
 * logOpsEvent: 돈이 움직인 모든 순간(결제/구독/환불)과 크론 요약을
 * Supabase ops_events에 영구 기록. 실패해도 본 흐름을 절대 깨지 않는다.
 *
 * notifyOwner: 환불 발생·크론 대량 실패처럼 사람이 봐야 하는 일을
 * Resend로 즉시 이메일 알림.
 */

interface OpsEnv {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  RESEND_API_KEY?: string
  OWNER_ALERT_EMAIL?: string
}

const DEFAULT_OWNER = 'mdjypark@gmail.com'

export async function logOpsEvent(
  env: OpsEnv,
  eventType: string,
  fields: { email?: string; refId?: string; payload?: Record<string, unknown> }
): Promise<void> {
  try {
    await fetch(`${env.SUPABASE_URL}/rest/v1/ops_events`, {
      method: 'POST',
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        event_type: eventType,
        actor_email: fields.email || null,
        ref_id: fields.refId || null,
        payload: fields.payload || null,
      }),
    })
  } catch (e) {
    console.warn('[ops-log] Failed to record event (non-blocking):', eventType, e)
  }
}

export async function notifyOwner(env: OpsEnv, subject: string, text: string): Promise<void> {
  if (!env.RESEND_API_KEY) return
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PERSONAL STYLIST Ops <noreply@kstylist.cc>',
        to: env.OWNER_ALERT_EMAIL || DEFAULT_OWNER,
        subject: `[kstylist ops] ${subject}`,
        text,
      }),
    })
  } catch (e) {
    console.warn('[ops-log] Owner notify failed (non-blocking):', e)
  }
}
