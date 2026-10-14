/**
 * 오늘의 룩 공유 — 생성·조회·페이지 렌더.
 *
 * 흐름: 이메일/대시보드의 "공유" → look_shares 행 생성(룩 단위 명시적 동의)
 *      → /look/{id} 공개 페이지 (링크를 가진 사람만, noindex)
 *      → 소유자는 같은 페이지에서 1080×1350 카드 저장·공유·공유 중지.
 * 이미지는 /api/share-look?img={id} 로 같은 출처에서 스트리밍한다 —
 * r2.dev를 직접 그리면 캔버스가 오염(tainted)되어 카드 저장이 막힌다.
 */
import { escapeHtml, conditionLabel } from './daily-email'

export const R2_DAILY_PUBLIC_BASE = 'https://pub-80118c62e29d4373b70d5e0fe9503ff0.r2.dev/'
const SITE = 'https://kstylist.cc'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface LookShareEnv {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}

export interface LookShare {
  id: string
  email: string
  sent_date: string
  scenario_id: string
  look_name: string | null
  image_key: string
  city: string | null
  temperature_c: number | null
  weather_condition: string | null
  lang: string | null
  view_count: number
  revoked_at: string | null
}

function sb(env: LookShareEnv, extra: Record<string, string> = {}) {
  return {
    'apikey': env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

export function isShareId(id: string): boolean {
  return UUID_RE.test(id)
}

/**
 * 공유 행을 만들거나(이미 있으면 재사용·재활성화) id를 돌려준다.
 * 그날 그 룩의 이미지가 없으면 null.
 */
export async function ensureLookShare(
  env: LookShareEnv,
  email: string,
  sentDate: string,
  scenarioId: string
): Promise<string | null> {
  const subRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(email)}&select=id,city,preferred_language`,
    { headers: sb(env) }
  )
  const subs = subRes.ok ? await subRes.json() as Array<{ id: string; city: string | null; preferred_language: string | null }> : []
  if (subs.length === 0) return null

  // 같은 이메일의 중복 구독 행이 있을 수 있어 전부에서 찾는다
  const ids = subs.map(s => s.id).join(',')
  const recRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/daily_recommendations?subscriber_id=in.(${ids})&sent_date=eq.${sentDate}&select=subscriber_id,outfit_images,temperature_c,weather_condition&order=created_at.desc&limit=1`,
    { headers: sb(env) }
  )
  const recs = recRes.ok ? await recRes.json() as Array<{
    subscriber_id: string
    outfit_images: Array<{ id: string; label?: string; name?: string; url: string }> | null
    temperature_c: number | null
    weather_condition: string | null
  }> : []
  const rec = recs[0]
  const img = rec?.outfit_images?.find(i => i.id === scenarioId)
  if (!rec || !img?.url?.startsWith(R2_DAILY_PUBLIC_BASE)) return null

  const sub = subs.find(s => s.id === rec.subscriber_id) || subs[0]
  const upRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/look_shares?on_conflict=email,sent_date,scenario_id`,
    {
      method: 'POST',
      headers: sb(env, { 'Prefer': 'resolution=merge-duplicates,return=representation' }),
      body: JSON.stringify({
        email,
        sent_date: sentDate,
        scenario_id: scenarioId,
        look_name: img.name || img.label || null,
        image_key: img.url.slice(R2_DAILY_PUBLIC_BASE.length),
        city: sub.city,
        temperature_c: rec.temperature_c,
        weather_condition: rec.weather_condition,
        lang: sub.preferred_language || 'en',
        revoked_at: null,
      }),
    }
  )
  if (!upRes.ok) {
    console.error('[look-share] upsert failed:', upRes.status, await upRes.text())
    return null
  }
  const rows = await upRes.json() as Array<{ id: string }>
  return rows[0]?.id || null
}

export async function getLookShare(env: LookShareEnv, id: string): Promise<LookShare | null> {
  if (!isShareId(id)) return null
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/look_shares?id=eq.${id}&select=*&limit=1`,
    { headers: sb(env) }
  )
  if (!res.ok) return null
  const rows = await res.json() as LookShare[]
  return rows[0] || null
}

