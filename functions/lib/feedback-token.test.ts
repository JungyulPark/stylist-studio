import { describe, it, expect } from 'vitest'
import { createFeedbackToken, verifyFeedbackToken } from './feedback-token'

const SECRET = 'test-cron-secret'
const P = { email: 'a@b.co', sentDate: '2026-08-13', scenarioId: 'dressy', verdict: 'like' as const }

describe('feedback token (email one-click)', () => {
  it('round-trips a signed token', async () => {
    const t = await createFeedbackToken(P, SECRET)
    expect(await verifyFeedbackToken(t, SECRET)).toEqual(P)
  })

  it('rejects a token signed with another secret', async () => {
    const t = await createFeedbackToken(P, 'other')
    expect(await verifyFeedbackToken(t, SECRET)).toBeNull()
  })

  it('rejects a tampered verdict — a like cannot be flipped to dislike', async () => {
    const t = await createFeedbackToken(P, SECRET)
    const [, sig] = t.split('.')
    const forged = btoa('a@b.co|2026-08-13|dressy|dislike').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    expect(await verifyFeedbackToken(`${forged}.${sig}`, SECRET)).toBeNull()
  })

  it('rejects unsigned, malformed and empty tokens', async () => {
    expect(await verifyFeedbackToken('nodot', SECRET)).toBeNull()
    expect(await verifyFeedbackToken('%%%.abc', SECRET)).toBeNull()
    expect(await verifyFeedbackToken('', SECRET)).toBeNull()
  })

  it('rejects everything when no secret is configured', async () => {
    const t = await createFeedbackToken(P, SECRET)
    expect(await verifyFeedbackToken(t, undefined)).toBeNull()
  })
})

import { createShareToken, verifyShareToken, createOwnerSignature, verifyOwnerSignature } from './feedback-token'

describe('share token (email "Share this look")', () => {
  const S = { email: 'a@b.co', sentDate: '2026-10-14', scenarioId: 'casual' }

  it('round-trips a signed share token', async () => {
    const t = await createShareToken(S, SECRET)
    expect(await verifyShareToken(t, SECRET)).toEqual(S)
  })

  it('is not interchangeable with a feedback token (either direction)', async () => {
    const share = await createShareToken(S, SECRET)
    const like = await createFeedbackToken(P, SECRET)
    expect(await verifyFeedbackToken(share, SECRET)).toBeNull()
    expect(await verifyShareToken(like, SECRET)).toBeNull()
  })

  it('rejects tokens signed with another secret or without a secret', async () => {
    expect(await verifyShareToken(await createShareToken(S, 'other'), SECRET)).toBeNull()
    expect(await verifyShareToken(await createShareToken(S, SECRET), undefined)).toBeNull()
  })
})

describe('owner signature (stop-sharing control)', () => {
  const ID = '6f1c2b0e-8a7d-4c5e-9f00-1234567890ab'

  it('verifies only for the share it was issued for', async () => {
    const sig = await createOwnerSignature(ID, SECRET)
    expect(await verifyOwnerSignature(ID, sig, SECRET)).toBe(true)
    expect(await verifyOwnerSignature('6f1c2b0e-8a7d-4c5e-9f00-ffffffffffff', sig, SECRET)).toBe(false)
    expect(await verifyOwnerSignature(ID, '', SECRET)).toBe(false)
    expect(await verifyOwnerSignature(ID, sig, 'other')).toBe(false)
  })
})
