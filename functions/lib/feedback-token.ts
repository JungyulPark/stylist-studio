/**
 * 이메일 원클릭 피드백 토큰.
 *
 * 이메일 클라이언트는 POST를 못 하고 세션도 없다. 그래서 좋아요/별로예요
 * 링크는 GET + HMAC 서명 토큰으로 신원과 대상을 함께 증명한다.
 * 서명 키는 CRON_SECRET (수신거부 토큰과 동일한 신뢰 뿌리).
 *
 * payload: email|sent_date|scenario_id|verdict
 */

const encoder = new TextEncoder()

function b64url(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(value: string): string {
  return atob(value.replace(/-/g, '+').replace(/_/g, '/'))
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
}

async function sign(payload: string, secret: string): Promise<string> {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(payload))
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('')
}

export interface FeedbackPayload {
  email: string
  sentDate: string
  scenarioId: string
  verdict: 'like' | 'dislike'
}

export async function createFeedbackToken(p: FeedbackPayload, secret: string | undefined): Promise<string> {
  const payload = b64url(`${p.email}|${p.sentDate}|${p.scenarioId}|${p.verdict}`)
  if (!secret) return payload
  return `${payload}.${await sign(payload, secret)}`
}

export async function verifyFeedbackToken(
  token: string,
  secret: string | undefined
): Promise<FeedbackPayload | null> {
  const dot = token.indexOf('.')
  if (dot === -1 || !secret) return null

  const payload = token.slice(0, dot)
  const expected = await sign(payload, secret)
  const given = token.slice(dot + 1)
  // 길이 비교 후 상수 시간 비교
  if (given.length !== expected.length) return null
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i)
  if (diff !== 0) return null

  let decoded: string
  try {
    decoded = b64urlDecode(payload)
  } catch {
    return null
  }

  const parts = decoded.split('|')
  if (parts.length !== 4) return null
  const [email, sentDate, scenarioId, verdict] = parts
  if (!email || !/^\d{4}-\d{2}-\d{2}$/.test(sentDate) || !scenarioId) return null
  if (verdict !== 'like' && verdict !== 'dislike') return null

  return { email, sentDate, scenarioId, verdict }
}
