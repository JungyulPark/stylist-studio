/**
 * Minimal Web Push sender for Cloudflare Workers.
 *
 * Sends payload-LESS pushes (no RFC 8291 encryption needed): the service
 * worker shows a fixed "today's look has arrived" notification and opens
 * the dashboard. Only VAPID (RFC 8292) auth is required — an ES256 JWT
 * signed with the key in the VAPID_PRIVATE_JWK env var.
 */

interface PushEnv {
  VAPID_PRIVATE_JWK?: string
  VAPID_SUBJECT?: string
}

function b64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

const encoder = new TextEncoder()

/**
 * Send an empty push to one endpoint.
 * Returns the push service's HTTP status; 404/410 mean the subscription
 * is dead and should be deleted by the caller.
 */
export async function sendEmptyPush(endpoint: string, env: PushEnv): Promise<number> {
  if (!env.VAPID_PRIVATE_JWK) {
    console.warn('[web-push] VAPID_PRIVATE_JWK not configured — skipping push')
    return 0
  }

  const jwk = JSON.parse(env.VAPID_PRIVATE_JWK) as JsonWebKey & { x: string; y: string }
  const url = new URL(endpoint)
  const aud = `${url.protocol}//${url.host}`

  const key = await crypto.subtle.importKey(
    'jwk', jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  )

  const header = b64url(encoder.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const claims = b64url(encoder.encode(JSON.stringify({
    aud,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: env.VAPID_SUBJECT || 'mailto:noreply@kstylist.cc',
  })))
  const signingInput = `${header}.${claims}`
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    encoder.encode(signingInput)
  )
  const jwt = `${signingInput}.${b64url(new Uint8Array(signature))}`

  // Uncompressed public key (0x04 || x || y) for the k= parameter
  const x = b64urlDecode(jwk.x)
  const y = b64urlDecode(jwk.y)
  const pub = new Uint8Array(65)
  pub[0] = 4
  pub.set(x, 1)
  pub.set(y, 33)

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'TTL': '43200',
      'Urgency': 'high',
      'Authorization': `vapid t=${jwt}, k=${b64url(pub)}`,
    },
  })

  if (!res.ok && res.status !== 201) {
    console.warn(`[web-push] Push service returned ${res.status} for ${url.host}`)
  }
  return res.status
}
