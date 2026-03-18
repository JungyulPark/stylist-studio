# Stylist Studio (kstylist.cc) — 사이트 전체 분석 문서

> 외부 전문가 컨설팅을 위한 핵심 코드, 아키텍처, 유저 플로우 분석

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **서비스명** | Stylist Studio (kstylist.cc) |
| **핵심 기능** | AI 기반 퍼스널 스타일링 — 사진 1장으로 패션 아웃핏 변환 |
| **프론트엔드** | React 19 SPA (모노리스 `App.tsx` ~7,500줄) |
| **백엔드** | Cloudflare Pages Functions (Workers) |
| **DB** | Supabase (PostgreSQL + Auth) |
| **스토리지** | Cloudflare R2 (`stylist-photos`, `stylist-daily-images`) |
| **결제** | Polar.sh (Stripe 기반) |
| **AI 모델** | OpenAI gpt-image-1.5 (1순위) → Gemini 3 Pro → Gemini 2.5 Flash |
| **이메일** | Resend API |
| **날씨** | OpenWeatherMap API |
| **지원 언어** | ko, en, ja, zh, es (5개국어) |
| **도메인** | https://kstylist.cc/ |
| **번들 크기** | JS ~548KB (gzip 159KB), CSS ~91KB (gzip 16KB) |

---

## 2. 수익 모델

| 상품 | 가격 | 유형 | Polar Product ID |
|------|------|------|------------------|
| Full Style Package | $4.99 | 1회 결제 | `533aed39-303f-4746-afb0-d150aa294f64` |
| Daily Style (What to Wear Today) | $6.99/월 | 구독 (7일 무료체험) | `2c761310-373e-4017-8141-8532748713c0` |

**무료 체험**: 브라우저당 3회 무료 분석 (localStorage `stylist_free_trial_count`)
**추천 시스템**: 6자리 코드, 초대받은 사람 무료 체험 리셋, 추천인 +1 크레딧

---

## 3. 기술 스택 상세

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  React 19 + Vite + TypeScript                                │
│  단일 App.tsx (~7,500줄) + App.css (~6,500줄)                │
│  Supabase Auth (Google OAuth + Email/Password)               │
│  GA4 + Microsoft Clarity (분석)                              │
│  IndexedDB (사진 데이터 결제 리다이렉트 간 보존)             │
└──────────────────────┬──────────────────────────────────────┘
                       │ fetch('/api/...')
