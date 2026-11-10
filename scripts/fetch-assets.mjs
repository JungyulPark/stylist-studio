/**
 * Higgsfield에서 생성한 사이트 모델 이미지를 내려받아 규격대로 배치한다.
 * 실행: node scripts/fetch-assets.mjs
 * 필요: Node 18+ (fetch 내장), sharp(레포 devDependency), ffmpeg(선택 — 있으면 히어로 필름을 웹용으로 압축)
 * 끝나면: git add -A && git commit -m "New brand models" && git push
 */
import sharp from 'sharp'
import { execSync } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync, rmSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_3GIv65H6DuhK0liNxN44tHwauC0'

// 브랜드 모델 (2026-11 사장님 픽): 여자 = 후보 3번, 남자 = 후보 4번.
// 모든 컷은 두 사람의 레퍼런스에서 얼굴을 고정한 편집(nano-banana)이라
// 쇼케이스의 "같은 얼굴, 스타일만 바뀐다"가 실제로 성립한다.
const HERO = {
  // before는 after에서 옷만 바꾼 컷 — 슬라이더가 겹쳐 보이려면 포즈·구도가 같아야 한다
  before: `${CDN}/hf_20261103_063756_ca1ad4ee-5cf3-43bc-96c1-8fd40059781d.png`,
  after: `${CDN}/hf_20261103_063649_30b69033-8a16-4a78-9159-26a1b892b632.png`,
}

// 히어로 패션 필름 — 각 모델의 정면 컷을 첫·끝 프레임으로 쓴 5초 루프 (Kling 3.0 pro, 무음).
// 사이트는 존재하는 필름을 여자 → 남자 순으로 번갈아 재생한다.
const HERO_FILMS = [
  { src: `${CDN}/hf_20261103_064229_05c6f40e-9796-4635-b9f7-38304d2f22aa.mp4`, out: 'public/hero-loop.mp4' },
  { src: `${CDN}/hf_20261109_072729_59c9bed2-5335-4881-86dc-b6d0505bdf7c.mp4`, out: 'public/hero-loop-m.mp4' },
]

// 랜딩 쇼케이스 순서 = 캡션 순서 (Luxury, Business, Best Match, Casual, Date, Evening)
const SHOWCASE = [
  `${CDN}/hf_20261103_063649_4800e731-fa1f-475d-9a6a-dc1a6c8a1743.png`, // F luxury
  `${CDN}/hf_20261103_063649_a6a565bb-29e6-4ff4-85bb-ea14e1e2e64f.png`, // M business
  `${CDN}/hf_20261103_063648_1625ea50-e552-417c-a0ba-ac80000adfd5.png`, // F best match
  `${CDN}/hf_20261103_063648_baaf454e-992d-4731-b7ae-121acc6df22c.png`, // M casual
  `${CDN}/hf_20261103_063647_a20c0fe5-59c0-4200-842e-7910836160ea.png`, // F date
  `${CDN}/hf_20261103_063648_10f8ec87-b18b-4801-a110-6745f436e267.png`, // M evening
]

// 주간 트렌드 에디트 — 에디션 slug별 [여자 컷, 남자 컷]. functions/lib/edit-data.ts의 slug와 같아야 한다.
const EDIT = {
  'quiet-but-seen': ['hf_20261109_232552_8dab927e-3216-43f5-9767-ea0db18d8917', 'hf_20261109_232551_7f24f2fc-0203-42b0-a9d0-cec14e804413'],
  'the-texture-season': ['hf_20261109_232551_fdd6dd19-3222-4628-aa82-5902d7f1ce34', 'hf_20261109_232712_1b09923a-a4bd-482f-beb1-f77c3187f31a'],
  'plum-and-berry': ['hf_20261109_232552_f716fedf-33e0-492a-a954-49551b7999f9', 'hf_20261109_232552_b43b4be6-0300-4ca2-a98f-477f92355cb2'],
  'the-scarf-leads': ['hf_20261109_232713_1671a8d3-c713-400d-99e2-45f68d65abb7', 'hf_20261109_232551_1f79b0f9-d50f-415b-a2ec-612f120522c6'],
  'checks-calmly': ['hf_20261109_232713_d91b340e-b048-410e-bd8f-3ce470ca8d7f', 'hf_20261109_232713_8de48d2b-00ba-4d13-ac42-11f7a5c033df'],
  'the-long-coat-returns': ['hf_20261109_232713_1dfe88ed-11a1-4411-996d-6f6b30d5f0a5', 'hf_20261109_232857_69fc79e5-d7d7-4324-b482-3b135445f104'],
  'the-suit-softened': ['hf_20261109_232856_ebe640b6-8220-45b4-b891-f2de96a5b66d', 'hf_20261109_232856_0dd9cabb-fb0e-4950-9124-a19818f304a5'],
  'knit-over-knit': ['hf_20261109_232857_b9bee439-5748-411e-9233-26c4413952b1', 'hf_20261109_232857_b6c4a798-27c0-4b7d-985c-1677bec98bec'],
}

