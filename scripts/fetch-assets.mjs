/**
 * Higgsfield에서 생성한 사이트 모델 이미지를 내려받아 규격대로 배치한다.
 * 실행: node scripts/fetch-assets.mjs
 * 필요: Node 18+ (fetch 내장), sharp(레포 devDependency)
 * 끝나면: git add -A && git commit -m "New brand models" && git push
 */
import sharp from 'sharp'
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs'
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

// 랜딩 쇼케이스 순서 = 캡션 순서 (Luxury, Business, Best Match, Casual, Date, Evening)
const SHOWCASE = [
  `${CDN}/hf_20261103_063649_4800e731-fa1f-475d-9a6a-dc1a6c8a1743.png`, // F luxury
  `${CDN}/hf_20261103_063649_a6a565bb-29e6-4ff4-85bb-ea14e1e2e64f.png`, // M business
  `${CDN}/hf_20261103_063648_1625ea50-e552-417c-a0ba-ac80000adfd5.png`, // F best match
  `${CDN}/hf_20261103_063648_baaf454e-992d-4731-b7ae-121acc6df22c.png`, // M casual
  `${CDN}/hf_20261103_063647_a20c0fe5-59c0-4200-842e-7910836160ea.png`, // F date
  `${CDN}/hf_20261103_063648_10f8ec87-b18b-4801-a110-6745f436e267.png`, // M evening
]

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
  await sharp(tmp('before.png')).resize(960, 1200, { fit: 'cover', position: 'top' }).png({ compressionLevel: 9 }).toFile('public/gallery/before-female.png')
  await sharp(tmp('after.png')).resize(960, 1200, { fit: 'cover', position: 'top' }).png({ compressionLevel: 9 }).toFile('public/gallery/after-female-date.png')
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

  // 4. 예전 모델의 히어로 영상·360 프레임은 새 모델과 얼굴이 달라 내린다
  //    (없으면 사이트는 비포/애프터 슬라이더를 보여주고, 360 뷰어는 숨는다)
  for (const old of ['public/hero-loop.mp4', 'public/spin/look-01']) {
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
