/**
 * The Edit 뉴스레터 — 그 주의 트렌드 에디트를 저널 구독자에게 보낸다.
 *
 * 매시 크론에 얹혀 돈다. 발송 장부는 ops_events(journal.sent, ref_id=에디션 slug)라
 * 새 테이블이 필요 없다. 발행 후 6일 이내의 에디션만 보내므로 주중에 가입한 사람은
 * 다음 실행에서 이번 주 호를 받고, 준비된 에디션이 떨어지면 조용히 멈춘다.
 */
import {
  EMAIL_COLORS as C,
  EMAIL_SERIF as SERIF,
  EMAIL_SANS as SANS,
  EMAIL_KEEP as KEEP,
  emailTrack as track,
  emailItalic as italic,
  emailRule as rule,
  escapeHtml,
} from './daily-email'
import { latestEdition, type Edition, type EditLang } from './edit-data'
import { editPath } from './wtw-render'
import { createUnsubscribeToken } from './unsubscribe-token'

const SITE = 'https://kstylist.cc'
const FRESH_DAYS = 6
const MAX_PER_RUN = 40

const COPY: Record<EditLang, { kicker: string; wear: string; cta: string; unsubscribe: string; subject: (t: string) => string }> = {
  en: { kicker: 'The Edit', wear: 'How to wear it', cta: 'Read the full edit', unsubscribe: 'Unsubscribe', subject: t => `The Edit: ${t}` },
  ko: { kicker: '트렌드 에디트', wear: '이렇게 입으세요', cta: '전체 에디트 읽기', unsubscribe: '구독 해지', subject: t => `이번 주 트렌드 에디트: ${t}` },
}

export function editEmailSubject(e: Edition, lang: EditLang): string {
  return COPY[lang].subject(e[lang].title)
}

