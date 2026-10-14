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

async function verifySignature(payload: string, given: string, secret: string): Promise<boolean> {
  const expected = await sign(payload, secret)
  if (given.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i)
  return diff === 0
}

/**
 * 공유 토큰 — 이메일의 "공유하기" 원클릭 링크.
 * payload 첫 칸을 'share'로 고정해 피드백 토큰과 서로 대체될 수 없게 한다.
 */
export interface SharePayload {
  email: string
  sentDate: string
  scenarioId: string
}

export async function createShareToken(p: SharePayload, secret: string | undefined): Promise<string> {
  const payload = b64url(`share|${p.email}|${p.sentDate}|${p.scenarioId}`)
  if (!secret) return payload
  return `${payload}.${await sign(payload, secret)}`
}

export async function verifyShareToken(token: string, secret: string | undefined): Promise<SharePayload | null> {
  const dot = token.indexOf('.')
  if (dot === -1 || !secret) return null
  const payload = token.slice(0, dot)
  if (!await verifySignature(payload, token.slice(dot + 1), secret)) return null

  let decoded: string
  try {
    decoded = b64urlDecode(payload)
  } catch {
    return null
  }
  const parts = decoded.split('|')
  if (parts.length !== 4 || parts[0] !== 'share') return null
  const [, email, sentDate, scenarioId] = parts
  if (!email || !/^\d{4}-\d{2}-\d{2}$/.test(sentDate) || !scenarioId) return null
  return { email, sentDate, scenarioId }
}

/** 공유 페이지 소유자 서명 — 이 값을 가진 사람만 카드 저장·공유 중지 UI를 본다 */
export async function createOwnerSignature(shareId: string, secret: string | undefined): Promise<string> {
  if (!secret) return ''
  return sign(`owner|${shareId}`, secret)
}

export async function verifyOwnerSignature(shareId: string, sig: string, secret: string | undefined): Promise<boolean> {
  if (!secret || !sig) return false
  return verifySignature(`owner|${shareId}`, sig, secret)
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
