/**
 * Higgsfield에서 생성한 사이트 에셋을 내려받아 규격대로 배치한다.
 * 실행: node scripts/fetch-assets.mjs
 * 필요: Node 18+ (fetch 내장), sharp(레포 devDependency), ffmpeg(360 프레임용 — 없으면 프레임만 건너뜀)
 * 끝나면: git add -A && git commit -m "Add generated assets" && git push
 */
import sharp from 'sharp'
import { execSync } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync, readdirSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

const ASSETS = {
  before: 'https://d8j0ntlcm91z4.cloudfront.net/user_3GIv65H6DuhK0liNxN44tHwauC0/hf_20260802_134020_d4378507-98e2-4224-8019-c305e4fc4414.png',
  after: 'https://d8j0ntlcm91z4.cloudfront.net/user_3GIv65H6DuhK0liNxN44tHwauC0/hf_20260802_134129_6dfc15a3-e9f1-42fa-82c2-c5744394f4e8.png',
  serviceWide: 'https://d8j0ntlcm91z4.cloudfront.net/user_3GIv65H6DuhK0liNxN44tHwauC0/hf_20260802_134257_20007be0-7b99-49df-a095-c182d07eebb5.png',
  spinVideo: 'https://d8j0ntlcm91z4.cloudfront.net/user_3GIv65H6DuhK0liNxN44tHwauC0/hf_20260802_134244_ed158898-6734-430e-8855-21416047b700.mp4',
}

async function download(url, dest) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
  console.log('downloaded', dest)
}

async function main() {
  mkdirSync('/tmp/kstylist-assets', { recursive: true })
  const tmp = (n) => join('/tmp/kstylist-assets', n)

  // 1. 히어로 before/after — 960x1200 (4:5), 같은 크롭
  await download(ASSETS.before, tmp('before.png'))
  await download(ASSETS.after, tmp('after.png'))
  await sharp(tmp('before.png')).resize(960, 1200, { fit: 'cover' }).png().toFile('public/gallery/before-female.png')
  await sharp(tmp('after.png')).resize(960, 1200, { fit: 'cover' }).png().toFile('public/gallery/after-female-date.png')
  console.log('hero before/after placed (960x1200)')

  // 2. 서비스 카드 — 1600x1000
  await download(ASSETS.serviceWide, tmp('wide.png'))
  await sharp(tmp('wide.png')).resize(1600, 1000, { fit: 'cover' }).webp({ quality: 84 }).toFile('public/gallery/service-wide.webp')
  console.log('service card placed (1600x1000)')

  // 3. 360 스핀 — 5초 영상에서 24프레임 (900x1200)
  await download(ASSETS.spinVideo, tmp('spin.mp4'))
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' })
    mkdirSync('public/spin/look-01', { recursive: true })
    mkdirSync(tmp('frames'), { recursive: true })
    execSync(
      `ffmpeg -y -i ${tmp('spin.mp4')} -vf "fps=24/5,scale=900:1200:force_original_aspect_ratio=increase,crop=900:1200" -frames:v 24 ${tmp('frames')}/f-%02d.png`,
      { stdio: 'inherit' }
    )
    const frames = readdirSync(tmp('frames')).filter(f => f.endsWith('.png')).sort()
    for (let i = 0; i < Math.min(frames.length, 24); i++) {
      const out = `public/spin/look-01/frame-${String(i).padStart(2, '0')}.webp`
      await sharp(join(tmp('frames'), frames[i])).webp({ quality: 80 }).toFile(out)
    }
    console.log(`spin frames placed: ${Math.min(frames.length, 24)} → public/spin/look-01/`)
  } catch {
    console.warn('ffmpeg가 없어 360 프레임은 건너뜀 — brew install ffmpeg (mac) 후 다시 실행하면 됩니다')
  }

  // 임시파일 정리
  for (const f of readdirSync('/tmp/kstylist-assets')) {
    const p = join('/tmp/kstylist-assets', f)
    if (!existsSync(p) || f === 'frames') continue
    try { unlinkSync(p) } catch { /* ignore */ }
  }

  console.log('\\n완료! 이제 실행하세요:')
  console.log('  git add -A && git commit -m "Add generated hero/service/spin assets" && git push')
}

main().catch(e => { console.error(e); process.exit(1) })