export function buildEditEmailHtml(e: Edition, lang: EditLang, unsubUrl: string): string {
  const c = e[lang]
  const ui = COPY[lang]
  const url = `${SITE}${editPath(lang, e.slug)}?utm_source=the_edit&utm_medium=email&utm_campaign=${encodeURIComponent(e.slug)}`
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<style>:root{color-scheme:dark;supported-color-schemes:dark;}body{margin:0;padding:0;}</style>
</head>
<body bgcolor="${C.bg}" style="margin:0;padding:0;background-color:${C.bg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg};font-size:1px;line-height:1px;">${escapeHtml(c.dek)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.bg}" style="background-color:${C.bg};">
    <tr>
      <td align="center" style="padding:40px 16px 32px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr><td align="center" style="padding:0 0 22px;font-family:${SERIF};font-size:14px;letter-spacing:7px;color:${C.gold};">ATELIER HUE</td></tr>
          ${rule()}
          <tr><td align="center" style="padding:28px 0 8px;font-family:${SANS};font-size:10px;${track(lang, 4)}text-transform:uppercase;color:${C.gold};">${escapeHtml(ui.kicker)} &middot; No. ${String(e.no).padStart(2, '0')}</td></tr>
          <tr><td align="center" style="padding:0 16px 12px;font-family:${SERIF};font-size:32px;line-height:1.2;color:${C.ink};${KEEP}">${escapeHtml(c.title)}</td></tr>
          <tr><td align="center" style="padding:0 20px 28px;font-family:${SERIF};${italic(lang)}font-size:18px;line-height:1.6;color:${C.ink};${KEEP}">${escapeHtml(c.dek)}</td></tr>
          <tr><td align="center"><a href="${url}"><img src="${SITE}${e.images.her}" width="480" alt="${escapeHtml(c.title)}" style="display:block;width:100%;max-width:480px;height:auto;border:1px solid ${C.rule};" /></a></td></tr>
          <tr><td style="padding:28px 12px 6px;font-family:${SANS};font-size:15px;line-height:1.7;color:${C.muted};${KEEP}">${escapeHtml(c.trend[0])}</td></tr>
          <tr><td align="center" style="padding:26px 0 10px;font-family:${SANS};font-size:10px;${track(lang, 4)}text-transform:uppercase;color:${C.gold};">${escapeHtml(ui.wear)}</td></tr>
          ${c.wear.map((w, i) => `<tr><td style="padding:12px 12px;border-top:1px solid ${C.rule};">
            <div style="font-family:${SERIF};font-size:17px;color:${C.ink};${KEEP}"><span style="color:${C.gold};">0${i + 1}</span>&nbsp;&nbsp;${escapeHtml(w.h)}</div>
            <div style="padding-top:5px;font-family:${SANS};font-size:14px;line-height:1.65;color:${C.muted};${KEEP}">${escapeHtml(w.p)}</div>
          </td></tr>`).join('')}
          ${rule()}
          <tr><td align="center" style="padding:32px 0 34px;">
            <a href="${url}" style="display:inline-block;font-family:${SANS};font-size:12px;${track(lang, 3)}text-transform:uppercase;color:${C.gold};text-decoration:none;border:1px solid ${C.gold};padding:14px 30px;">${escapeHtml(ui.cta)}</a>
          </td></tr>
          <tr><td align="center" style="font-family:${SANS};font-size:11px;color:${C.dim};">
            <a href="${escapeHtml(unsubUrl)}" style="color:${C.dim};text-decoration:underline;">${escapeHtml(ui.unsubscribe)}</a>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export interface EditMailEnv {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  CRON_SECRET: string
  RESEND_API_KEY?: string
}

interface Mailer {
  emails: { send: (msg: { from: string; to: string; subject: string; html: string; headers?: Record<string, string> }) => Promise<unknown> }
}

function daysBetween(a: string, b: Date): number {
  return Math.floor((b.getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86_400_000)
}

export async function runEditNewsletter(
  env: EditMailEnv,
  mailer: Mailer | null,
  now: Date = new Date()
): Promise<{ edition: string | null; sent: number; failed: number }> {
  const out = { edition: null as string | null, sent: 0, failed: 0 }
  if (!mailer) return out
  const e = latestEdition(now)
  if (!e || daysBetween(e.date, now) > FRESH_DAYS) return out
  out.edition = e.slug

  try {
    const headers = { 'apikey': env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}` }
    const [subRes, sentRes] = await Promise.all([
      fetch(`${env.SUPABASE_URL}/rest/v1/journal_subscribers?status=eq.active&select=email,lang&order=created_at.asc&limit=1000`, { headers }),
      fetch(`${env.SUPABASE_URL}/rest/v1/ops_events?event_type=eq.journal.sent&ref_id=eq.${encodeURIComponent(e.slug)}&select=actor_email&limit=5000`, { headers }),
    ])
    // 장부를 못 읽으면 보내지 않는다 — 중복 발송보다 한 시간 늦는 편이 낫다
    if (!subRes.ok || !sentRes.ok) return out
    const subs = await subRes.json() as Array<{ email: string; lang: string | null }>
    const already = new Set((await sentRes.json() as Array<{ actor_email: string | null }>).map(r => (r.actor_email || '').toLowerCase()))
    const pending = subs.filter(s => s.email && !already.has(s.email.toLowerCase())).slice(0, MAX_PER_RUN)

    for (const s of pending) {
      const lang: EditLang = s.lang === 'ko' ? 'ko' : 'en'
      try {
        const unsubUrl = `${SITE}/api/journal-subscribe?token=${encodeURIComponent(
          await createUnsubscribeToken('journal', s.email, env.CRON_SECRET)
        )}`
        // 보내기 전에 장부부터 쓴다 (최대 1회 발송). 장부 기록이 실패하면 매시간 중복 발송될 수 있으므로
        // 이번 실행을 멈춘다 — 메일 한 통을 놓치는 쪽이 같은 메일을 반복해서 보내는 쪽보다 낫다.
        const ledger = await fetch(`${env.SUPABASE_URL}/rest/v1/ops_events`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({ event_type: 'journal.sent', actor_email: s.email, ref_id: e.slug }),
        })
        if (!ledger.ok) {
          console.error('[edit-mailer] ledger write failed:', ledger.status)
          break
        }
        await mailer.emails.send({
          from: 'ATELIER HUE <noreply@kstylist.cc>',
          to: s.email,
          subject: editEmailSubject(e, lang),
          html: buildEditEmailHtml(e, lang, unsubUrl),
          headers: { 'List-Unsubscribe': `<${unsubUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
        })
        out.sent++
      } catch (err) {
        console.error('[edit-mailer] send failed:', err)
        out.failed++
      }
    }
  } catch (err) {
    console.error('[edit-mailer] run failed:', err)
  }
  return out
}
