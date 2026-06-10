import { describe, it, expect } from 'vitest'
import { createUnsubscribeToken, verifyUnsubscribeToken } from './unsubscribe-token'

const SECRET = 'test-cron-secret'
const SUBSCRIBER_ID = '4f9c2e1a-7b3d-4c5e-8f6a-1b2c3d4e5f6a'
const EMAIL = 'user+tag@example.com'

describe('createUnsubscribeToken', () => {
  it('creates a signed token with payload and signature parts', async () => {
    const token = await createUnsubscribeToken(SUBSCRIBER_ID, EMAIL, SECRET)
    const parts = token.split('.')
    expect(parts).toHaveLength(2)
    expect(parts[1]).toMatch(/^[0-9a-f]{64}$/)
  })

  it('produces URL-safe tokens (no +, /, =)', async () => {
    const token = await createUnsubscribeToken(SUBSCRIBER_ID, EMAIL, SECRET)
    expect(token).not.toMatch(/[+/=]/)
  })

  it('falls back to unsigned token when secret is missing', async () => {
    const token = await createUnsubscribeToken(SUBSCRIBER_ID, EMAIL, undefined)
    expect(token).not.toContain('.')
  })
})

describe('verifyUnsubscribeToken', () => {
  it('round-trips a signed token', async () => {
    const token = await createUnsubscribeToken(SUBSCRIBER_ID, EMAIL, SECRET)
    const payload = await verifyUnsubscribeToken(token, SECRET)
    expect(payload).toEqual({ subscriberId: SUBSCRIBER_ID, email: EMAIL })
  })

  it('rejects a token signed with a different secret', async () => {
    const token = await createUnsubscribeToken(SUBSCRIBER_ID, EMAIL, 'other-secret')
    expect(await verifyUnsubscribeToken(token, SECRET)).toBeNull()
  })

  it('rejects a token with a tampered payload', async () => {
    const token = await createUnsubscribeToken(SUBSCRIBER_ID, EMAIL, SECRET)
    const [, signature] = token.split('.')
    const forgedPayload = btoa(`${SUBSCRIBER_ID}:attacker@evil.com`)
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    expect(await verifyUnsubscribeToken(`${forgedPayload}.${signature}`, SECRET)).toBeNull()
  })

  it('rejects a signed token with malformed signature hex', async () => {
    const token = await createUnsubscribeToken(SUBSCRIBER_ID, EMAIL, SECRET)
    const [payload] = token.split('.')
    expect(await verifyUnsubscribeToken(`${payload}.nothex`, SECRET)).toBeNull()
  })

  it('accepts legacy unsigned btoa tokens', async () => {
    const legacy = btoa(`${SUBSCRIBER_ID}:${EMAIL}`)
    const payload = await verifyUnsubscribeToken(legacy, SECRET)
    expect(payload).toEqual({ subscriberId: SUBSCRIBER_ID, email: EMAIL })
  })

  it('handles emails containing colons by splitting at first colon only', async () => {
    const token = await createUnsubscribeToken('abc', 'weird:email@example.com', SECRET)
    const payload = await verifyUnsubscribeToken(token, SECRET)
    expect(payload).toEqual({ subscriberId: 'abc', email: 'weird:email@example.com' })
  })

  it('rejects garbage tokens', async () => {
    expect(await verifyUnsubscribeToken('%%%not-base64%%%', SECRET)).toBeNull()
    expect(await verifyUnsubscribeToken(btoa('no-colon-here'), SECRET)).toBeNull()
  })
})
