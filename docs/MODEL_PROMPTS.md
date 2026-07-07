# 모델 이미지 프롬프트 팩 (MODEL_PROMPTS)

> 용도: 사장님이 AI 이미지/영상 툴로 사이트용 모델 이미지를 직접 생성할 때 쓰는 사양서.
> 아래 프롬프트는 그대로 복사해서 쓰고, `[...]` 부분만 바꾸면 됩니다.
> 생성 후 파일명·경로·사이즈만 맞춰서 넣으면 코드는 수정 없이 바로 반영됩니다.

---

## 0. 공통 규칙 (모든 슬롯)

- **비율/사이즈 고정**: 각 슬롯의 픽셀 크기를 정확히 지킬 것 (object-fit: cover라 비율이 다르면 잘림).
- **포맷**: 사진류는 WebP(품질 82) 권장. `npm run optimize-images` 스크립트 활용 가능.
- **분위기 앵커** (Platinum Editorial + 다크 시네마 히어로와 조화):
  - 라이트 섹션용: warm cream seamless studio backdrop (#FAFAF8), soft diffused daylight
  - 히어로/다크용: deep charcoal studio (#101018), single warm key light, gold rim light
- **금지**: 브랜드 로고·모노그램·시그니처 패턴(프라다 삼각 로고, 에르메스 패턴 등) 절대 노출 금지. 얼굴이 실존 인물과 닮지 않게.

**공통 베이스 프롬프트 (앞에 붙이기):**
```
Full-body editorial fashion photograph of a [Korean male / Korean female] model
in their late 20s, natural confident pose, photorealistic, shot on medium format,
85mm look, soft diffused lighting, luxury magazine quality, no logos, no text.
```

---

## 1. 히어로 Before/After 슬라이더

| 항목 | 값 |
|---|---|
| 경로 | `public/gallery/before-female.png` → 교체 시 동일 파일명 (또는 App.tsx 5xxx의 src 변경) |
| 사이즈 | **960 × 1200 (4:5 세로)** — before/after 둘 다 동일 |
| 핵심 | **같은 인물·같은 포즈·같은 프레이밍**이어야 슬라이더가 성립. before를 먼저 만들고, 그 이미지를 이미지-편집 모델(gpt-image-1.5 edit 등)에 넣어 after를 생성하는 방식 권장 |

```
BEFORE: ...base prompt..., wearing plain oversized grey t-shirt and basic jeans,
neutral flat lighting, standing straight facing camera, slightly awkward posture,
deep charcoal studio background (#101018).

AFTER (이미지 편집으로): Transform ONLY the clothing into [스타일 지시문 — §4에서 선택].
Keep the EXACT same person, face, pose, framing, and background. Improve posture
subtly and add soft warm rim lighting. No logos.
```

## 2. 스타일링 서비스 카드 (path 섹션)

| 항목 | 값 |
|---|---|
| 경로 | `public/gallery/after-female-date.png` (App.tsx `service-hero-card`의 src) |
| 사이즈 | **1600 × 1000 (16:10 가로)** 권장 — 카드가 와이드 크롭 |
| 분위기 | 라이트 섹션이므로 warm cream 배경, 룩 전신이 좌우 여백을 두고 보이게 |

## 3. OG 이미지 (링크 미리보기)

| 항목 | 값 |
|---|---|
| 경로 | `public/og-image.png` |
| 사이즈 | **1200 × 630 고정** |
| 구성 | 좌측 40% 모델 컷, 우측에 "오늘, 뭐 입지?" + kstylist.cc 골드 타이포 (텍스트는 생성 말고 캔버스/피그마로 얹는 게 선명함) |

## 4. 360° 스핀 뷰어 프레임 ← 신규 구현됨

| 항목 | 값 |
|---|---|
| 경로 | `public/spin/look-01/frame-00.webp` … `frame-23.webp` (**24장, 2자리 제로패딩**) |
| 사이즈 | **900 × 1200 (3:4 세로)**, 전 프레임 동일 |
| 회전 | 프레임당 **시계방향 15°**, frame-00 = 정면 |
| 동작 | 파일이 있으면 랜딩에 자동 표시(드래그 회전 + 자동회전), 없으면 섹션 자체가 숨겨짐 — 지금 넣기만 하면 됨 |

**현실적인 제작 파이프라인 (중요)**: 스틸 이미지 모델로 24장을 각각 생성하면 인물/옷 일관성이 절대 안 맞습니다. **AI 영상 툴로 턴테이블 영상 1개를 만들고 프레임을 추출**하세요:

```
영상 프롬프트: Studio turntable shot: a Korean male model in [스타일 지시문]
standing on a slowly rotating platform, camera fixed, completes one full 360°
rotation, deep charcoal studio background, warm key light with gold rim light,
photorealistic fashion film, 4 seconds, no logos.
```
```bash
# 4초 영상 → 24프레임 추출 (영상 길이에 맞춰 fps 조정: 24/영상초수)
ffmpeg -i turntable.mp4 -vf "fps=6,scale=900:1200:force_original_aspect_ratio=increase,crop=900:1200" \
  -frames:v 24 frame-%02d.webp -start_number 0
```

룩을 추가하려면 `look-02` 폴더로 늘리고 App.tsx의 `basePath`만 바꾸면 됩니다.

---

## 5. 디자이너 스타일 지시문 라이브러리

**법적 가이드 (먼저 읽기)**: 패션에서 실루엣·무드·스타일 자체는 저작권 보호 대상이 아니라서 "그 브랜드의 미감을 기술한 지시문"으로 생성하는 건 안전합니다. 단, ①로고·모노그램·시그니처 패턴 재현 금지 ②마케팅 문구에 브랜드명 사용 금지("Prada 스타일 제공" 같은 문구는 상표권 문제) ③"카피"가 아니라 "~의 미감에서 증류한 디렉티브"로 운영. 아래는 브랜드명 없이도 그 스타일이 나오도록 **미감을 직접 기술**한 것입니다. 이대로 이미지 프롬프트의 `[스타일 지시문]` 자리에 넣거나, `daily-style-scenarios.ts` 아키타입으로 편입 가능합니다.

**A.PRESSE 계열 — 재단된 빈티지 아메리카나**
```
refined vintage Americana: 1950s French work jacket silhouette re-tailored in
heavyweight ecru moleskin, washed selvedge denim wide-straight trousers with
natural creasing, chambray shirt, leather work boots. Palette: ecru, faded
indigo, olive drab. Mood: old garments rebuilt with luxury tailoring precision.
```

**Prada 계열 — 지적인 오프-레트로**
```
intellectual retro tension: boxy cropped wool jacket with slightly-too-short
sleeves, high-waist pencil skirt or pleated trouser, fine knit polo buttoned to
top, polished chunky loafers with socks. Palette: muted pistachio, cherry
accent, charcoal, ivory. Mood: deliberate awkwardness, precise and cerebral.
```

**Celine 계열 — 파리지앵 부르주아 록**
```
Parisian bourgeois rock: sharp-shouldered slim black blazer, silk pussy-bow
blouse or white tee, straight-leg raw denim or leather trousers, pointed ankle
boots, silk scarf. Palette: black, ivory, camel, gold hardware. Mood: aristocratic
nonchalance with a rock undercurrent.
```

**Hermès 계열 — 콰이어트 럭셔리의 정점**
```
ultimate quiet luxury: unstructured cashmere-blend jacket with equestrian-clean
lines, fine gauge knit, fluid pleated trousers, impeccable leather accessories
(no logos), suede loafers. Palette: gold-tan, deep chocolate, cream, a single
burnt-orange accent. Mood: wealth expressed only through material and cut.
```

**COMOLI 계열 — 일본식 콰이어트 드레이프**
```
Japanese quiet drape: band-collar shirt in washed cotton-silk, wide easy
trousers that pool slightly at the ankle, unlined relaxed jacket, minimal
leather sandals or German trainers. Palette: ink navy, stone, muted moss,
off-white. Mood: unforced elegance, fabric doing all the talking.
```

**SAN SAN GEAR 계열 — 서울 테크-스트리트**
```
Seoul technical streetwear: boxy nylon shell jacket with utilitarian details,
heavyweight wide tee, parachute-cut pants with drawstring hem, chunky trail
sneakers, tonal crossbody. Palette: washed black, cement grey, one dim neon
accent. Mood: functional layering styled with fashion intent.
```

**Satisfy 계열 — 러닝 × 패션**
```
performance-fashion running aesthetic: distressed technical jersey tee with
laser-cut edges, cargo shorts layered over compression tights, engineered
mesh cap, trail running shoes, packable shell tied at waist. Palette: washed
black, dust beige, silver reflective hits. Mood: post-run Paris, athletic wear
worn as fashion.
```

**운영 루프**: 새 레퍼런스(인스타 캡처 등)가 생기면 이 파일에 "브랜드 계열 + 증류 지시문" 형식으로 추가 → 검증된 것부터 `daily-style-scenarios.ts`의 아키타입/팔레트로 편입. 이것이 "스타일 교육"의 지속 경로입니다 (모델 파인튜닝은 gpt-image·Gemini 모두 불가).