export async function revokeLookShare(env: LookShareEnv, id: string): Promise<boolean> {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/look_shares?id=eq.${id}`,
    {
      method: 'PATCH',
      headers: sb(env, { 'Prefer': 'return=minimal' }),
      body: JSON.stringify({ revoked_at: new Date().toISOString() }),
    }
  )
  return res.ok
}

export async function countLookShareView(env: LookShareEnv, id: string): Promise<void> {
  try {
    await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/increment_look_share_view`, {
      method: 'POST',
      headers: sb(env),
      body: JSON.stringify({ p_id: id }),
    })
  } catch { /* 조회수는 부가 정보 */ }
}

// ─── Page ────────────────────────────────────────────────────────

const COPY: Record<string, Record<string, string>> = {
  en: {
    kicker: "Today's look",
    desc: 'Styled for {city}, {temp}° by ATELIER HUE — a personal stylist that dresses you for the weather every morning.',
    pitch: 'Every morning at 7, a look for the day\'s weather — shown on you, in your own photo.',
    cta: 'See yourself styled',
    hint: 'Anyone with this link can see this page. You can stop sharing at any time.',
    save: 'Save card', share: 'Share', copy: 'Copy link', copied: 'Link copied',
    stop: 'Stop sharing', stopConfirm: 'Stop sharing this look? The link will stop working.',
    stopped: 'Sharing stopped. This link no longer works.', back: 'Back to my atelier',
    gone: 'This look is no longer shared', failed: 'Something went wrong. Please try again.',
  },
  ko: {
    kicker: '오늘의 룩',
    desc: '{city} {temp}°에 맞춰 ATELIER HUE가 골라준 룩 — 매일 아침 날씨에 맞춰 나를 스타일링해주는 퍼스널 스타일리스트.',
    pitch: '매일 아침 7시, 그날 날씨에 맞춘 룩을 내 사진으로 받아보세요.',
    cta: '나도 스타일링 받아보기',
    hint: '링크가 있는 사람은 누구나 이 페이지를 볼 수 있어요. 언제든 공유를 중지할 수 있습니다.',
    save: '카드 저장', share: '공유', copy: '링크 복사', copied: '링크를 복사했어요',
    stop: '공유 중지', stopConfirm: '이 룩의 공유를 중지할까요? 링크가 더 이상 열리지 않습니다.',
    stopped: '공유를 중지했어요. 이 링크는 더 이상 열리지 않습니다.', back: '내 대시보드로',
    gone: '더 이상 공유되지 않는 룩입니다', failed: '문제가 생겼어요. 다시 시도해주세요.',
  },
  ja: {
    kicker: '今日のルック',
    desc: '{city} {temp}°に合わせてATELIER HUEが選んだルック — 毎朝、天気に合わせてあなたをスタイリングするパーソナルスタイリスト。',
    pitch: '毎朝7時、その日の天気に合わせたルックを、あなた自身の写真で。',
    cta: '自分も試してみる',
    hint: 'このリンクを知っている人は誰でもこのページを見られます。いつでも共有を停止できます。',
    save: 'カードを保存', share: 'シェア', copy: 'リンクをコピー', copied: 'コピーしました',
    stop: '共有を停止', stopConfirm: 'このルックの共有を停止しますか？リンクは開けなくなります。',
    stopped: '共有を停止しました。このリンクは開けなくなりました。', back: 'ダッシュボードへ',
    gone: 'このルックは共有されていません', failed: 'エラーが発生しました。もう一度お試しください。',
  },
  zh: {
    kicker: '今日造型',
    desc: 'ATELIER HUE 为 {city} {temp}° 搭配的造型 — 每天早上根据天气为你造型的私人造型师。',
    pitch: '每天早上7点，用你自己的照片，收到适合当天天气的造型。',
    cta: '让我也试试',
    hint: '任何拥有此链接的人都可以查看此页面，你可以随时停止分享。',
    save: '保存卡片', share: '分享', copy: '复制链接', copied: '已复制链接',
    stop: '停止分享', stopConfirm: '停止分享这套造型？链接将无法打开。',
    stopped: '已停止分享，此链接已失效。', back: '返回我的主页',
    gone: '该造型已不再分享', failed: '出了点问题，请重试。',
  },
  es: {
    kicker: 'El look de hoy',
    desc: 'Look de ATELIER HUE para {city} a {temp}° — un estilista personal que te viste según el clima cada mañana.',
    pitch: 'Cada mañana a las 7, un look para el clima del día, en tu propia foto.',
    cta: 'Pruébalo contigo',
    hint: 'Cualquiera con este enlace puede ver esta página. Puedes dejar de compartir cuando quieras.',
    save: 'Guardar tarjeta', share: 'Compartir', copy: 'Copiar enlace', copied: 'Enlace copiado',
    stop: 'Dejar de compartir', stopConfirm: '¿Dejar de compartir este look? El enlace dejará de funcionar.',
    stopped: 'Has dejado de compartir. Este enlace ya no funciona.', back: 'Volver a mi atelier',
    gone: 'Este look ya no se comparte', failed: 'Algo salió mal. Inténtalo de nuevo.',
  },
}

