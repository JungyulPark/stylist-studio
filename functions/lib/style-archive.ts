/**
 * 아카이브 — 지금까지 받은 아침 룩을 월별 "에디션"으로 묶는다.
 * 순수 함수 (DB 행 → 응답 형태). 리텐션 장치: 쌓인 기록이 곧 해지 비용이다.
 */

export interface ArchiveRow {
  sent_date: string
  created_at?: string | null
  outfit_images: Array<{ id: string; label?: string; name?: string; url: string }> | null
}

export interface FeedbackRow {
  sent_date: string
  scenario_id: string
  verdict: string
}

export interface ArchiveLook {
  date: string
  id: string
  label: string
  name: string
  url: string
  loved: boolean
}

export interface ArchiveMonth {
  month: string // YYYY-MM
  looks: number
  loved: number
  items: ArchiveLook[]
}

export function buildArchive(rows: ArchiveRow[], feedback: FeedbackRow[]): ArchiveMonth[] {
  // 강제 재실행으로 같은 날 기록이 여럿일 수 있다 — 그날의 마지막 기록만
  const latestByDate = new Map<string, ArchiveRow>()
  for (const row of rows) {
    if (!row.outfit_images?.length) continue
    const prev = latestByDate.get(row.sent_date)
    if (!prev || (row.created_at || '') > (prev.created_at || '')) latestByDate.set(row.sent_date, row)
  }

  const loved = new Set(
    feedback.filter(f => f.verdict === 'like').map(f => `${f.sent_date}|${f.scenario_id}`)
  )

  const months = new Map<string, ArchiveMonth>()
  const dates = [...latestByDate.keys()].sort().reverse()
  for (const date of dates) {
    const key = date.slice(0, 7)
    let month = months.get(key)
    if (!month) {
      month = { month: key, looks: 0, loved: 0, items: [] }
      months.set(key, month)
    }
    for (const img of latestByDate.get(date)!.outfit_images!) {
      if (!img.url) continue
      const isLoved = loved.has(`${date}|${img.id}`)
      month.items.push({
        date,
        id: img.id,
        label: img.label || img.id,
        name: img.name || img.label || img.id,
        url: img.url,
        loved: isLoved,
      })
      month.looks++
      if (isLoved) month.loved++
    }
  }
  return [...months.values()]
}
