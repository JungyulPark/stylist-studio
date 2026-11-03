/**
 * 누가 오늘 아침 메일을 받을 자격이 있는가.
 *
 * status='canceled'는 그 자체로 해지다 — canceled_at이 비어 있는 과거
 * 데이터도 있어서 날짜 컬럼만 보면 해지자에게 계속 발송된다.
 * 해지자는 이미 낸 기간(current_period_end, 없으면 trial_ends_at)이
 * 남아 있을 때만 받는다.
 */
export interface AccessFields {
  status: string | null
  canceled_at: string | null
  current_period_end: string | null
  trial_ends_at: string | null
}

export function isEntitledToDaily(sub: AccessFields, now: Date = new Date()): boolean {
  const paidThrough = sub.current_period_end || sub.trial_ends_at
  const stillPaid = !!paidThrough && new Date(paidThrough) > now

  if (sub.status === 'canceled') return stillPaid
  // 해지 예약(기간 끝까지 유지) — 기간이 지났으면 중단
  if (sub.canceled_at) return !paidThrough || stillPaid
  return sub.status === 'active' || sub.status === 'trialing'
}
