/**
 * Signed unsubscribe tokens for daily style emails.
 *
 * Format: `base64url(subscriberId:email).hmacSha256Hex`
 * Signed with CRON_SECRET (same secret that already protects the cron endpoint).
 *
 * Legacy format (unsigned `btoa(subscriberId:email)`) is still accepted on
 * verification so unsubscribe links in already-sent emails keep working.
 * TODO: drop legacy acceptance after 2026-08-01 (30+ days past last unsigned send).
 */

const encoder = new TextEncoder()

function base64UrlEncode(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  return atob(base64)
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) return null
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

export async function createUnsubscribeToken(
  subscriberId: string,
  email: string,
  secret: string | undefined
): Promise<string> {
  const payload = base64UrlEncode(`${subscriberId}:${email}`)
  if (!secret) {
    console.warn('[unsubscribe-token] CRON_SECRET not set — issuing unsigned token')
    return payload
  }
  const key = await importHmacKey(secret)
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const signatureHex = [...new Uint8Array(signature)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return `${payload}.${signatureHex}`
}

export interface UnsubscribeTokenPayload {
  subscriberId: string
  email: string
}

export async function verifyUnsubscribeToken(
  token: string,
  secret: string | undefined
): Promise<UnsubscribeTokenPayload | null> {
  const dotIndex = token.indexOf('.')
  let encodedPayload: string

  if (dotIndex !== -1) {
    encodedPayload = token.slice(0, dotIndex)
    const signatureBytes = hexToBytes(token.slice(dotIndex + 1))
    if (!secret || !signatureBytes) return null
    const key = await importHmacKey(secret)
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes as unknown as ArrayBuffer,
      encoder.encode(encodedPayload)
    )
    if (!valid) return null
  } else {
    // Legacy unsigned token from emails sent before signing was introduced
    encodedPayload = token
  }

  let decoded: string
  try {
    decoded = base64UrlDecode(encodedPayload)
  } catch {
    return null
  }

  const colonIndex = decoded.indexOf(':')
  if (colonIndex <= 0 || colonIndex === decoded.length - 1) return null

  return {
    subscriberId: decoded.slice(0, colonIndex),
    email: decoded.slice(colonIndex + 1),
  }
}
