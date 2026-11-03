import { describe, it, expect } from 'vitest'
import { isEntitledToDaily } from './subscription-access'

const NOW = new Date('2026-11-03T00:00:00Z')
const PAST = '2026-02-21T10:01:17Z'
const FUTURE = '2026-11-20T00:00:00Z'
const base = { status: 'active', canceled_at: null, current_period_end: null, trial_ends_at: null }

describe('daily email entitlement', () => {
  it('stops a canceled subscriber even when canceled_at was never recorded (production bug)', () => {
    expect(isEntitledToDaily({ ...base, status: 'canceled', trial_ends_at: PAST }, NOW)).toBe(false)
    expect(isEntitledToDaily({ ...base, status: 'canceled' }, NOW)).toBe(false)
  })

  it('keeps a canceled subscriber only until the paid-through date', () => {
    expect(isEntitledToDaily({ ...base, status: 'canceled', canceled_at: PAST, current_period_end: FUTURE }, NOW)).toBe(true)
    expect(isEntitledToDaily({ ...base, status: 'canceled', canceled_at: PAST, current_period_end: PAST }, NOW)).toBe(false)
  })

  it('honours a scheduled cancellation on an active subscription', () => {
    expect(isEntitledToDaily({ ...base, canceled_at: PAST, current_period_end: FUTURE }, NOW)).toBe(true)
    expect(isEntitledToDaily({ ...base, canceled_at: PAST, current_period_end: PAST }, NOW)).toBe(false)
  })

  it('serves active and trialing subscribers', () => {
    expect(isEntitledToDaily(base, NOW)).toBe(true)
    expect(isEntitledToDaily({ ...base, status: 'trialing', trial_ends_at: FUTURE }, NOW)).toBe(true)
  })
})