async function download(url, dest) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
  console.log('downloaded', dest)
}

async function main() {
  const dir = join(tmpdir(), 'kstylist-assets')
  mkdirSync(dir, { recursive: true })
  const tmp = (n) => join(dir, n)

  // 1. 히어로 before/after — 960x1200 (4:5), 같은 크롭
  await download(HERO.before, tmp('before.png'))
  await download(HERO.after, tmp('after.png'))
  await sharp(tmp('before.png')).resize(960, 1200, { fit: 'cover', position: 'top' }).webp({ quality: 86 }).toFile('public/gallery/before-female.webp')
  await sharp(tmp('after.png')).resize(960, 1200, { fit: 'cover', position: 'top' }).webp({ quality: 86 }).toFile('public/gallery/after-female-date.webp')
  console.log('hero before/after placed (960x1200)')

  // 2. 서비스 카드 — 1600x1000, 얼굴이 잘리지 않게 위쪽 기준
  await sharp(tmp('after.png')).resize(1600, 1000, { fit: 'cover', position: 'attention' }).webp({ quality: 84 }).toFile('public/gallery/service-wide.webp')
  console.log('service card placed (1600x1000)')

  // 3. 쇼케이스 6컷 — 800x1000 webp
  for (let i = 0; i < SHOWCASE.length; i++) {
    const src = tmp(`look-${i + 1}.png`)
    await download(SHOWCASE[i], src)
    await sharp(src).resize(800, 1000, { fit: 'cover', position: 'top' }).webp({ quality: 82 })
      .toFile(`public/gallery/showcase/look-0${i + 1}.webp`)
  }
  console.log('showcase placed (6 × 800x1000)')

  // 3b. 트렌드 에디트 — 에디션당 2컷, 800x1000 webp
  mkdirSync('public/gallery/edit', { recursive: true })
  for (const [slug, [her, him]] of Object.entries(EDIT)) {
    for (const [who, id] of [['her', her], ['him', him]]) {
      const src = tmp(`edit-${slug}-${who}.png`)
      await download(`${CDN}/${id}.png`, src)
      await sharp(src).resize(800, 1000, { fit: 'cover', position: 'top' }).webp({ quality: 82 })
        .toFile(`public/gallery/edit/${slug}-${who}.webp`)
    }
  }
  console.log(`edit images placed (${Object.keys(EDIT).length * 2} × 800x1000)`)

  // 4. 히어로 패션 필름 — 3:4 카드에 맞춰 720x960, 무음, 빠른 시작
  let hasFfmpeg = true
  try { execSync('ffmpeg -version', { stdio: 'ignore' }) } catch { hasFfmpeg = false }
  for (const [i, film] of HERO_FILMS.entries()) {
    const raw = tmp(`film-${i}.mp4`)
    await download(film.src, raw)
    if (hasFfmpeg) {
      execSync(
        `ffmpeg -y -i "${raw}" -an -vf "scale=720:960:force_original_aspect_ratio=increase,crop=720:960" -c:v libx264 -crf 24 -preset slow -pix_fmt yuv420p -movflags +faststart ${film.out}`,
        { stdio: 'inherit' }
      )
      console.log(`hero film placed: ${film.out} (720x960, compressed)`)
    } else {
      copyFileSync(raw, film.out)
      console.log(`hero film placed: ${film.out} (원본 그대로 — ffmpeg가 있으면 더 가볍게 압축됩니다)`)
    }
  }

  // 5. 예전 모델의 360 프레임은 새 모델과 얼굴이 달라 내린다 (없으면 360 뷰어는 숨는다)
  for (const old of ['public/spin/look-01']) {
    if (existsSync(old)) {
      rmSync(old, { recursive: true, force: true })
      console.log('removed old-model asset', old)
    }
  }

  rmSync(dir, { recursive: true, force: true })
  console.log('\n완료! 이제 실행하세요:')
  console.log('  git add -A && git commit -m "New brand models" && git push')
}

main().catch(e => { console.error(e); process.exit(1) })