┌──────────────────────▼──────────────────────────────────────┐
│                    BACKEND (Cloudflare Workers)               │
│  functions/api/*.ts — 각 API 별도 파일                       │
│  functions/_middleware.ts — IP 기반 Rate Limiting             │
│  functions/lib/ — CORS, 에러, 검증, AI 이미지 생성 유틸      │
└──────┬──────────┬──────────┬──────────┬─────────────────────┘
       │          │          │          │
  ┌────▼───┐ ┌───▼────┐ ┌──▼───┐ ┌───▼────┐
  │Supabase│ │Polar.sh│ │  R2  │ │AI Model│
  │  (DB)  │ │(결제)  │ │(이미지│ │OpenAI/ │
  │        │ │        │ │스토리│ │Gemini  │
  └────────┘ └────────┘ └──────┘ └────────┘
```

---

## 4. 파일 구조

```
stylist-studio/
├── src/
│   ├── App.tsx              # 전체 프론트엔드 (모노리스 ~7,500줄)
│   ├── App.css              # 전체 스타일 (~6,500줄)
│   ├── main.tsx             # ReactDOM 진입점
│   ├── index.css            # 글로벌 CSS
│   ├── contexts/
│   │   └── AuthContext.tsx   # Supabase 인증 Provider
│   ├── lib/
│   │   └── supabase.ts      # Supabase 클라이언트 초기화
│   └── utils/
│       └── markdown.ts      # 마크다운 렌더링
│
├── functions/
│   ├── _middleware.ts        # Rate Limiting (IP기반, 슬라이딩 윈도우)
│   └── api/
│       ├── generate-styles.ts       # [핵심] 패션 스타일 생성 (6개 시나리오)
│       ├── transform-batch.ts       # [핵심] 브랜드 패션 변환 (7개 브랜드)
│       ├── analyze.ts               # 얼굴/체형 분석 텍스트 생성
│       ├── daily-style-cron.ts      # [핵심] 매일 7AM 옷차림 이메일 발송
│       ├── daily-style.ts           # 대시보드용 오늘의 스타일 조회
│       ├── create-checkout.ts       # Polar 결제 세션 생성
│       ├── polar-webhook.ts         # Polar 결제 이벤트 웹훅
│       ├── subscribe.ts             # 구독 가입 처리
│       ├── subscription-status.ts   # 구독 상태 확인
│       ├── cancel-subscription.ts   # 구독 취소
│       ├── customer-portal.ts       # Polar 고객 포털
│       ├── refund.ts                # 환불 처리
│       ├── referral.ts              # 추천 시스템
│       ├── favorite-image.ts        # 즐겨찾기 토글
│       ├── profile-photo.ts         # 프로필 사진 관리
│       ├── update-subscriber-profile.ts # 구독자 프로필 업데이트
│       ├── send-report.ts           # 이메일 리포트 전송
│       ├── send-payment-email.ts    # 결제 확인 이메일
│       └── unsubscribe.ts           # 이메일 수신거부
│   └── lib/
│       ├── cors.ts            # CORS 헤더 관리
│       ├── errors.ts          # 표준화된 에러 코드/응답
│       ├── validation.ts      # 입력값 검증
│       ├── openai-image.ts    # OpenAI gpt-image-1.5 이미지 편집
│       ├── gemini-image.ts    # Gemini 이미지 생성 (폴백)
│       └── daily-style-scenarios.ts # 날씨 기반 시나리오 풀
│
├── public/                    # 정적 에셋 (히어로, 갤러리 이미지)
├── supabase/migrations/       # DB 마이그레이션 (4개)
├── wrangler.toml              # Cloudflare 설정
├── vite.config.ts             # Vite 설정
└── CLAUDE.md                  # 프로젝트 규칙/가이드
```

---

## 5. 유저 플로우 (전체 여정)

### 5.1 메인 퍼널: 랜딩 → 결과

```
[랜딩 페이지]
  │  히어로 (Before/After 슬라이더)
  │  마키 티커 (AI-POWERED STYLING...)
  │  How It Works (3단계)
  │  Trust Signals (평점, 속도, 환불보장, AI기술)
  │  서비스 카드 (Daily Style 구독 / Full Package)
  │  Before/After 갤러리
  │  Footer
  │
  ▼ CTA 클릭
[입력 페이지]
  │  사진 업로드 (click/drag/camera)
  │  성별 선택
  │  키/몸무게 입력 (metric/imperial)
  │
  ▼ 제출
[로딩 페이지]
  │  1) /api/analyze → 텍스트 분석 (퍼스널 컬러, 체형)
  │  2) /api/generate-styles → AI 이미지 생성 (3~6개 룩)
  │  ├─ OpenAI gpt-image-1.5 시도
  │  ├─ 실패 시 Gemini 3 Pro
  │  └─ 실패 시 Gemini 2.5 Flash
  │
  ▼ 완료
[결과 or 프리뷰 페이지]
  │
  ├─ [유료 고객] → 결과 페이지
  │   Style DNA 카드 (퍼스널 컬러, 체형, 추천 색상)
  │   패션 갤러리 (3개 스타일 이미지)
  │   공유/다운로드/이메일 전송
  │
  └─ [무료/미결제] → 프리뷰 페이지 (페이월)
      1개 이미지만 공개, 나머지 블러
      A/B 테스트: 긴급 타이머 (Variant B)
      "Unlock Results - $4.99" CTA
        │
        ▼
      [결제 플로우]
```

### 5.2 결제 플로우 (상세)

```
[프리뷰 페이지] → "결제" CTA 클릭
  │
  ▼ 데이터 보존
  IndexedDB에 사진+프로필 저장
  localStorage에 pendingAnalysisFlag, productType 저장
  │
  ▼ 체크아웃 생성
  POST /api/create-checkout
  → Polar API: POST /v1/checkouts/
  → 체크아웃 URL 반환
  │
  ▼ 리다이렉트
  Polar 결제 페이지 (외부)
  │
  ▼ 결제 완료
  /?payment=success&type=full&checkout_id=xxx 로 리다이렉트
  │
  ▼ 복원 로직
  1) URL 파라미터 추출 후 즉시 클린업 (중복 방지)
  2) IndexedDB에서 사진+프로필 복원
  3) isFullPaid = true 설정
  4) /api/analyze + /api/generate-styles 재실행
  5) 결과 페이지로 이동
  │
  ▼ 실패 시 자동 환불
  분석 API 실패 → /api/refund 자동 호출
  checkout_id로 Polar 환불 처리
  │
  ▼ 동시: 웹훅
  Polar → POST /api/polar-webhook
  → HMAC-SHA256 서명 검증
  → Supabase subscribers 테이블 업데이트
```

### 5.3 구독 플로우 (Daily Style)

```
[랜딩 페이지] → "Daily Style" 카드 클릭
  │
  ▼ 로그인 체크
  미로그인 → 로그인 페이지
  이미 구독 → 대시보드
  │
  ▼ 구독 폼 모달
  도시 입력 (타임존 자동 감지)
  키/몸무게/성별 (선택)
  │
  ▼ 결제
  POST /api/create-checkout { productType: 'daily_style' }
  → Polar 구독 결제 페이지
  │
  ▼ 결제 완료 후
  POST /api/subscribe (프로필 데이터 저장)
  → 구독 대시보드로 이동
  │
  ▼ 매일 아침 7AM (로컬 시간)
  Cloudflare Cron → GET /api/daily-style-cron
  1) 활성 구독자 전체 조회
  2) 로컬 시간 7AM인 구독자 필터
  3) 오늘 이미 발송했는지 체크
  4) 날씨 API (정오 기온) 조회
  5) OpenAI gpt-5-mini로 스타일링 추천 텍스트 생성
  6) R2에서 구독자 사진 로드
  7) Gemini/OpenAI로 아웃핏 이미지 생성 (드레시+캐주얼)
  8) R2에 생성된 이미지 저장
  9) HTML 이메일 빌드 + Resend로 발송
  10) daily_recommendations 테이블에 기록
```

### 5.4 인증 플로우

```
[이메일/비밀번호]
  가입 → Supabase 이메일 인증 링크 발송 → 인증 후 세션
  로그인 → Supabase 세션 생성 → AuthContext에 user 설정
  비밀번호 재설정 → 이메일 링크 → 재설정 페이지

[Google OAuth]
  "Google로 로그인" → Google 동의 화면 → 리다이렉트
  → URL에 #access_token=... 반환
  → Supabase onAuthStateChange 감지 → 세션 설정
  → URL 자동 클린업 (#landing으로 대체)

[로그아웃]
  localStorage 구독/결제 관련 키 제거
  (stylist_free_trial_count는 유지 — 브라우저당)
  상태 초기화 → Supabase 세션 해제
```

---

## 6. AI 이미지 생성 파이프라인 (핵심)

### 6.1 모델 폴백 체인

```
사용자 사진 (base64 data URI)
        │
   [검증: MIME타입, 크기 50B~15MB]
        │
   [프롬프트 빌드: 브랜드 + 컬러 팔레트 + 체형 분석]
        │
   ┌─────────────────────────────────────────┐
   │  1순위: OpenAI gpt-image-1.5            │
   │  타임아웃: 55초, 재시도: 1회            │
   │  FormData (multipart) 업로드             │
   │  size: auto, quality: auto               │
   └──────────────┬──────────────────────────┘
                  │ 성공 → base64 이미지 반환
                  │ 실패 → 폴스루
                  ▼
   ┌──────────────────────────────────────────┐
   │  2순위: Gemini 3 Pro Image Preview       │
   │  타임아웃: 55초                          │
   │  POST generativelanguage.googleapis.com  │
   │  responseModalities: ["IMAGE", "TEXT"]   │
   └──────────────┬──────────────────────────┘
                  │ 성공 → base64 이미지 반환
                  │ 실패 → 폴스루
                  ▼
   ┌──────────────────────────────────────────┐
   │  3순위: Gemini 2.5 Flash Image           │
   │  타임아웃: 55초, 재시도: 2회             │
   │  429/402 (쿼타) → 재시도 안 함           │
   └──────────────┬──────────────────────────┘
                  │ 성공 → base64 이미지 반환
                  │ 전부 실패 → null 반환
```

### 6.2 프롬프트 구조 (핵심 디렉티브)

```
[FACE IDENTITY LOCK] — 최우선순위
  얼굴을 픽셀 수준으로 동일하게 유지

[OUTFIT CHANGE ONLY]
  옷만 변경, 인물 재생성 금지 (인페인팅)

[STYLING APPROACH]
  4계절 퍼스널 컬러 (봄/여름/가을/겨울)
  체형별 실루엣 전략 (역삼각/직사각/모래시계/삼각/라운드)
  브랜드 레퍼런스 (Bottega, Celine, The Row, Hermès 등)

[BODY PROPORTION PRESERVATION]
  다리 길이, 상체 비율, 허리 라인 정확히 유지

[BEAUTY RETOUCH]
  여성: 소프트 스킨 스무딩, 글로우, 스튜디오 라이팅
  남성: 라이트 스무딩, 내추럴/남성적 톤

[FRAMING RULE]
  크롭/줌 금지, 원본 구도 유지 (얼굴 잘림 방지)

[ABSOLUTE RULES — 위반 시 실패]
  1. 얼굴 변경 금지
  2. 체형 비율 변경 금지
  3. 성별 부적합 의상 금지
  4. 배경 인물 변경 금지
  ...10개 규칙
```

### 6.3 Daily Style 시나리오 시스템

```
21개 컬러 팔레트 × 10개 스타일링 아키타입 (소수 회전)

드레시 시나리오:
  럭셔리 브랜드 레퍼런스 (Hermès, Bottega, Tom Ford 등)
  직장/데이트/이벤트 상황

캐주얼 시나리오:
  일상 접근성 (럭셔리 브랜드명 없음, 심플 소재)
  주말/카페/산책 상황

날씨 연동:
  기온별 7개 방한 아이템 풀 (성별×온도 단계)
  낮 13시 기온 기준 (7AM 현재 기온이 아님)
```

---

## 7. 백엔드 API 상세

### 7.1 Rate Limiting (\_middleware.ts)

| 엔드포인트 | 제한 | 윈도우 |
|---|---|---|
| `/api/generate-styles` | 5회 | 60초 |
| `/api/transform-batch` | 5회 | 60초 |
| `/api/create-checkout` | 10회 | 60초 |
| `/api/subscription-status` | 30회 | 60초 |
| (기본값) | 60회 | 60초 |

**면제 경로**: `polar-webhook`, `daily-style-cron`, `unsubscribe`
**알고리즘**: IP별 슬라이딩 윈도우, 인메모리 (5분 간격 클린업)

### 7.2 CORS 정책 (cors.ts)

허용 오리진:
- `https://stylist-studio.pages.dev`
- `https://personal-stylist-studio.pages.dev`
- `http://localhost:5173` / `4173` / `127.0.0.1:5173`
- `*.pages.dev` 와일드카드

**핵심 규칙**: 모든 API 응답 (성공, 에러, 프리플라이트)에 CORS 헤더 필수

### 7.3 에러 처리 (errors.ts)

표준화된 에러 코드 체계:
```json
{
  "error": "사람이 읽을 수 있는 메시지",
  "code": "VALIDATION_ERROR | UNAUTHORIZED | RATE_LIMIT | CONFIG_ERROR | EXTERNAL_API_ERROR | INTERNAL_ERROR",
  "timestamp": "ISO-8601"
}
```

---

## 8. 데이터베이스 스키마 (Supabase)

### subscribers 테이블

| 컬럼 | 타입 | 용도 |
|------|------|------|
| id | uuid | PK |
| email | text | Unique, 결제 연동 키 |
| status | text | `active`, `trialing`, `canceled` |
| polar_subscription_id | text | Polar 구독 ID |
| trial_ends_at | timestamp | 무료체험 종료일 |
| current_period_end | timestamp | 현재 결제 주기 종료일 |
| canceled_at | timestamp | 취소 요청일 |
| city | text | 날씨 조회용 도시명 |
| timezone | text | 로컬 시간 판단 (예: `Asia/Seoul`) |
| latitude, longitude | float | 날씨 API 좌표 |
| height_cm, weight_kg | numeric | 체형 분석용 |
| gender | text | `male` / `female` |
| photo_r2_key | text | R2 사진 경로 |
| profile_complete | boolean | 프로필 완성 여부 |
| preferred_language | text | 이메일 언어 |
| user_id | uuid | Supabase Auth UID |

### daily_recommendations 테이블

| 컬럼 | 타입 | 용도 |
|------|------|------|
| id | uuid | PK |
| subscriber_id | uuid | FK → subscribers |
| sent_date | date | 로컬 날짜 (중복 발송 방지 키) |
| weather_data | jsonb | 날씨 전체 데이터 |
| temperature_c | numeric | 기온 |
| recommendation_html | text | AI 추천 텍스트 |
| outfit_images | jsonb | 생성된 이미지 URL 배열 |
| image_generation_status | text | `success` / `error` |
| email_sent | boolean | 이메일 발송 여부 |
| email_sent_at | timestamp | 발송 시각 |

### profiles 테이블

| 컬럼 | 타입 | 용도 |
|------|------|------|
| id | uuid | PK = Auth UID |
| email | text | Unique |
| display_name | text | 표시 이름 |
| avatar_url | text | 아바타 URL |

### referrals 테이블

| 컬럼 | 타입 | 용도 |
|------|------|------|
| id | uuid | PK |
| referrer_id | uuid | 추천인 |
| referral_code | text(6) | Unique 코드 |
| invitee_email | text | 초대받은 사람 |
| converted | boolean | 결제 전환 여부 |

---

## 9. 프론트엔드 핵심 상태

### 라우팅

```typescript
type Page = 'landing' | 'input' | 'loading' | 'result' | 'how-to-use'
          | 'preview' | 'login' | 'signup' | 'profile' | 'subscription-dashboard'
```

URL 해시 기반 (`#landing`, `#input` 등), `popstate` 이벤트로 뒤로가기 지원

### 주요 State 변수

| State | 타입 | 설명 | 영속성 |
|-------|------|------|--------|
| `page` | Page | 현재 화면 | URL hash |
| `profile` | Object | 사진+키/몸무게/성별 | 세션 |
| `isFullPaid` | boolean | 결제 완료 여부 | 세션 |
| `freeTrialCount` | number | 사용한 무료 횟수 (0~3) | localStorage |
| `isSubscribed` | boolean | 구독 활성 여부 | localStorage |
| `user` | User \| null | 인증된 사용자 | Supabase 세션 |
| `report` | string | 스타일 분석 텍스트 | 세션 |
| `styleImages` | array | 생성된 이미지 배열 | 세션 |
| `dailyStyle` | object \| null | 오늘의 스타일 | 세션 |
| `abPaywallVariant` | 'A' \| 'B' | A/B 테스트 변형 | localStorage (고정) |
| `timerEnd` | number \| null | 24시간 할인 타이머 | localStorage |
| `referralCode` | string \| null | 추천 코드 | 세션 |

### 필수 localStorage 키 (변경/삭제 금지)

```
stylist_free_trial_count    — 무료 사용 횟수
stylist_subscription_active — 구독 활성 플래그
stylist_first_visit_timer   — 최초 방문 타이머
stylist_referral_code       — 추천 코드
pendingAnalysisFlag         — 결제 후 분석 대기
productType                 — 구매한 상품 타입
paidCustomer                — 유료 고객 플래그
lastCheckoutId              — 환불용 체크아웃 ID
```

---

## 10. A/B 테스트

### 현재 테스트: `paywall_v1`

| 항목 | Variant A (대조군) | Variant B (실험군) |
|------|-------------------|-------------------|
| 할당 | 50/50 랜덤, localStorage에 고정 | |
| 페이월 | 표준 (가격+CTA) | 15분 긴급 타이머 추가 |
| 서비스 카드 | 표준 배지 | "$4.99" 가격 배지 추가 |

**추적 이벤트**: `paywall_view`, `paywall_cta_click`, `begin_checkout` — 모두 `ab_variant` 포함
**GA4 유저 속성**: `ab_paywall: 'A' | 'B'`

---

## 11. AI 프롬프트 시스템 (전체)

프롬프트는 3개 파일에 분산되어 있습니다:
- `functions/lib/gemini-image.ts` — 공통 이미지 편집 프롬프트 (얼굴 보존, 인페인팅 규칙)
- `functions/lib/stylist-prompts.ts` — Full Style 시나리오 + 직업별 유니폼/오프듀티
- `functions/lib/daily-style-scenarios.ts` — 날씨 기반 일일 스타일 시나리오

### 11.1 공통 이미지 편집 프롬프트 (gemini-image.ts)

모든 이미지 생성에 공통으로 적용되는 마스터 프롬프트입니다.

```
You are the world's top personal stylist. Your job is to dress this person
in the PERFECT outfit that complements their unique skin tone, face shape,
and body proportions.

⚠️ FACE IDENTITY LOCK — HIGHEST PRIORITY ⚠️
This is NOT a generation task. This is a CLOTHING SWAP on an EXISTING photo.
- The person's FACE must remain 100% IDENTICAL to the input
- Do NOT regenerate, redraw, or reinterpret the face in ANY way
- The face must be a PIXEL-LEVEL COPY from the original photo
- If you cannot preserve the face exactly, return the original unchanged

EDIT this photo - ONLY change the OUTFIT of the MAIN PERSON to: {scenario.prompt}

STYLING APPROACH — PROFESSIONAL PERSONAL COLOR & BODY ANALYSIS:
- Diagnose seasonal color type from skin undertone:
  * SPRING WARM (golden, peachy glow): Coral, warm peach, cream, light camel
  * SUMMER COOL (pink, delicate): Lavender, dusty rose, powder blue, mauve
  * AUTUMN WARM (deep golden/olive): Terracotta, olive, mustard, burgundy
  * WINTER COOL (high contrast, clear): Cobalt, emerald, magenta, true red
- Visually analyze body type → choose most flattering silhouette strategy
- The specified color palette is a SUGGESTION — shift to match seasonal type

BEAUTY ENHANCEMENT (여성):
- Soft natural skin smoothing, gentle soft-focus glow, even skin tone
- Warm healthy glow, soft studio lighting, keep NATURAL

BEAUTY ENHANCEMENT (남성):
- Light natural smoothing, subtle glow, clean fresh look
- Keep NATURAL and masculine

INPAINTING RULES:
1. ONLY replace clothing within the MAIN PERSON's body silhouette
2. DO NOT generate a new person — use EXACT existing body outline
3. New clothes fit WITHIN original body boundaries
4. Body parts stay in EXACT same position

BODY PROPORTION PRESERVATION (CRITICAL):
- LEG LENGTH must be IDENTICAL to original
- TORSO-to-LEG ratio must match exactly
- Waistline position stays at SAME height

ABSOLUTE REQUIREMENTS (위반 시 실패):
1. 얼굴 = 원본과 동일인물 (다르면 실패)
2. 크롭/줌 금지 — 원본과 동일한 프레이밍
3. 종횡비 변경 금지
4. 헤어스타일/피부톤 변경 금지
5. 배경/다른 사람 변경 금지
6. 해상도 원본과 동일
7. 다리가 바지/치마 안에 (위에 겹치기 금지)
8. 팔이 소매를 통과 (공중 부유 금지)
9. 체형 비율 왜곡 금지
10. 머리가 완전히 보여야 함
```

### 11.2 Full Style 시나리오 (stylist-prompts.ts — getScenarios)

$4.99 1회 결제 시 생성되는 3개 스타일입니다.

#### 시나리오 1: Best Match (베스트 매치)

**남성 프롬프트 핵심:**
```
Create this man's SIGNATURE LOOK — his single best outfit.

STYLING: Auralee minimal — Fabric takes the lead — boiled wool,
garment-washed cotton poplin, baby cashmere. Dropped-shoulder seams,
relaxed body with clean hems.

ANALYZE his body type, skin tone, face shape from the photo.
Then choose the SINGLE most flattering combination from:
- Fine-gauge merino crewneck + straight-leg pressed wool trousers + leather derby (Auralee minimal)
- Unstructured cotton-linen blazer + garment-washed band-collar shirt + chinos (Lemaire ease)
- Cashmere-cotton crewneck over oxford shirt + tapered wool trousers + leather sneakers (Cucinelli smart-casual)
- Mock-neck fine-gauge knit + straight-leg dark denim + suede desert boots (Massimo Dutti refined)

Think the best-dressed man at a gallery opening — quiet confidence, zero effort.
```

**여성 프롬프트 핵심:**
```
Create this woman's SIGNATURE LOOK — her single most head-turning outfit.

STYLING: 2026 It-Girl meets quiet luxury. Clean lines, intentional proportions.
Think Hailey Bieber meets old Celine — polished but never boring.

Choose the SINGLE most flattering combination:
- Oversized structured blazer + fitted ribbed tank + straight-leg trousers + slingback heels (Frankie Shop power)
- Cashmere-blend knit polo + high-waisted pleated wide-leg trousers + leather loafers (Toteme effortless)
- Butter-soft leather jacket + silk camisole + dark straight-leg jeans + ankle boots (cool girl edge)
- Fitted mock-neck knit + draped midi skirt with slit + strappy heeled mules (modern feminine)
```

#### 시나리오 2: Date Night (데이트룩)

**남성:** `RELAXED, MAGNETIC date night look. NOT a suit — think Saturday night at a candlelit wine bar. Effortless cool.` 레퍼런스: 라이언 고슬링 오프듀티

**여성:** `STUNNING date night look — the outfit that makes everyone look twice.` 레퍼런스: Zendaya at a dinner party. 센시한 but 세련된

#### 시나리오 3: Daily (데일리)

**남성:** `POLISHED everyday outfit — the best-dressed regular person in any room.` Cucinelli 스타일 — 니트 레이어링, 보이는 셔츠 칼라

**여성:** `PERFECT everyday outfit — the kind strangers compliment on the street.` 2026 elevated basics — Instagram-worthy

### 11.3 직업별 유니폼 + 오프듀티 (stylist-prompts.ts — getWorkScenarios)

6개 직업: Doctor, Dentist, Nurse, Vet, Chef, Lawyer

각 직업마다 4개 시나리오 생성:
1. **My Best Shade** — Loro Piana 컬러리스트 관점, 피부톤에 가장 어울리는 색상
2. **Bold Alternative** — Bottega Veneta 크리에이티브 디렉터 관점, 대담한 대비 색상
3. **Soft Tonal** — Brunello Cucinelli 톤온톤, 오버사이즈 핏으로 차별화
4. **Off-Duty Commute** — 퇴근 후 가장 멋진 사복 룩 (계절 반영)

#### 예시: 변호사 남성 유니폼
```
SUIT: Two-piece in super 150s Italian wool — buttery hand, subtle luster.
Single-breasted, two-button, natural shoulder. Full-canvas construction.
SHIRT: Crisp Egyptian cotton poplin, spread collar, French cuffs.
TIE: Italian silk — subtle diagonal stripe or grenadine texture.
SHOES: Mirror-polished cap-toe oxford or sleek penny loafer.
ACCESSORIES: Dress watch — Jaeger-LeCoultre or Cartier Tank level of taste.

MOOD: The attorney who makes opposing counsel nervous before opening statements.
```

#### 예시: 셰프 여성 유니폼
```
Modern chef jacket — feminine tailored cut, mandarin collar, short sleeves.
Darted at the waist for shape. Premium Japanese cotton.
Crossback apron in washed heavyweight linen or raw selvedge denim.
Slim straight black trousers — The Row trousers but kitchen-ready.

MOOD: She got the James Beard AND the Vogue Italia feature in the same year.
```

### 11.4 트렌드 스타일 (stylist-prompts.ts — getTrendScenarios)

5개 트렌드: Street, Hype, Minimal MZ, Sporty, Retro, Avant-Garde

각 트렌드마다 브랜드 레퍼런스가 다름:
- **Street**: Dazed/i-D 스트리트 스냅. Nike Dunk Low, NB 550. 하라주쿠 × 윌리엄스버그 × 홍대
- **Hype**: Highsnobiety 에디토리얼. Bottega, Fear of God. "quiet wealth"
- **Minimal MZ**: COS/Lemaire 캠페인. Maison Margiela GAT. "Tadao Ando building in human form"
- **Sporty**: Arc'teryx × Zegna. Salomon XT-6. "he summits AND brunches"
- **Retro**: 70s soul, 80s swagger, 90s nonchalance. Adidas Samba, NB 574
- **Avant-Garde**: Rick Owens, Yohji Yamamoto. "she doesn't enter rooms — she alters them"

### 11.5 Daily Style 시나리오 (daily-style-scenarios.ts)

매일 아침 구독자에게 발송되는 옷차림 추천의 프롬프트 시스템입니다.

#### 시나리오 조합 시스템
```
21개 컬러 팔레트 × 10개 스타일링 아키타입 × 7개 방한 아이템 풀
= 소수 회전으로 210일간 palette+archetype 반복 없음
= 아이템 풀까지 합치면 10,290개 고유 조합
```

#### 드레시 시나리오 — 10개 남성 아키타입
```
1. Hermès precision — 소프트 비구조 어깨, 샤프한 트라우저 라인, 캐시미어 플란넬
2. Auralee minimal — 패브릭이 주인공, 보일드 울, 드롭숄더
3. Cucinelli ease — 파인게이지 니트 + 스프레드 칼라 셔츠, 칼라&커프스 보이기
4. Loro Piana quiet — 최고급 패브릭이 말하는 토널 드레싱
5. LV heritage — 프린스 오브 웨일스 체크, 헤링본, 현대적 커팅
6. Bottega urban — 포레스트 그린 더블브레스트 코트, 건축적 어깨
7. Savile Row navy — 네이비 울 풀매칭 수트, 클래식 영국 비스포크
8. Tom Ford sharp — 피크라펠 자켓, 모헤어 블렌드 수팅
9. Savile Row charcoal — 차콜 그레이 울 수트, 올드머니 절제
10. Zegna refined — 카시미어 블레이저 + 폴로 넥, 트리플 스티치 스니커즈
```

#### 드레시 시나리오 — 10개 여성 아키타입
```
1. Hermès dandy — 핏티드 but 비구조적, 리브드 니트 + 퀼티드 레더
2. Auralee soft — 패브릭 퍼스트, 가먼트다이드 캐시미어, 심플 플랫
3. LV comfort — 플러시하고 친근한 빌로잉 실루엣, 실키 트라우저
4. Hermès tailored — 임페커블 컷 울 블레이저 + 매칭 트라우저, 에르메스 파워
5. Loro Piana refined — 매칭 캐시미어-울 블레이저 + 와이드 레그 트라우저
6. minimal Row — 오버사이즈 코트/블레이저 + 슬립 드레스, 토널 모노크롬
7. Max Mara timeless — 더블브레스트 카멜 코트, 실크 블라우스
8. Celine Parisian — 핏티드 블레이저/레더 자켓, 시가렛 트라우저
9. Bottega sculptural — 조각적 레더/패디드 니트, 주얼 톤
10. Dior structured — 건축적 프렌치 여성성, 바 자켓, A라인 미디 스커트
```

#### 캐주얼 시나리오 — 10개 남성 무드
```
1. clean minimal — 심플 잘 재단된 베이직, 릴렉스트 치노
2. relaxed fit — 오버사이즈 코튼 셔츠, 와이드 스트레이트 울 트라우저
3. soft texture — 가먼트워시드 코튼, 와이드 코듀로이
4. sweat setup — 클린 매칭 스웻셔츠+조거 세트
5. French casual — 크루넥 티 or 브르통 스트라이프, 미디엄워시 릴렉스트 진
6. Nordic practical — 미드웨이트 스웻셔츠, 테이퍼드 유틸리티 트라우저
7. outdoor-city — 코튼 오버셔츠/라이트 셸 자켓, 카고 팬츠
8. easy smart — 크루넥 니트/집 후디, 와이드 울 블렌드 트라우저
9. weekend ease — 코튼 폴로/크루넥 스웨터, 오리지널워시 와이드 데님
10. warm layers — 니트 스웨터 + 심플 티 레이어링
```

#### 날씨 연동 기온별 분기
```
영하 (< 0°C): 패딩 다운 파카, 두꺼운 플란넬, 방수 부츠, 캐시미어 스카프+장갑+비니
혹한 (0~5°C): 더블브레스트 울 오버코트, 캐시미어 터틀넥, 가죽 장갑
추움 (5~10°C): 캐시미어 코트, 머리노 터틀넥, 프레스트 울 트라우저
선선 (10~20°C): 비구조 블레이저, 파인 니트 캐미솔, 로퍼
따뜻 (20~28°C): 코튼-실크 블라우스, 와이드 리넨 트라우저, 에스파드리유
더움 (28°C+): 리넨 셔츠 드레스, 플랫 레더 샌들, 스트로 클러치
```

#### 기온별 방한 아이템 풀 (성별 × 온도 단계 × 7개)

남성 영하 7개 키트 예시:
```
Kit 1: chunky cable-knit crew sweater + long padded down parka + heavy flannel trousers + waterproof insulated leather boots + thick wool scarf + cashmere-lined leather gloves + knit beanie
Kit 2: cashmere ribbed turtleneck + double-breasted heavy wool overcoat + straight-leg wool flannel trousers + insulated leather chelsea boots + brushed-wool scarf + shearling gloves
...7개 (매일 1개씩 회전)
```

#### Expert Stylist ANALYZE Directive (모든 시나리오에 래핑)

드레시/캐주얼 프롬프트를 감싸는 바디 분석 지시문:
```
FIRST, ANALYZE this [woman/man]'s body type, skin tone, face shape,
and proportions from the photo.
Then ADAPT the outfit below to be MOST FLATTERING for [HER/HIS] specific body:

여성:
- Long legs → show with the right hemline and silhouette
- Defined waist → emphasize with belts, fitted mid-sections
- Broad shoulders → balance with V-necklines, A-line shapes
- Petite frame → elongate with high waist, monochromatic palette
- Curvy figure → highlight with X-silhouette, defined waist

남성:
- Broad shoulders → lean into structured pieces, clean lines
- Slim build → add visual presence with layered textures
- Athletic build → showcase with fitted knits
- Fuller build → elongate with vertical lines, V-necks

STYLING VARIETY: 같은 룩 반복 금지. 바지 다양화 필수 —
다크 네이비, 미디엄워시 데님 진, 차콜 울, 올리브 치노, 블랙 슬림 등.
브라운/탄/카키만 반복하지 말 것.

퍼스널 컬러 적응:
SPRING WARM → coral, warm peach, cream — vivid warm radiance
SUMMER COOL → lavender, dusty rose, powder blue — muted cool elegance
AUTUMN WARM → terracotta, olive, mustard — rich depth
WINTER COOL → cobalt, emerald, true red, black — bold clarity
```

### 11.6 브랜드 패션 변환 (transform-batch.ts)

7개 브랜드별 변환 프롬프트 (남/여 각각):

**남성 7개 브랜드:**
- hermes-exec, cucinelli-smart, auralee-minimal, loro-piana, lv-heritage, bottega-modern, weekend

**여성 7개 브랜드:**
- hermes-chic, auralee-soft, row-modern, lv-comfort, lemaire-natural, maxmara-classic, weekend

각 브랜드 프롬프트는 `buildBrandEditPrompt({ brandDirective, gender })`로 감싸져서 공통 인페인팅 규칙과 결합됩니다.

### 11.7 컬러 팔레트 시스템

21개 런웨이 큐레이션 팔레트 (남/여 별도):

**남성 팔레트 예시 (21개 중 일부):**
```
midnight plum:  dark plum / charcoal / silver grey / deep navy / accent: amethyst
royal matte:    royal blue / ink black / oatmeal / slate / accent: mint green
anglomania:     tweedy brown / herringbone grey / cream / dark olive / accent: burgundy
porcelain sand: charcoal olive / warm sand / porcelain white / stone mist / accent: copper
glacier mist:   ice blue / pearl grey / winter white / deep slate / accent: brushed gold
alpine grey:    pewter grey / cloud white / pale stone / soft charcoal / accent: forest green
...총 21개
```

**여성 팔레트 예시 (21개 중 일부):**
```
noir leather:    ink black / deep charcoal / warm ivory / cognac brown / accent: gold
midnight silk:   midnight navy / silver / pearl white / deep charcoal / accent: gold chain
cashmere blush:  dusty rose / baby cashmere beige / pearl white / muted lavender / accent: rose gold
silk plush:      champagne silk / soft camel / powder pink / warm grey / accent: antique gold
jewel depth:     emerald / deep burgundy / ivory / midnight blue / accent: bronze
...총 21개
```

팔레트 회전: `getDayIndex() % 21` (날짜 기반, 21일 주기)
무드 회전: `getDayIndex() % 10` (10일 주기)
21과 10은 서로소 → 210일 후 첫 반복

---

## 12. 디자인 시스템: Platinum Editorial

### 컬러

```css
--primary: #1A1A1A        /* 거의 검정 — 헤딩, 강조 */
--primary-light: #4A4A4A  /* 보조 텍스트 */
--bg-light: #FAFAF8       /* 따뜻한 크림 배경 (순백 아님) */
--bg-dark: #111111        /* 다크 섹션 */
--charcoal: #1a1a1a       /* 본문 텍스트 */
Gold accent: #c9a962      /* CTA, 그라데이션, 하이라이트 */
Gold gradient: linear-gradient(135deg, #c9a962, #d4af37)
```

### 타이포그래피

- **UI 텍스트**: `Manrope` (Sans-serif)
- **에디토리얼 헤딩**: `Playfair Display` (Serif)

### 핵심 규칙

1. 랜딩 페이지에 **흰색 텍스트 사용 금지** (배경이 크림이므로 안 보임)
2. UI에 **이모지 금지** (럭셔리 에디토리얼 톤)
3. 서비스 카드는 어두운 오버레이 → 그 안에서만 흰색 텍스트 허용

### 최근 적용된 Lumina-inspired 디자인 개선

- 히어로 타이틀: 골드 시머 애니메이션 (6초 주기)
- 마키 티커: 골드 그라데이션 텍스트 흐름
- 섹션 디바이더: 골드 그라데이션 라인
- 카드 호버: 골드 글로우 + 상단 골드 액센트 라인
- 전 섹션 스크롤 페이드인 애니메이션

---

## 12. 퍼널 트래킹 (GA4)

```
Step 1: landing_view       — 랜딩 페이지 방문
Step 2: photo_upload       — 사진 업로드
Step 3: full_input_submit  — 폼 제출
Step 4: begin_checkout     — 결제 시작
Step 5: purchase           — 결제 완료
Step 6: result_view        — 결과 확인
```

**추가 이벤트**: `trust_section_view`, `select_item`, `share`, `download_report`

---

## 13. 보안 & 성능

### 보안

| 항목 | 구현 |
|------|------|
| CORS | 화이트리스트 기반, 모든 응답에 헤더 포함 |
| Rate Limiting | IP별 슬라이딩 윈도우 (AI 생성 5회/분) |
| 웹훅 검증 | Polar HMAC-SHA256 서명 검증 |
| 크론 인증 | CRON_SECRET 검증 |
| CSP | strict Content-Security-Policy (`public/_headers`) |
| 입력 검증 | 타입/범위/포맷 전부 서버에서 검증 |
| 자동 환불 | 분석 실패 시 자동 Polar 환불 |

### 성능 병목

| 병목 | 소요 시간 | 대응 |
|------|----------|------|
| OpenAI 이미지 생성 | 30~60초 | 병렬 생성 (Promise.all) |
| Gemini 이미지 생성 | 20~45초 | 폴백 + 지수 백오프 재시도 |
| 번들 크기 | 548KB (gzip 159KB) | 모노리스 구조의 한계 |
| R2 사진 로드 (크론) | 1~2초 | 한 번 로드 후 재사용 |

### 알려진 아키텍처 과제

1. **모노리스 프론트엔드**: App.tsx ~7,500줄 → 코드 스플리팅, 컴포넌트 분리 필요
2. **인메모리 Rate Limiting**: Cloudflare edge 인스턴스 간 공유 안 됨
3. **번들 최적화**: 500KB 경고 초과, dynamic import 미적용
4. **CSS 모노리스**: App.css ~6,500줄 → CSS Modules 또는 분리 필요

---

## 14. 환경 변수 (Cloudflare Dashboard)

| 변수 | 용도 | 필수 |
|------|------|------|
| `OPENAI_API_KEY` | OpenAI API | Y |
| `GEMINI_API_KEY` | Google Gemini API | Y |
| `POLAR_API_KEY` | Polar 결제 API | Y |
| `POLAR_WEBHOOK_SECRET` | 웹훅 서명 검증 | 권장 |
| `RESEND_API_KEY` | 이메일 발송 | Y (크론) |
| `SUPABASE_URL` | Supabase 프로젝트 URL | Y |
| `SUPABASE_SERVICE_KEY` | Supabase 서비스 롤 키 | Y |
| `OPENWEATHER_API_KEY` | 날씨 API | Y (크론) |
| `CRON_SECRET` | 크론 엔드포인트 인증 | Y |

**R2 바인딩** (wrangler.toml):
- `PHOTOS_BUCKET` → `stylist-photos`
- `DAILY_IMAGES_BUCKET` → `stylist-daily-images`

---

## 15. 빌드 & 배포

```bash
npm run dev          # Vite 프론트엔드 (5173)
npm run dev:api      # 백엔드 (8788)
npm run dev:full     # 프론트+백엔드 동시
npm run build        # tsc + vite build
npm run deploy       # build + wrangler pages deploy
npm run test         # vitest (60개 테스트)
npm run lint         # eslint
```

**배포 대상**: Cloudflare Pages (자동 빌드 또는 `npm run deploy`)
**Node**: 20.18.1 (호환 경고 있으나 동작)

---

## 16. 질문/컨설팅 포인트

이 문서를 기반으로 전문가에게 아래 영역에 대해 의견을 구할 수 있습니다:

1. **아키텍처**: 모노리스 → 마이크로 프론트엔드/컴포넌트 분리 전략
2. **성능**: 번들 최적화, 이미지 생성 대기 UX 개선
3. **전환율**: A/B 테스트 확장, 페이월 최적화
4. **스케일링**: Rate Limiting 분산 처리, Edge 캐싱 전략
5. **디자인**: 럭셔리 에디토리얼 톤의 일관성 및 개선점
6. **SEO/마케팅**: 다국어 SEO, 소셜 미디어 전략
7. **보안**: CSP 강화, 웹훅 검증 필수화
8. **수익화**: 가격 전략, 신규 상품 기회
