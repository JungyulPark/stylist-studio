/**
 * 데일리 이메일 — "매일 받는 잡지 한 페이지".
 *
 * 크론에서 분리한 순수 렌더링 모듈 (네트워크 없음 → 단위 테스트 가능).
 * 규칙: UI에 이모지 금지, 모델 출력은 전부 이스케이프, 순백(#fff) 금지
 * (Gmail 다크모드 반전 트리거), 실제 브랜드명 노출 금지.
 */

export interface LookNote {
  items: string[]
  why: string
}

/** gpt-5-mini가 JSON으로 돌려주는 스타일리스트 노트 */
export interface StyleNote {
  subject: string
  preheader: string
  greeting: string
  personal_note: string
  dressy: LookNote
  casual: LookNote
  tip: string
}

export interface EmailLook {
  id: string
  label: string
  name: string
  url: string
  likeUrl: string
  dislikeUrl: string
  shareUrl: string
}

export interface DailyEmailInput {
  lang: string
  city: string
  timezone: string
  temp: number
  condition: string
  issueNo: number
  note: StyleNote
  looks: EmailLook[]
  unsubUrl: string
  now?: Date
}

const COLORS = {
  bg: '#101018',
  ink: '#F5F2E9',
  muted: '#A9A497',
  dim: '#77736A',
  gold: '#C9A962',
  rule: 'rgba(201,169,98,0.35)',
}

const SERIF = "'Playfair Display',Georgia,'Times New Roman',serif"
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"

const LOCALES: Record<string, string> = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN', es: 'es-ES' }

const CONDITIONS: Record<string, Record<string, string>> = {
  Clear: { ko: '맑음', en: 'Clear', ja: '晴れ', zh: '晴', es: 'Despejado' },
  Clouds: { ko: '흐림', en: 'Cloudy', ja: 'くもり', zh: '多云', es: 'Nublado' },
  Rain: { ko: '비', en: 'Rain', ja: '雨', zh: '雨', es: 'Lluvia' },
  Drizzle: { ko: '이슬비', en: 'Drizzle', ja: '霧雨', zh: '小雨', es: 'Llovizna' },
  Thunderstorm: { ko: '뇌우', en: 'Thunderstorms', ja: '雷雨', zh: '雷雨', es: 'Tormenta' },
  Snow: { ko: '눈', en: 'Snow', ja: '雪', zh: '雪', es: 'Nieve' },
  Mist: { ko: '안개', en: 'Mist', ja: '霧', zh: '雾', es: 'Niebla' },
  Fog: { ko: '안개', en: 'Fog', ja: '霧', zh: '雾', es: 'Niebla' },
  Haze: { ko: '연무', en: 'Haze', ja: 'もや', zh: '霾', es: 'Bruma' },
}

const T: Record<string, Record<string, string>> = {
  fromNotes: { ko: '당신의 기록에서', en: 'From your notes', ja: 'あなたの記録から', zh: '根据你的偏好', es: 'Según tus notas' },
  oneTap: {
    ko: '한 번 눌러주시면 내일 추천이 더 정확해져요',
    en: "One tap makes tomorrow's look more yours",
    ja: 'ワンタップで明日の提案がもっとあなたらしく',
    zh: '轻点一下，明天的推荐更懂你',
    es: 'Un toque y el look de mañana será más tuyo',
  },
  like: { ko: '좋아요', en: 'Love it', ja: '好き', zh: '喜欢', es: 'Me encanta' },
  dislike: { ko: '별로예요', en: 'Not for me', ja: '好みじゃない', zh: '不喜欢', es: 'No es para mí' },
  share: { ko: '이 룩 공유하기', en: 'Share this look', ja: 'このルックをシェア', zh: '分享这套造型', es: 'Compartir este look' },
  cta: { ko: '대시보드에서 보기', en: 'Open your atelier', ja: 'ダッシュボードを開く', zh: '打开我的主页', es: 'Abrir mi atelier' },
  unsubscribe: { ko: '구독 해지', en: 'Unsubscribe', ja: '購読解除', zh: '取消订阅', es: 'Cancelar suscripción' },
}

function t(key: string, lang: string): string {
  return T[key][lang] || T[key].en
}

const CJK = new Set(['ko', 'ja', 'zh'])

/** 넓은 자간은 라틴 대문자용 — 한중일은 글자가 흩어져 보여 좁힌다 */
function track(lang: string, px: number): string {
  return `letter-spacing:${CJK.has(lang) ? Math.min(px, 1) : px}px;`
}

