/**
 * 에셋 참조 검증 — 코드가 가리키는 public 파일이 실제로 존재하는지 확인한다.
 * 랜딩에서 이미지가 통째로 사라졌던 회귀(service-wide.webp, hero-loop.mp4 부재)를 막는다.
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { journalPosts } from './data/journal'

const ROOT = join(__dirname, '..')
const PUBLIC = join(ROOT, 'public')

/** 런타임에 없어도 폴백이 처리하는 선택적 에셋 (생성 파이프라인 산출물) */
const OPTIONAL = new Set(['/hero-loop.mp4'])

function collectRefs(file: string): string[] {
  const src = readFileSync(join(ROOT, file), 'utf8')
  const matches = src.match(/["'`](\/[a-zA-Z0-9/_-]+\.(?:png|jpe?g|webp|avif|mp4))["'`]/g) || []
  return [...new Set(matches.map(m => m.slice(1, -1)))]
}

describe('static asset references', () => {
  it('every image referenced in App.tsx exists in public/', () => {
    const missing = collectRefs('src/App.tsx')
      .filter(ref => !OPTIONAL.has(ref))
      .filter(ref => !existsSync(join(PUBLIC, ref)))
    expect(missing).toEqual([])
  })

  it('every image referenced in index.html exists in public/', () => {
    const missing = collectRefs('index.html')
      .filter(ref => !OPTIONAL.has(ref))
      .filter(ref => !existsSync(join(PUBLIC, ref)))
    expect(missing).toEqual([])
  })

  it('every journal post image exists', () => {
    const missing = journalPosts
      .map(p => p.image)
      .filter(img => !existsSync(join(PUBLIC, img)))
    expect(missing).toEqual([])
  })

  it('the showcase set is complete (6 looks)', () => {
    const missing = ['look-01', 'look-02', 'look-03', 'look-04', 'look-05', 'look-06']
      .filter(l => !existsSync(join(PUBLIC, 'gallery/showcase', `${l}.webp`)))
    expect(missing).toEqual([])
  })
})
