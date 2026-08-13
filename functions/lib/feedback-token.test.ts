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