/** 한국어가 음절 중간에서 줄바꿈되지 않게 */
const KEEP = 'word-break:keep-all;'

/** 라틴 문자권만 이탤릭 — 한중일 글꼴은 가짜 기울임이 되어 싸 보인다 */
function italic(lang: string): string {
  return lang === 'en' || lang === 'es' ? 'font-style:italic;' : ''
}

const EMOJI_RE = /\p{Extended_Pictographic}|\u{FE0F}|\u{200D}|\u{20E3}/gu

export function stripEmoji(s: string): string {
  return s.replace(EMOJI_RE, '')
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// 이미지 프롬프트의 아키타입은 실제 하우스를 참조한다 (내부용). 구독자에게
// 보이는 문장에는 절대 새면 안 되므로, 텍스트 모델 입력과 출력 양쪽에서 중립어로 바꾼다.
const BRAND_PATTERNS: Array<[RegExp, string]> = [
  [/\bKelly bag\b/gi, 'top-handle bag'],
  [/\bintrecciato\b/gi, 'woven'],
  [/\b(?:Herm[eè]s|Loro Piana|Auralee|Brunello Cucinelli|Cucinelli|Brunello|Bottega(?: Veneta)?|Tom Ford|Celine|C[eé]line|Zegna|Max Mara|Dior|The Row|Jil Sander|Louis Vuitton|Pharrell|Prada|Chanel|Gucci|Lemaire|Toteme|Khaite|Margiela|Loewe|Burberry|Armani|Saint Laurent|Uniqlo|Zara)(?:[- ](?:style|inspired))?\b/gi, 'atelier'],
  [/\b(?:LV|COS)\b/g, 'atelier'],
]

export function neutralizeBrands(s: string): string {
  let out = s
  for (const [re, rep] of BRAND_PATTERNS) out = out.replace(re, rep)
  return out
}

function clean(s: string): string {
  return neutralizeBrands(stripEmoji(s))
    .replace(/[*#_`]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function conditionLabel(condition: string, lang: string): string {
  return CONDITIONS[condition]?.[lang] || CONDITIONS[condition]?.en || condition
}

/** 모델 JSON을 검증·정리한다. 쓸 만한 내용이 없으면 null → 폴백 */
export function sanitizeStyleNote(raw: unknown): StyleNote | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const str = (v: unknown, max: number) => (typeof v === 'string' ? clean(v).slice(0, max) : '')
  const look = (v: unknown): LookNote => {
    const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
    const items = Array.isArray(o.items)
      ? o.items
          .filter((x): x is string => typeof x === 'string')
          .map(x => clean(x).replace(/^[-•·]\s*/, '').slice(0, 120))
          .filter(Boolean)
          .slice(0, 6)
      : []
    return { items, why: str(o.why, 400) }
  }

  const note: StyleNote = {
    subject: str(r.subject, 90),
    preheader: str(r.preheader, 140),
    greeting: str(r.greeting, 600),
    personal_note: str(r.personal_note, 300),
    dressy: look(r.dressy),
    casual: look(r.casual),
    tip: str(r.tip, 400),
  }
  if (!note.greeting && note.dressy.items.length === 0 && note.casual.items.length === 0) return null
  return note
}

/** 모델 호출이 실패했을 때: 날씨 기반 한 단락만 담은 노트 */
export function fallbackStyleNote(text: string): StyleNote {
  return {
    subject: '',
    preheader: '',
    greeting: clean(text),
    personal_note: '',
    dressy: { items: [], why: '' },
    casual: { items: [], why: '' },
    tip: '',
  }
}

const SUBJECT_FALLBACK: Record<string, (city: string, temp: number, name: string) => string> = {
  ko: (c, tp, n) => `${c} ${tp}°, 오늘의 룩 ${n}`,
  en: (c, tp, n) => `${n} for ${c} at ${tp}°`,
  ja: (c, tp, n) => `${c} ${tp}°、今日のルック ${n}`,
  zh: (c, tp, n) => `${c} ${tp}°，今日造型 ${n}`,
  es: (c, tp, n) => `${n} para ${c} a ${tp}°`,
}

/** 매일 바뀌는 제목. 모델 제목을 쓰되 기온이 빠지면 붙인다 */
export function buildSubject(note: StyleNote, lang: string, city: string, temp: number, lookName: string): string {
  const subject = clean(note.subject)
  if (subject) {
    return subject.includes(String(temp)) ? subject : `${subject} — ${temp}°`
  }
  return (SUBJECT_FALLBACK[lang] || SUBJECT_FALLBACK.en)(city, temp, lookName)
}

/** 대시보드·학습 스냅샷용 평문 (기존 recommendation_html 컬럼 형식 유지) */
export function styleNoteToPlainText(note: StyleNote, looks: Array<{ id: string; label: string; name: string }>): string {
  const blocks: string[] = []
  if (note.greeting) blocks.push(note.greeting)
  if (note.personal_note) blocks.push(note.personal_note)
  looks.forEach((look, i) => {
    const ln = look.id === 'dressy' ? note.dressy : look.id === 'casual' ? note.casual : null
    const lines = [`LOOK ${String(i + 1).padStart(2, '0')} · ${look.label} — ${look.name}`]
    if (ln) {
      lines.push(...ln.items.map(item => `- ${item}`))
      if (ln.why) lines.push(ln.why)
    }
    blocks.push(lines.join('\n'))
  })
  if (note.tip) blocks.push(note.tip)
  return blocks.join('\n\n')
}

function formatDate(now: Date, lang: string, timezone: string): string {
  const opts: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' }
  try {
    return new Intl.DateTimeFormat(LOCALES[lang] || 'en-US', { ...opts, timeZone: timezone }).format(now)
  } catch {
    return new Intl.DateTimeFormat('en-US', opts).format(now)
  }
}

function rule(): string {
  return `<tr><td style="border-top:1px solid ${COLORS.rule};font-size:0;line-height:0;">&nbsp;</td></tr>`
}

function lookBlock(look: EmailLook, index: number, ln: LookNote | null, lang: string, isLast: boolean): string {
  const no = String(index + 1).padStart(2, '0')
  const name = escapeHtml(look.name)
  const items = ln?.items.length
    ? `<tr><td align="center" style="padding:20px 24px 4px;font-family:${SANS};font-size:13px;line-height:1.8;color:${COLORS.muted};${KEEP}">
        ${ln.items.map(escapeHtml).join('<br/>')}
      </td></tr>`
    : ''
  const why = ln?.why
    ? `<tr><td align="center" style="padding:10px 28px 4px;font-family:${SERIF};${italic(lang)}font-size:16px;line-height:1.6;color:${COLORS.ink};${KEEP}">
        ${escapeHtml(ln.why)}
      </td></tr>`
    : ''
  const btn = (href: string, label: string, color: string, border: string) =>
    `<a href="${escapeHtml(href)}" style="display:inline-block;font-family:${SANS};font-size:12px;letter-spacing:1px;color:${color};text-decoration:none;border:1px solid ${border};padding:8px 16px;margin:0 3px 8px;">${escapeHtml(label)}</a>`

  return `
          <tr><td align="center" style="padding:6px 0 6px;font-family:${SANS};font-size:10px;${track(lang, 4)}color:${COLORS.gold};text-transform:uppercase;">
            LOOK ${no} &middot; ${escapeHtml(look.label)}
          </td></tr>
          <tr><td align="center" style="padding:0 16px 20px;font-family:${SERIF};font-size:30px;line-height:1.2;color:${COLORS.ink};">
            ${name}
          </td></tr>
          <tr><td align="center">
            <img src="${escapeHtml(look.url)}" width="480" alt="Look ${no} — ${name}" style="display:block;width:100%;max-width:480px;height:auto;border:1px solid ${COLORS.rule};" />
          </td></tr>
          ${items}
          ${why}
          <tr><td align="center" style="padding:22px 0 ${isLast ? '36px' : '40px'};">
            ${btn(look.likeUrl, t('like', lang), COLORS.gold, COLORS.rule)}${btn(look.dislikeUrl, t('dislike', lang), COLORS.dim, 'rgba(169,164,151,0.3)')}
            <br/>
            <a href="${escapeHtml(look.shareUrl)}" style="display:inline-block;margin-top:6px;font-family:${SANS};font-size:11px;${track(lang, 3)}text-transform:uppercase;color:${COLORS.gold};text-decoration:none;border-bottom:1px solid ${COLORS.rule};padding-bottom:3px;">${escapeHtml(t('share', lang))}</a>
          </td></tr>
          ${isLast ? '' : rule() + '<tr><td style="padding:0 0 34px;font-size:0;line-height:0;">&nbsp;</td></tr>'}`
}

export function buildDailyEmailHtml(input: DailyEmailInput): string {
  const { lang, note } = input
  const now = input.now || new Date()
  const dateline = `${escapeHtml(input.city)} &mdash; ${input.temp}&deg; &middot; ${escapeHtml(conditionLabel(input.condition, lang))}`
  const preheader = escapeHtml((note.preheader || note.tip || note.greeting).slice(0, 160))

  const personal = note.personal_note
    ? `<tr><td style="padding:0 8px 34px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="border-left:2px solid ${COLORS.gold};padding:4px 0 4px 18px;">
            <div style="font-family:${SANS};font-size:10px;${track(lang, 3)}text-transform:uppercase;color:${COLORS.gold};padding-bottom:6px;">${escapeHtml(t('fromNotes', lang))}</div>
            <div style="font-family:${SANS};font-size:14px;line-height:1.65;color:${COLORS.ink};${KEEP}">${escapeHtml(note.personal_note)}</div>
          </td>
        </tr></table>
      </td></tr>`
    : ''

  const looksHtml = input.looks.length
    ? `<tr><td align="center" style="padding:0 0 26px;font-family:${SANS};font-size:11px;color:${COLORS.dim};${KEEP}">${escapeHtml(t('oneTap', lang))}</td></tr>`
      + input.looks
          .map((look, i) => lookBlock(
            look,
            i,
            look.id === 'dressy' ? note.dressy : look.id === 'casual' ? note.casual : null,
            lang,
            i === input.looks.length - 1
          ))
          .join('')
    : ''

  const tip = note.tip
    ? `${rule()}
          <tr><td align="center" style="padding:30px 28px 10px;font-family:${SERIF};${italic(lang)}font-size:19px;line-height:1.55;color:${COLORS.ink};${KEEP}">
            &ldquo;${escapeHtml(note.tip)}&rdquo;
          </td></tr>
          <tr><td align="center" style="padding:0 0 30px;font-family:${SANS};font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${COLORS.gold};">&mdash; The Atelier</td></tr>
          ${rule()}`
    : rule()

  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;1,400&display=swap" rel="stylesheet">
<style>:root{color-scheme:dark;supported-color-schemes:dark;}body{margin:0;padding:0;}</style>
</head>
<body bgcolor="${COLORS.bg}" style="margin:0;padding:0;background-color:${COLORS.bg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${COLORS.bg};font-size:1px;line-height:1px;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${COLORS.bg}" style="background-color:${COLORS.bg};">
    <tr>
      <td align="center" style="padding:40px 16px 32px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr><td align="center" style="padding:0 0 8px;font-family:${SERIF};font-size:14px;letter-spacing:7px;color:${COLORS.gold};">ATELIER HUE</td></tr>
          <tr><td align="center" style="padding:0 0 22px;font-family:${SANS};font-size:10px;${track(lang, 3)}text-transform:uppercase;color:${COLORS.muted};">
            No. ${input.issueNo} &middot; ${escapeHtml(formatDate(now, lang, input.timezone))}
          </td></tr>
          ${rule()}
          <tr><td align="center" style="padding:26px 0 8px;font-family:${SANS};font-size:11px;${track(lang, 4)}text-transform:uppercase;color:${COLORS.gold};">${dateline}</td></tr>
          <tr><td align="center" style="padding:6px 16px 30px;font-family:${SERIF};${italic(lang)}font-size:19px;line-height:1.6;color:${COLORS.ink};${KEEP}">
            ${escapeHtml(note.greeting)}
          </td></tr>
          ${personal}
          ${looksHtml}
          ${tip}
          <tr><td align="center" style="padding:32px 0 34px;">
            <a href="https://kstylist.cc/#subscription-dashboard" style="display:inline-block;font-family:${SANS};font-size:12px;${track(lang, 3)}text-transform:uppercase;color:${COLORS.gold};text-decoration:none;border:1px solid ${COLORS.gold};padding:14px 30px;">${escapeHtml(t('cta', lang))}</a>
          </td></tr>
          <tr><td align="center" style="font-family:${SANS};font-size:11px;color:${COLORS.dim};">
            <a href="${escapeHtml(input.unsubUrl)}" style="color:${COLORS.dim};text-decoration:underline;">${escapeHtml(t('unsubscribe', lang))}</a>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
