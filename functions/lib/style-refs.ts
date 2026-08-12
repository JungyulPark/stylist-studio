/**
 * 시즌 컬렉션 — 스타일 레퍼런스 이미지 시스템.
 *
 * R2의 style-refs/{tier}/ 에 있는 실제 옷 사진이 곧 그 시즌의 컬렉션이다.
 * 생성 시 사람 사진과 함께 레퍼런스 이미지를 모델에 넣어 "그 옷"을 입힌다.
 * 폴더가 비어 있으면 null을 반환하고 기존 텍스트 프롬프트 방식으로 동작한다.
 *
 * 시즌 교체 = R2 폴더의 사진 교체 (코드 수정 불필요).
 * tier: 'premium' (콰이어트 럭셔리) | 'casual' (컨템포러리 에센셜)
 */

export type StyleTier = 'premium' | 'casual'

export interface StyleRef {
  base64: string
  mimeType: string
  key: string
}

const MAX_REF_BYTES = 4 * 1024 * 1024

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export async function listStyleRefKeys(bucket: R2Bucket, tier: StyleTier): Promise<string[]> {
  try {
    const listed = await bucket.list({ prefix: `style-refs/${tier}/`, limit: 100 })
    return listed.objects
      .map(o => o.key)
      .filter(k => /\.(jpe?g|png|webp)$/i.test(k))
      .sort()
  } catch (e) {
    console.warn('[style-refs] list failed (non-blocking):', e)
    return []
  }
}

/**
 * tier의 레퍼런스 중 하나를 seed 기반으로 결정적으로 선택해 로드한다.
 * seed에 날짜 인덱스를 쓰면 매일 다른 룩으로 회전한다.
 */
export async function getStyleRef(bucket: R2Bucket, tier: StyleTier, seed: number): Promise<StyleRef | null> {
  const keys = await listStyleRefKeys(bucket, tier)
  if (keys.length === 0) return null

  const key = keys[((seed % keys.length) + keys.length) % keys.length]
  try {
    const obj = await bucket.get(key)
    if (!obj) return null
    const buf = new Uint8Array(await obj.arrayBuffer())
    if (buf.length > MAX_REF_BYTES) {
      console.warn(`[style-refs] ${key} too large (${buf.length}B) — skipping`)
      return null
    }
    const ext = key.split('.').pop()?.toLowerCase()
    const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
    return { base64: bytesToBase64(buf), mimeType, key }
  } catch (e) {
    console.warn(`[style-refs] get ${key} failed (non-blocking):`, e)
    return null
  }
}

/** 레퍼런스 사용 시 프롬프트에 덧붙이는 지시문 */
export const STYLE_REF_DIRECTIVE = `

OUTFIT REFERENCE IMAGE (the LAST input image): it shows the exact garments and styling to dress the person in.
- Recreate that outfit — same garment types, colors, materials, and silhouette — fitted naturally to THIS person's body
- Adapt sizing to their proportions; do NOT copy the reference person's body, face, pose, or background
- The FIRST image is the person to dress; every identity/framing rule above still applies to them
- Ignore any logos in the reference; render the garments logo-free`