const LOCALES: Record<string, string> = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN', es: 'es-ES' }
const LANDING = `${SITE}/?utm_source=look_share&utm_medium=social&utm_campaign=daily_look`

function copyFor(lang: string | null | undefined): Record<string, string> {
  return COPY[lang || 'en'] || COPY.en
}

function formatShareDate(sentDate: string, lang: string): string {
  try {
    return new Intl.DateTimeFormat(LOCALES[lang] || 'en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })
      .format(new Date(`${sentDate}T00:00:00Z`))
  } catch {
    return sentDate
  }
}

const STYLE = `
:root{--bg:#101018;--ink:#F5F2E9;--muted:#A9A497;--dim:#77736A;--gold:#C9A962;--rule:rgba(201,169,98,.35)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:560px;margin:0 auto;padding:40px 16px 56px;text-align:center}
.mast{font-family:'Playfair Display',Georgia,serif;letter-spacing:.5em;padding-left:.5em;color:var(--gold);font-size:14px;margin:0 0 30px;text-decoration:none;display:inline-block}
.kicker{font-size:11px;letter-spacing:.32em;text-transform:uppercase;color:var(--gold);margin:0 0 12px}
h1{font-family:'Playfair Display',Georgia,serif;font-weight:500;font-size:clamp(30px,8vw,42px);line-height:1.15;margin:0 0 26px;word-break:keep-all}
.plate{margin:0;border:1px solid var(--rule);background:#17171f}
.plate img{display:block;width:100%;height:auto}
.meta{font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--muted);margin:18px 0 36px}
.hint,.pitch{color:var(--muted);font-size:14px;line-height:1.65;margin:0 auto 22px;max-width:420px;word-break:keep-all}
.row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:46px;border:1px solid var(--gold);color:var(--gold);background:transparent;font:inherit;font-size:12px;letter-spacing:.2em;text-transform:uppercase;padding:0 24px;text-decoration:none;cursor:pointer}
.btn.solid{background:var(--gold);color:#14120c}
.btn:disabled{opacity:.5;cursor:default}
.quiet{background:none;border:0;color:var(--dim);font:inherit;font-size:12px;text-decoration:underline;margin-top:20px;min-height:44px;cursor:pointer}
.back{display:inline-block;color:var(--muted);font-size:12px;margin-top:6px;min-height:44px;line-height:44px}
.status{min-height:20px;font-size:12px;color:var(--gold);margin:12px 0 0}
.btn:focus-visible,.quiet:focus-visible,.back:focus-visible,.mast:focus-visible{outline:2px solid var(--gold);outline-offset:3px}
footer{margin-top:46px;font-size:10px;letter-spacing:.3em;color:var(--dim)}
[hidden]{display:none!important}
`

function shell(lang: string, head: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#101018">
${head}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500&display=swap" rel="stylesheet">
<style>${STYLE}</style>
</head>
<body>
<main class="wrap">
<a class="mast" href="${SITE}">ATELIER HUE</a>
${body}
<footer>KSTYLIST.CC</footer>
</main>
</body>
</html>`
}

/** 공유가 내려갔거나 없는 링크 */
export function renderLookGonePage(lang: string | null | undefined): string {
  const c = copyFor(lang)
  const l = COPY[lang || ''] ? (lang as string) : 'en'
  return shell(l, `<title>ATELIER HUE</title>`, `
<h1>${escapeHtml(c.gone)}</h1>
<p class="pitch">${escapeHtml(c.pitch)}</p>
<a class="btn solid" href="${LANDING}">${escapeHtml(c.cta)}</a>`)
}

export function renderLookPage(share: LookShare): string {
  const lang = COPY[share.lang || ''] ? (share.lang as string) : 'en'
  const c = copyFor(lang)
  const name = share.look_name || c.kicker
  const date = formatShareDate(share.sent_date, lang)
  const temp = share.temperature_c ?? ''
  const city = share.city || ''
  const cond = share.weather_condition ? conditionLabel(share.weather_condition, lang) : ''
  const metaLine = [city && `${city}${temp !== '' ? ` — ${temp}°` : ''}`, cond].filter(Boolean).join(' · ')
  const pageUrl = `${SITE}/look/${share.id}`
  const imgUrl = `${SITE}/api/share-look?img=${share.id}`
  const desc = c.desc.replace('{city}', city).replace('{temp}', String(temp))
  const title = `${c.kicker} — ${name}`

  // 카드 캔버스와 소유자 UI가 쓰는 데이터 — </script> 탈출 방지
  const data = JSON.stringify({
    id: share.id, url: pageUrl, img: imgUrl, name, kicker: c.kicker, date, meta: metaLine,
    file: `atelier-hue-${share.sent_date}-${share.scenario_id}.jpg`,
    t: { copied: c.copied, stopConfirm: c.stopConfirm, stopped: c.stopped, failed: c.failed },
  }).replace(/</g, '\\u003c')

  const head = `<title>${escapeHtml(title)} | ATELIER HUE</title>
<meta name="description" content="${escapeHtml(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="ATELIER HUE">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:image" content="${imgUrl}">
<meta property="og:url" content="${pageUrl}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(desc)}">
<meta name="twitter:image" content="${imgUrl}">`

  const body = `
<p class="kicker">${escapeHtml(c.kicker)} &middot; ${escapeHtml(date)}</p>
<h1>${escapeHtml(name)}</h1>
<figure class="plate"><img src="${imgUrl}" alt="${escapeHtml(title)}" width="900" height="1200"></figure>
<p class="meta">${escapeHtml(metaLine)}</p>

<section class="owner" id="owner" hidden>
  <p class="hint">${escapeHtml(c.hint)}</p>
  <div class="row">
    <button class="btn solid" id="save" type="button">${escapeHtml(c.save)}</button>
    <button class="btn" id="share" type="button">${escapeHtml(c.share)}</button>
    <button class="btn" id="copy" type="button">${escapeHtml(c.copy)}</button>
  </div>
  <p class="status" id="status" role="status" aria-live="polite"></p>
  <button class="quiet" id="stop" type="button">${escapeHtml(c.stop)}</button><br>
  <a class="back" href="${SITE}/#subscription-dashboard">${escapeHtml(c.back)}</a>
</section>

<section class="cta" id="visitor">
  <p class="pitch">${escapeHtml(c.pitch)}</p>
  <a class="btn solid" href="${LANDING}">${escapeHtml(c.cta)}</a>
</section>

<script type="application/json" id="look-data">${data}</script>
<script>${OWNER_SCRIPT}</script>`

  return shell(lang, head, body)
}

/**
 * 소유자 서명(o)은 URL에서 지우고 이 기기에만 보관한다 — 주소창을 그대로
 * 복사해 보내도 받은 사람이 공유를 내릴 수 없게.
 */
const OWNER_SCRIPT = `
(function(){
  var D = JSON.parse(document.getElementById('look-data').textContent);
  var KEY = 'look_owner_' + D.id;
  var sig = null;
  try {
    var q = new URLSearchParams(location.search).get('o');
    if (q) { localStorage.setItem(KEY, q); history.replaceState(null, '', location.pathname); }
    sig = localStorage.getItem(KEY);
  } catch (e) {
    sig = new URLSearchParams(location.search).get('o');
  }
  if (!sig) return;
  document.getElementById('owner').hidden = false;
  document.getElementById('visitor').hidden = true;

  var status = document.getElementById('status');
  function say(t){ status.textContent = t; }

  function loadImage(src){
    return new Promise(function(res, rej){
      var im = new Image(); im.onload = function(){ res(im); }; im.onerror = rej; im.src = src;
    });
  }
  function spaced(ctx, px){ if ('letterSpacing' in ctx) ctx.letterSpacing = px + 'px'; }

  var cardPromise = null;
  function buildCard(){
    if (cardPromise) return cardPromise;
    cardPromise = Promise.all([loadImage(D.img), document.fonts ? document.fonts.ready : null]).then(function(r){
      var im = r[0], W = 1080, H = 1350;
      var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      var ctx = cv.getContext('2d');
      ctx.fillStyle = '#101018'; ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';

      ctx.fillStyle = '#C9A962'; ctx.font = '500 30px "Playfair Display", Georgia, serif'; spaced(ctx, 14);
      ctx.fillText('ATELIER HUE', W / 2 + 7, 88);

      var px = 110, py = 130, pw = 860, ph = 940;
      var scale = Math.max(pw / im.width, ph / im.height);
      var sw = pw / scale, sh = ph / scale;
      var sx = (im.width - sw) / 2, sy = (im.height - sh) * 0.2;
      ctx.drawImage(im, sx, sy, sw, sh, px, py, pw, ph);
      ctx.strokeStyle = 'rgba(201,169,98,0.5)'; ctx.lineWidth = 2; ctx.strokeRect(px, py, pw, ph);

      spaced(ctx, 7); ctx.fillStyle = '#C9A962'; ctx.font = '500 22px -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';
      ctx.fillText((D.kicker + '  \\u00B7  ' + D.date).toUpperCase(), W / 2, 1136);

      spaced(ctx, 0); ctx.fillStyle = '#F5F2E9';
      var size = 66; ctx.font = '500 ' + size + 'px "Playfair Display", Georgia, serif';
      while (ctx.measureText(D.name).width > 940 && size > 34) { size -= 2; ctx.font = '500 ' + size + 'px "Playfair Display", Georgia, serif'; }
      ctx.fillText(D.name, W / 2, 1212);

      spaced(ctx, 6); ctx.fillStyle = '#A9A497'; ctx.font = '400 22px -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';
      ctx.fillText(D.meta.toUpperCase(), W / 2, 1262);
      ctx.fillStyle = '#77736A'; ctx.font = '400 18px -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';
      ctx.fillText('KSTYLIST.CC', W / 2, 1312);

      return new Promise(function(res, rej){
        cv.toBlob(function(b){ b ? res(b) : rej(new Error('blob')); }, 'image/jpeg', 0.92);
      });
    });
    cardPromise.catch(function(){ cardPromise = null; });
    return cardPromise;
  }

  function download(blob){
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = D.file;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 4000);
  }

  function copyLink(){
    if (navigator.clipboard) {
      return navigator.clipboard.writeText(D.url).then(function(){ say(D.t.copied); });
    }
    window.prompt('', D.url);
    return Promise.resolve();
  }

  document.getElementById('save').onclick = function(){
    var btn = this; btn.disabled = true;
    buildCard().then(download).catch(function(){ say(D.t.failed); }).then(function(){ btn.disabled = false; });
  };

  document.getElementById('share').onclick = function(){
    var btn = this; btn.disabled = true;
    buildCard().then(function(blob){
      var file = new File([blob], D.file, { type: 'image/jpeg' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: D.name, url: D.url });
      }
      if (navigator.share) return navigator.share({ title: D.name, url: D.url });
      return copyLink();
    }).catch(function(e){ if (!e || e.name !== 'AbortError') copyLink(); })
      .then(function(){ btn.disabled = false; });
  };

  document.getElementById('copy').onclick = function(){ copyLink().catch(function(){ say(D.t.failed); }); };

  document.getElementById('stop').onclick = function(){
    if (!window.confirm(D.t.stopConfirm)) return;
    fetch('/api/share-look?id=' + encodeURIComponent(D.id) + '&o=' + encodeURIComponent(sig), { method: 'DELETE' })
      .then(function(r){
        if (!r.ok) throw new Error('revoke');
        try { localStorage.removeItem(KEY); } catch (e) {}
        document.querySelector('.plate').remove();
        document.getElementById('owner').innerHTML = '<p class="hint"></p>';
        document.querySelector('#owner .hint').textContent = D.t.stopped;
      })
      .catch(function(){ say(D.t.failed); });
  };
})();
`
