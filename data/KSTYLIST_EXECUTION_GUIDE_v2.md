# kstylist.cc 전면 개선 실행 가이드 v2
## For Claude AI Agent — 읽고 즉시 실행할 것

> **문서 목적**: kstylist.cc 코드베이스에 접근하는 Claude AI 에이전트가 읽고, 우선순위대로 구현을 실행하기 위한 상세 지침.
> **최종 갱신**: 2026-03-18 (v2 — 수익 모델 수정)
> **핵심 변경**: 구독 모델 → 1회 고가 리포트 모델로 전환, AI 모델/프롬프트 변경 금지

---

## 0. 현재 상태 요약 (Context)

### 서비스 개요
- **서비스명**: Stylist Studio (kstylist.cc)
- **핵심 기능**: AI 기반 퍼스널 스타일링 — 사진 1장으로 퍼스널 컬러 진단 + 패션 아웃핏 변환
- **프론트엔드**: React 19 SPA, 모노리스 App.tsx (~7,500줄) + App.css (~6,500줄)
- **백엔드**: Cloudflare Pages Functions (Workers)
- **DB**: Supabase (PostgreSQL + Auth)
- **스토리지**: Cloudflare R2 (stylist-photos, stylist-daily-images)
- **결제**: Polar.sh (Stripe 기반)
- **AI 모델**: OpenAI gpt-image-1.5 (1순위) → Gemini 3 Pro → Gemini 2.5 Flash (3단 폴백)
- **배포**: Cloudflare Pages
- **도메인**: https://kstylist.cc/

### ⚠️ 절대 변경 금지 사항
| 항목 | 이유 |
|------|------|
| AI 이미지 생성 모델 폴백 순서 (OpenAI → Gemini 3 Pro → Gemini 2.5 Flash) | 성능 격차 심함, 품질 유지 필수 |
| AI 프롬프트 시스템 전체 (gemini-image.ts, stylist-prompts.ts, daily-style-scenarios.ts) | 핵심 자산, 튜닝 완료 상태 |
| Polar.sh 결제 인프라 | 이미 작동 중 |
| Supabase Auth 구조 | 이미 작동 중 |

### 파일 구조 (핵심)
```
stylist-studio/
├── src/
│   ├── App.tsx              # 전체 프론트엔드 모노리스 (~7,500줄)
│   ├── App.css              # 전체 스타일 (~6,500줄)
│   ├── contexts/AuthContext.tsx
│   ├── lib/supabase.ts
│   └── utils/markdown.ts
├── functions/
│   ├── _middleware.ts        # Rate Limiting
│   └── api/
│       ├── generate-styles.ts       # [핵심] 패션 스타일 생성 — 변경 금지
│       ├── transform-batch.ts       # 브랜드 패션 변환 (7개 브랜드) — 제거 대상
│       ├── analyze.ts               # 얼굴/체형 분석 텍스트 생성
│       ├── daily-style-cron.ts      # 매일 7AM 스타일 이메일
│       ├── daily-style.ts           # 오늘의 스타일 조회
│       ├── create-checkout.ts       # 결제 세션 생성
│       ├── polar-webhook.ts         # 결제 웹훅
│       ├── subscribe.ts / subscription-status.ts / cancel-subscription.ts
│       ├── referral.ts              # 추천 시스템
│       ├── send-report.ts / send-payment-email.ts
│       └── ... (기타)
│   └── lib/
│       ├── openai-image.ts          # OpenAI 이미지 생성 — 변경 금지
│       ├── gemini-image.ts          # Gemini 이미지 생성 — 변경 금지
│       ├── daily-style-scenarios.ts # 날씨 기반 시나리오 — 변경 금지
│       ├── stylist-prompts.ts       # 스타일 프롬프트 — 변경 금지
│       └── cors.ts / errors.ts / validation.ts
├── public/
├── supabase/migrations/
├── wrangler.toml
└── CLAUDE.md
```

### 프론트엔드 라우팅
URL 해시 기반: `#landing`, `#input`, `#loading`, `#result`, `#preview`, `#login`, `#signup`, `#profile`, `#subscription-dashboard`

### 핵심 localStorage 키 (변경/삭제 금지)
```
stylist_free_trial_count, stylist_subscription_active, stylist_first_visit_timer,
stylist_referral_code, pendingAnalysisFlag, productType, paidCustomer, lastCheckoutId
```

### 현재 결제 상품
| 상품 | 가격 | Polar Product ID |
|------|------|------------------|
| Full Style Package | $4.99 | 533aed39-303f-4746-afb0-d150aa294f64 |
| Daily Style 구독 | $6.99/월 (7일 무료체험) | 2c761310-373e-4017-8141-8532748713c0 |

### 현재 유저 플로우
```
랜딩 → 사진 업로드 → 로딩(분석+이미지생성) → 결과 or 프리뷰(페이월)
무료 3회: 전체 결과 공개
4회차부터: 프리뷰 페이지 (1장 공개, 나머지 블러) → $4.99 결제 → 결과
```

---

## 1. 진단 — 왜 돈이 안 되는가

### 근본 원인: 무료에서 이미 만족이 끝남

- 무료 3회 동안 텍스트 분석 + AI 아웃핏 **전부** 보여줌
- 3번 써보면 만족 끝, 4번째에 $4.99 내라고 하면 → 이탈
- $4.99도 너무 싸서 "별거 아닌 서비스" 인상
- 1회성 제품이라 재방문/재구매 이유 없음
- 공유 메커니즘 미비 (동적 OG 없음, 공유 카드 없음)
- SEO 제로 (`site:kstylist.cc` 검색 결과 0건)

### 경쟁 환경

- Virtual try-on: Fashn.ai, Miragic, Kolors 등 무료 도구 다수 → 정면 경쟁 불가
- 퍼스널 컬러 분석: 오프라인 10-30만원, 앱은 Style DNA 정도 → 여기에 포지셔닝
- AI 스타일링 앱: Fits, Klodsy, Acloset 등은 리텐션 루프 있음 → 우리는 없음

---

## 2. 새로운 수익 전략

### 핵심 전환: "보여주되, 다 주지 마라"

AI 아웃핏 변환 품질이 좋다 → **제품이 아니라 무료/유료 경계선이 문제**.
1장 맛보기로 품질을 증명하고, 나머지를 갈구하게 만든다.

### 새로운 퍼널

```
[무료] 사진 업로드 + AI 분석 실행
  ├─ 퍼스널 컬러 텍스트 분석: 전부 공개 (시즌, 추천 색상 등)
  ├─ AI 아웃핏 이미지: 1장만 선명하게 공개
  ├─ 나머지 2~5장: 블러 처리 (현재 프리뷰와 유사)
  └─ 공유 카드: 퍼스널 컬러 결과 + 1장 이미지로 생성 → 바이럴
       │
       ▼
[유료 $9.99] "Premium Style Report" (1회 결제)
  ├─ 블러 해제: AI 아웃핏 전체 (3~6장)
  ├─ 12타입 세분화 컬러 진단 (Spring Warm → Bright Spring vs True Spring)
  ├─ 나에게 맞는 색상 30개 팔레트 (시각적 스와치)
  ├─ 피해야 할 색상 10개
  ├─ 체형별 실루엣 가이드 (텍스트+도식)
  ├─ 계절별 추천 코디
  ├─ PDF 다운로드
  └─ 이메일 리포트 전송
       │
       ▼
[업셀 $6.99/월] Daily Style 구독 (기존 상품 유지)
  └─ 결제 완료 후 결과 페이지에서만 제안
     "매일 아침 날씨 맞춤 스타일 추천 — 첫 7일 무료"
```

### 가격 정당성

| 대안 | 가격 | kstylist.cc |
|------|------|------------|
| 오프라인 퍼스널 컬러 컨설팅 | ₩100,000~300,000 | — |
| Style DNA 앱 유료 기능 | $5~15/월 | — |
| **kstylist.cc Premium Report** | **$9.99 (1회)** | 1/10~1/30 가격의 AI 대안 |

$9.99는 "저렴한 대안"이지 "비싼 앱"이 아니다. $4.99보다 $9.99가 오히려 신뢰감을 줌.

### 바뀌는 것 / 안 바뀌는 것

| 항목 | 변경 여부 | 내용 |
|------|----------|------|
| AI 모델/프롬프트 | ❌ 변경 없음 | 현행 그대로 유지 |
| 무료 체험 | ✅ 변경 | 3회 전체 공개 → 무제한 but 이미지 1장만 |
| 유료 상품 | ✅ 변경 | $4.99 → $9.99 Premium Report |
| Daily Style 구독 | ⚠️ 위치만 변경 | 가격/기능 동일, 1회 결제 후에만 노출 |
| 결제 인프라 (Polar) | ❌ 변경 없음 | 새 $9.99 상품만 Polar에 추가 |

---

## 3. 즉시 제거할 기능

> **원칙: 복잡도를 줄여 핵심에 집중**

| 기능 | 파일 | 제거 방법 | 이유 |
|------|------|----------|------|
| 7개 브랜드 변환 | `functions/api/transform-batch.ts` | export 주석처리, 404 반환 | AI 비용 과다, 유저도 7개 다 안 봄 |
| 직업별 유니폼 6종 | `stylist-prompts.ts` 내 `getWorkScenarios` | 빈 배열 반환 | 니치 너무 좁음 |
| 트렌드 스타일 5종 | `stylist-prompts.ts` 내 `getTrendScenarios` | 빈 배열 반환 | 핵심 3개(Best/Date/Daily)에 집중 |
| ja, zh, es 언어 | App.tsx 내 translations 객체 | 해당 키 삭제 + UI에서 제거 | ko/en만 유지 |
| A/B 테스트 (paywall_v1) | App.tsx 내 abPaywallVariant 관련 로직 | 분기 제거, 단일 디자인 | 트래픽 없으면 통계적 무의미 |

### 제거 시 주의사항
- `transform-batch.ts`, `stylist-prompts.ts` 파일 자체는 **삭제하지 말 것** — 주석처리 또는 빈 반환으로 비활성화
- 프론트엔드에서 해당 기능의 UI 진입점(버튼, 탭, 카드)도 함께 제거
- 기존 유저의 결제 내역/데이터는 건드리지 않음

---

## 4. 구현 태스크 (우선순위 순서)

---

### TASK 1: 무료/유료 경계선 재설계 (최우선)
**목적**: "1장 보여주고 나머지 갈구하게" 구조 만들기
**소요 예상**: 2-3일
**변경 범위**: App.tsx (프론트엔드 로직), 백엔드 변경 없음

#### 1-1. 무료 체험 로직 변경

**현재**: `freeTrialCount` 3회까지 전체 결과 공개, 4회차부터 프리뷰(블러)
**변경**: 횟수 무제한, 매번 이미지 1장만 공개 + 나머지 블러

```
변경할 로직 (App.tsx):
1. freeTrialCount 체크 제거 (또는 무시)
2. 결과 페이지 로직 변경:
   - isFullPaid === true → 전체 공개 (기존과 동일)
   - isFullPaid === false → 항상 "프리뷰 모드"
     - 텍스트 분석: 전부 공개
     - styleImages[0]: 선명하게 표시
     - styleImages[1+]: 블러 처리 + 자물쇠 아이콘 오버레이
     - "Unlock All Styles — $9.99" CTA 버튼 표시
```

**구현 가이드 (App.tsx 내 결과 렌더링 부분):**

현재 `renderResult()` 또는 이에 해당하는 함수를 찾아서 아래 로직 적용:

```tsx
// 이미지 갤러리 렌더링 — 결과 페이지
{styleImages.map((img, index) => {
  const isLocked = !isFullPaid && index > 0;

  return (
    <div key={index} className={`style-image-card ${isLocked ? 'locked' : ''}`}>
      <img
        src={img.url}
        alt={img.label}
        className={isLocked ? 'style-image-blurred' : 'style-image'}
      />
      {isLocked && (
        <div className="lock-overlay">
          <div className="lock-icon">🔒</div>
          <p className="lock-text">
            {lang === 'ko' ? '프리미엄 리포트에서 확인' : 'Available in Premium Report'}
          </p>
        </div>
      )}
    </div>
  );
})}

{/* 유료 CTA — 미결제 유저에게만 표시 */}
{!isFullPaid && (
  <div className="premium-cta-section">
    <h3 className="premium-cta-title">
      {lang === 'ko'
        ? '나머지 스타일과 상세 분석을 확인하세요'
        : 'Unlock All Styles & Full Analysis'}
    </h3>
    <p className="premium-cta-desc">
      {lang === 'ko'
        ? 'AI 아웃핏 전체 + 12타입 컬러 진단 + 체형 가이드 + PDF 리포트'
        : 'All AI outfits + 12-type color analysis + body guide + PDF report'}
    </p>
    <div className="premium-cta-price">
      <span className="price-compare">
        {lang === 'ko' ? '오프라인 컨설팅 ₩150,000+' : 'In-person consulting $100+'}
      </span>
      <span className="price-main">$9.99</span>
      <span className="price-note">
        {lang === 'ko' ? '1회 결제 · 환불 보장' : 'One-time · Money-back guarantee'}
      </span>
    </div>
    <button
      className="premium-cta-button"
      onClick={() => {
        trackEvent('premium_report_cta_clicked', {
          trigger: 'result_page',
          images_shown: 1,
          images_locked: styleImages.length - 1
        });
        handlePremiumCheckout();
      }}
    >
      {lang === 'ko' ? '프리미엄 리포트 받기 →' : 'Get Premium Report →'}
    </button>
    <p className="premium-cta-guarantee">
      {lang === 'ko'
        ? '✓ 즉시 확인 · ✓ PDF 다운로드 · ✓ 불만족 시 환불'
        : '✓ Instant access · ✓ PDF download · ✓ Satisfaction guaranteed'}
    </p>
  </div>
)}
```

**CSS 추가 (App.css):**

```css
/* 블러 이미지 + 잠금 오버레이 */
.style-image-card {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
}
.style-image-card.locked {
  cursor: pointer;
}
.style-image-blurred {
  width: 100%;
  filter: blur(20px);
  transform: scale(1.05); /* 블러 가장자리 숨기기 */
}
.lock-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(26, 26, 26, 0.3);
  backdrop-filter: blur(2px);
}
.lock-icon {
  font-size: 2rem;
  margin-bottom: 8px;
}
.lock-text {
  color: white;
  font-family: 'Manrope', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
}

/* 프리미엄 CTA 섹션 */
.premium-cta-section {
  text-align: center;
  padding: 48px 24px;
  margin: 32px 0;
  background: linear-gradient(180deg, rgba(201, 169, 98, 0.05) 0%, rgba(201, 169, 98, 0.1) 100%);
  border: 1px solid rgba(201, 169, 98, 0.2);
  border-radius: 16px;
}
.premium-cta-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.5rem;
  color: #1A1A1A;
  margin-bottom: 8px;
}
.premium-cta-desc {
  color: #4A4A4A;
  font-size: 0.9rem;
  margin-bottom: 24px;
}
.premium-cta-price {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-bottom: 20px;
}
.price-compare {
  font-size: 0.8rem;
  color: #A3A3A3;
  text-decoration: line-through;
}
.price-main {
  font-size: 2.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #c9a962, #d4af37);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.price-note {
  font-size: 0.8rem;
  color: #737373;
}
.premium-cta-button {
  background: linear-gradient(135deg, #c9a962, #d4af37);
  color: white;
  border: none;
  padding: 16px 48px;
  font-size: 1.125rem;
  font-weight: 700;
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  font-family: 'Manrope', sans-serif;
}
.premium-cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(201, 169, 98, 0.35);
}
.premium-cta-guarantee {
  margin-top: 12px;
  font-size: 0.8rem;
  color: #737373;
}
```

#### 1-2. Polar에 $9.99 상품 추가

Polar.sh 대시보드에서 새 상품 생성:
- **이름**: Premium Style Report
- **가격**: $9.99
- **유형**: 1회 결제 (One-time)
- **설명**: Full AI outfit gallery + 12-type personal color analysis + body type guide + PDF report

생성 후 Product ID를 `create-checkout.ts`에 추가.

#### 1-3. create-checkout.ts 수정

새 상품 타입 `premium_report`를 추가. 기존 `full` 타입도 하위 호환을 위해 유지하되, 프론트엔드에서 새 상품으로 유도.

```typescript
// functions/api/create-checkout.ts
// productType === 'premium_report' 분기 추가
// Polar Product ID: [새로 생성한 $9.99 상품 ID]
// successUrl: /?payment=success&type=premium_report&checkout_id={CHECKOUT_ID}
```

#### 1-4. 결제 후 복원 로직 수정

현재 `/?payment=success&type=full` 로직을 `type=premium_report`도 처리하도록 확장.
`isFullPaid = true` 설정하는 기존 로직은 그대로 활용.

---

### TASK 2: 프리미엄 리포트 콘텐츠 생성 (PDF)
**목적**: $9.99의 가치를 체감하게 만드는 리포트
**소요 예상**: 2-3일
**변경 범위**: 새 API 엔드포인트 + 프론트엔드 PDF 생성

#### 2-1. 리포트에 포함할 콘텐츠

```
1페이지: 커버
  - "Your Personal Style Report"
  - 유저 이름 (선택), 날짜
  - kstylist.cc 브랜딩

2페이지: 퍼스널 컬러 진단
  - 4계절 중 어디인지 (현재 analyze.ts가 이미 생성)
  - 12타입 세분화 (추가 텍스트 생성 필요)
    예: "Autumn Warm" → "True Autumn" vs "Soft Autumn" vs "Deep Autumn"
  - 추천 컬러 팔레트 30개 (시각적 스와치 그리드)
  - 피해야 할 컬러 10개

3페이지: 체형 분석
  - 체형 유형 (현재 analyze.ts가 이미 생성)
  - 체형별 추천 실루엣 전략
  - 강조할 부분 / 밸런스 잡을 부분

4페이지: AI 아웃핏 갤러리
  - 생성된 AI 이미지 전체 (3~6장)
  - 각 이미지별 스타일 설명

5페이지: 계절별 추천 코디 가이드
  - 봄/여름/가을/겨울 각 2-3줄 코디 팁
  - 유저의 퍼스널 컬러에 맞춤

마지막: CTA
  - "매일 아침 맞춤 스타일 받기 — Daily Style 구독"
  - kstylist.cc 링크
```

#### 2-2. 12타입 세분화 로직

`/api/analyze.ts` 또는 새 엔드포인트에서, 기존 4계절 결과를 12타입으로 세분화하는 추가 AI 호출:

```typescript
// 12타입 세분화 프롬프트 (텍스트 전용, 비용 저렴)
const subtypePrompt = `
Based on the following personal color analysis:
- Season: ${season} (e.g., "Autumn Warm")
- Skin undertone: ${undertone}
- Contrast level: ${contrast}

Determine the specific 12-type subtype:
- Spring: Bright Spring, True Spring, Light Spring
- Summer: Light Summer, True Summer, Soft Summer
- Autumn: Soft Autumn, True Autumn, Deep Autumn
- Winter: Deep Winter, True Winter, Bright Winter

Return JSON: {
  "subtype": "True Autumn",
  "description": "2-3 sentences explaining why",
  "bestColors": ["#hex1", "#hex2", ... 30 colors],
  "avoidColors": ["#hex1", "#hex2", ... 10 colors],
  "seasonalTips": {
    "spring": "2-3줄 코디 팁",
    "summer": "...",
    "autumn": "...",
    "winter": "..."
  }
}
`;

// GPT-4o-mini 또는 Gemini Flash로 호출 (텍스트 전용 = 비용 최소)
```

#### 2-3. PDF 생성

**프론트엔드에서 생성 (서버 부하 없음):**

브라우저에서 html2canvas + jsPDF 조합, 또는 React-PDF로 생성.

```typescript
// 필요한 패키지
// npm install jspdf html2canvas
// 또는 npm install @react-pdf/renderer

// 결과 페이지에서 "PDF 다운로드" 버튼 클릭 시:
async function downloadPremiumReport() {
  trackEvent('premium_report_downloaded', { format: 'pdf' });

  // html2canvas로 각 섹션을 캡처 → jsPDF로 합치기
  // 또는 서버사이드에서 HTML → PDF 변환

  // 간단한 접근: 브라우저 print 스타일시트 + window.print()
  // 더 나은 접근: jsPDF로 커스텀 레이아웃
}
```

**대안 (더 간단):** 서버에서 HTML 리포트를 생성하고 `/api/send-report.ts`로 이메일 전송. 기존에 이메일 리포트 전송 기능이 있으므로, 이를 확장하여 더 풍부한 HTML 리포트로 만드는 것이 빠를 수 있음.

---

### TASK 3: 공유 카드 + 동적 OG 이미지 (바이럴 엔진)
**목적**: 무료 분석 결과가 소셜에서 퍼지게 만들기
**소요 예상**: 3일

#### 3-1. 공유 카드 생성 (Canvas API, 프론트엔드)

무료 유저도 공유 카드를 생성할 수 있어야 한다. 이것이 바이럴의 핵심.

```typescript
// src/lib/shareCard.ts

export async function generateShareCard(data: {
  season: string;        // "Autumn Warm"
  subtype?: string;      // "True Autumn" (유료만)
  palette: string[];     // ["#CD853F", "#8B4513", ...] (6-8개)
  bodyType: string;      // "Hourglass"
  previewImage?: string; // 무료 1장 이미지 URL (base64)
  format: 'story' | 'og';
}): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // 인스타 스토리: 1080×1920, OG: 1200×628
  if (data.format === 'story') {
    canvas.width = 1080;
    canvas.height = 1920;
  } else {
    canvas.width = 1200;
    canvas.height = 628;
  }

  // 배경 (크림)
  ctx.fillStyle = '#FAFAF8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 상단 골드 악센트 라인
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, '#c9a962');
  gradient.addColorStop(1, '#d4af37');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, 4);

  // "My Personal Color" 타이틀
  ctx.fillStyle = '#4A4A4A';
  ctx.font = '600 28px Manrope, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('My Personal Color Season', canvas.width / 2, 80);

  // 시즌 명칭 (큰 글씨, 골드)
  ctx.font = 'italic 700 52px Playfair Display, serif';
  ctx.fillStyle = '#c9a962';
  ctx.fillText(data.season, canvas.width / 2, 150);

  // 컬러 팔레트 스와치 (원형)
  const swatchY = data.format === 'story' ? 250 : 220;
  const swatchSize = 48;
  const gap = 16;
  const totalWidth = data.palette.length * (swatchSize + gap) - gap;
  const startX = (canvas.width - totalWidth) / 2;

  data.palette.forEach((color, i) => {
    ctx.beginPath();
    ctx.arc(startX + i * (swatchSize + gap) + swatchSize/2, swatchY, swatchSize/2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#E5E5E5';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // AI 아웃핏 미리보기 (무료 1장, 있으면)
  if (data.previewImage) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.src = data.previewImage!;
    });
    const imgY = data.format === 'story' ? 320 : 280;
    const imgH = data.format === 'story' ? 1200 : 260;
    const imgW = imgH * (img.width / img.height);
    ctx.drawImage(img, (canvas.width - imgW) / 2, imgY, imgW, imgH);
  }

  // 하단 CTA
  const ctaY = data.format === 'story' ? 1800 : 580;
  ctx.fillStyle = '#737373';
  ctx.font = '500 22px Manrope, sans-serif';
  ctx.fillText('Discover your personal color', canvas.width / 2, ctaY);
  ctx.fillStyle = '#c9a962';
  ctx.font = '700 24px Manrope, sans-serif';
  ctx.fillText('kstylist.cc', canvas.width / 2, ctaY + 36);

  return new Promise(resolve => canvas.toBlob(resolve!, 'image/png'));
}
```

#### 3-2. 공유 버튼 UI (결과 페이지에 추가)

무료 결과 페이지와 유료 결과 페이지 모두에 배치:

```tsx
<div className="share-section">
  <h4>{lang === 'ko' ? '결과 공유하기' : 'Share Your Results'}</h4>
  <div className="share-buttons">
    <button onClick={() => handleShare('download')} className="share-btn">
      {lang === 'ko' ? '이미지 저장' : 'Save Image'}
    </button>
    <button onClick={() => handleShare('twitter')} className="share-btn">
      X / Twitter
    </button>
    <button onClick={() => handleShare('kakao')} className="share-btn">
      KakaoTalk
    </button>
    <button onClick={() => handleShare('copy')} className="share-btn">
      {lang === 'ko' ? '링크 복사' : 'Copy Link'}
    </button>
  </div>
</div>
```

#### 3-3. Supabase shared_results 테이블

```sql
CREATE TABLE public.shared_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  season text NOT NULL,
  palette jsonb NOT NULL,
  body_type text,
  preview_image_url text,      -- R2에 저장된 1장 이미지
  share_image_url text,        -- 생성된 공유 카드 이미지 URL
  view_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.shared_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shared results" ON public.shared_results
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users create shared results" ON public.shared_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### 3-4. Cloudflare Worker 동적 OG 이미지

공유 URL: `https://kstylist.cc/share/[RESULT_ID]`

```typescript
// functions/share/[id].ts

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
}

const CRAWLERS = [
  'twitterbot', 'facebookexternalhit', 'linkedinbot',
  'slackbot', 'kakaotalk', 'telegrambot', 'whatsapp',
  'googlebot', 'bingbot', 'yandex', 'baiduspider', 'discordbot'
];

function isCrawler(ua: string): boolean {
  const lower = ua.toLowerCase();
  return CRAWLERS.some(bot => lower.includes(bot));
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { id } = context.params;
  const ua = context.request.headers.get('user-agent') || '';

  if (!isCrawler(ua)) {
    return Response.redirect(`https://kstylist.cc/#result?share=${id}`, 302);
  }

  try {
    const res = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/shared_results?id=eq.${id}&select=*`,
      {
        headers: {
          'apikey': context.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`
        }
      }
    );
    const [result] = await res.json();

    if (!result) {
      return Response.redirect('https://kstylist.cc', 302);
    }

    const ogImage = result.share_image_url || 'https://kstylist.cc/og-default.png';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>My Personal Color: ${result.season} | Stylist Studio</title>
  <meta property="og:title" content="My Personal Color is ${result.season}">
  <meta property="og:description" content="I discovered my personal color season with AI! Find yours in 30 seconds.">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="628">
  <meta property="og:url" content="https://kstylist.cc/share/${id}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="My Personal Color is ${result.season}">
  <meta name="twitter:description" content="Discover your personal color season with AI →">
  <meta name="twitter:image" content="${ogImage}">
</head>
<body>
  <script>window.location.href="https://kstylist.cc/#landing?ref_share=${id}";</script>
</body>
</html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  } catch {
    return Response.redirect('https://kstylist.cc', 302);
  }
};
```

---

### TASK 4: 랜딩 페이지 히어로 개선
**목적**: 방문 3초 내 가치 전달 + "무료"임을 강조
**소요 예상**: 1-2일

#### 변경 후 히어로 구조

```
[히어로 섹션]

메인 헤드라인:
  ko: "사진 한 장으로 퍼스널 컬러 진단"
  en: "Discover Your Perfect Colors"

서브 헤드라인:
  ko: "AI가 분석하는 나만의 컬러 시즌, 추천 색상, 스타일 가이드"
  en: "AI-powered personal color season, palette, and style guide"

CTA 버튼 (크게, 골드):
  ko: "무료로 진단받기 →"
  en: "Get Free Analysis →"

신뢰 시그널 (CTA 아래):
  "✓ 완전 무료  ✓ 30초  ✓ AI 아웃핏 미리보기 포함"

오른쪽/하단: Before/After 슬라이더 또는 결과 카드 프리뷰
```

**App.tsx에서 현재 히어로 섹션을 찾아 교체.** 디자인 톤은 Platinum Editorial 유지:
- 배경: 크림 `#FAFAF8`
- 헤딩: `Playfair Display`, `#1A1A1A`
- CTA: 골드 그라데이션 `#c9a962 → #d4af37`
- 흰색 텍스트 금지 (배경이 크림)

---

### TASK 5: 랜딩 페이지 간소화
**목적**: 전환율 최적화 — 스크롤 줄이고 CTA로 빠르게
**소요 예상**: 1일

#### 현재 ~9개 섹션 → 5개로 축소

```
1. 히어로 (TASK 4)
2. How It Works — 3단계 ("Upload → AI Analyzes → Your Colors")
3. Before/After 갤러리 — 3-4개 예시 (기존 에셋 활용)
4. 소셜 증명 — 리뷰/후기 (초기에는 구성 데이터 OK)
5. 가격 & CTA — Premium Report $9.99 + Daily Style $6.99/월
```

**삭제할 섹션:**
- 마키 티커 (불필요한 장식)
- 중복 Trust Signals (히어로 아래에 이미 있음)
- 다중 서비스 카드 (하나의 명확한 퍼널로)
- 과도한 설명 섹션

---

### TASK 6: Daily Style 구독 진입점 변경
**목적**: 1회 결제 후 업셀로만 제안
**소요 예상**: 반나절

#### 변경 사항

| 현재 | 변경 후 |
|------|---------|
| 랜딩 페이지에서 직접 구독 CTA | 랜딩에서 제거 (또는 매우 작게) |
| 독립 진입점 | Premium Report 결제 완료 후 결과 페이지에서만 제안 |

**결과 페이지 (isFullPaid === true) 하단에 추가:**

```tsx
{isFullPaid && !isSubscribed && (
  <div className="daily-style-upsell">
    <h3>{lang === 'ko' ? '매일 아침 맞춤 스타일 받기' : 'Get Daily Style Recommendations'}</h3>
    <p>
      {lang === 'ko'
        ? '날씨와 내 퍼스널 컬러에 맞는 오늘의 코디를 매일 아침 이메일로 받아보세요.'
        : 'Receive weather-matched outfit recommendations based on your personal colors every morning.'}
    </p>
    <p className="daily-price">
      $6.99/mo · {lang === 'ko' ? '첫 7일 무료' : 'First 7 days free'}
    </p>
    <button
      className="daily-style-cta"
      onClick={() => {
        trackEvent('daily_style_upsell_clicked', { trigger: 'after_premium_purchase' });
        // 기존 구독 플로우로 이동
      }}
    >
      {lang === 'ko' ? '7일 무료 체험 시작 →' : 'Start 7-Day Free Trial →'}
    </button>
  </div>
)}
```

---

### TASK 7: SEO 기초
**목적**: 무료 유입 채널 확보
**소요 예상**: 2-3일

#### 7-1. index.html 메타태그 개선

```html
<title>Personal Color Analysis by AI | Discover Your Color Season | Stylist Studio</title>
<meta name="description" content="Free AI-powered personal color analysis. Upload one photo to discover your color season, best colors, body type, and personalized style recommendations. Instant results.">
<meta property="og:title" content="Discover Your Personal Color Season | Free AI Analysis">
<meta property="og:description" content="Upload one photo. Get your personal color season, color palette, and AI styling in 30 seconds. Free.">
<meta property="og:image" content="https://kstylist.cc/og-default.png">
```

#### 7-2. 블로그 페이지 (정적 HTML, SPA 외부)

`public/blog/` 디렉토리에 정적 HTML 파일 추가 (크롤러가 읽을 수 있도록):

```
/blog/personal-color-analysis-guide.html  → "퍼스널 컬러 분석 가이드"
/blog/spring-warm-colors.html             → "봄 웜톤 색상과 코디"
/blog/summer-cool-colors.html             → "여름 쿨톤 색상과 코디"
/blog/autumn-warm-colors.html             → "가을 웜톤 색상과 코디"
/blog/winter-cool-colors.html             → "겨울 쿨톤 색상과 코디"
```

각 페이지에 "무료로 내 퍼스널 컬러 진단받기 →" CTA 포함.

#### 7-3. sitemap.xml + robots.txt

```xml
<!-- public/sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://kstylist.cc/</loc><priority>1.0</priority></url>
  <url><loc>https://kstylist.cc/blog/personal-color-analysis-guide.html</loc></url>
  <url><loc>https://kstylist.cc/blog/spring-warm-colors.html</loc></url>
  <url><loc>https://kstylist.cc/blog/summer-cool-colors.html</loc></url>
  <url><loc>https://kstylist.cc/blog/autumn-warm-colors.html</loc></url>
  <url><loc>https://kstylist.cc/blog/winter-cool-colors.html</loc></url>
</urlset>
```

```
# public/robots.txt
User-agent: *
Allow: /
Sitemap: https://kstylist.cc/sitemap.xml
```

---

## 5. 하지 말아야 할 것

| 하지 말 것 | 이유 |
|-----------|------|
| AI 모델/프롬프트 변경 | 성능 격차 심함. 현행 유지 필수 |
| AI 모델 우선순위 변경 | OpenAI 1순위 유지 — 품질이 핵심 자산 |
| App.tsx 전면 리팩토링 | 트래픽 0에서 구조 개선은 성장 기여 없음 |
| SSR 마이그레이션 | Worker OG로 크롤러 대응 가능 |
| 추가 언어 (3개국어 이상) | MAU 1만 이후에 |
| 구독 모델 복잡화 (크레딧 시스템 등) | 1회 결제로 먼저 PMF 증명 |
| 커머스/어필리에이트 | 나중에. 지금은 핵심 퍼널에 집중 |
| 네이티브 앱 | PWA로 충분 |

---

## 6. 성공 지표

| 지표 | 현재 추정 | 1개월 목표 | 3개월 목표 |
|------|----------|-----------|-----------|
| 일일 무료 분석 완료 수 | ~0 | 30+ | 200+ |
| 무료 → $9.99 결제 전환율 | 0% | 3%+ | 5%+ |
| 공유 카드 생성 수 | 0 | 5+/일 | 30+/일 |
| 공유 → 신규 방문 전환 | 0% | 10%+ | 20%+ |
| $9.99 → Daily Style 업셀 전환 | — | 10%+ | 15%+ |
| MRR | ~₩0 | ₩30만+ | ₩200만+ |

### 필수 Analytics 이벤트

```typescript
// 퍼널 측정 이벤트 — 모든 구현에 반드시 포함
trackEvent('landing_view', {});
trackEvent('hero_cta_clicked', {});
trackEvent('photo_uploaded', {});
trackEvent('analysis_completed', { season, body_type }); // 무료 분석 완료
trackEvent('free_result_viewed', { images_shown: 1, images_locked: N });
trackEvent('share_card_generated', { platform });
trackEvent('share_completed', { platform });
trackEvent('premium_cta_viewed', { trigger: 'result_page' });
trackEvent('premium_cta_clicked', { price: 9.99 });
trackEvent('premium_checkout_started', {});
trackEvent('premium_purchase_completed', { price: 9.99 });
trackEvent('premium_result_viewed', { images_total: N });
trackEvent('pdf_downloaded', {});
trackEvent('daily_style_upsell_viewed', {});
trackEvent('daily_style_upsell_clicked', {});
trackEvent('og_share_viewed', { result_id }); // Worker에서 발생
```

---

## 7. 실행 순서 체크리스트

### Phase A: Week 1 (Day 1-7)
- [ ] 기능 제거: 브랜드 변환, 직업별, 트렌드 시나리오 비활성화
- [ ] 기능 제거: ja/zh/es 언어 제거 (ko/en만)
- [ ] 기능 제거: A/B 테스트 로직 제거
- [ ] **TASK 1**: 무료/유료 경계선 재설계 (이미지 1장 공개 + 나머지 블러)
- [ ] **TASK 1**: Polar에 $9.99 Premium Report 상품 추가
- [ ] **TASK 4**: 랜딩 히어로 교체

### Phase B: Week 2 (Day 8-14)
- [ ] **TASK 2**: 12타입 세분화 텍스트 생성 로직
- [ ] **TASK 2**: 프리미엄 리포트 결과 페이지 (전체 이미지 + 상세 분석)
- [ ] **TASK 2**: PDF 다운로드 기능
- [ ] **TASK 5**: 랜딩 9섹션 → 5섹션 간소화
- [ ] **TASK 6**: Daily Style 진입점 변경 (결제 후에만 노출)

### Phase C: Week 3 (Day 15-21)
- [ ] **TASK 3**: 공유 카드 Canvas API 구현
- [ ] **TASK 3**: shared_results 테이블 + 공유 URL 저장
- [ ] **TASK 3**: Cloudflare Worker OG 이미지 (`functions/share/[id].ts`)
- [ ] **TASK 3**: 결과 페이지에 공유 버튼 UI 추가

### Phase D: Week 4 (Day 22-30)
- [ ] **TASK 7**: index.html 메타태그 개선
- [ ] **TASK 7**: 블로그 정적 페이지 3-5개
- [ ] **TASK 7**: sitemap.xml + robots.txt
- [ ] 레퍼럴 인센티브 강화 (추천인 → 무료 이미지 +1장 공개)
- [ ] 전체 퍼널 데이터 수집 + 첫 주간 Growth Report 작성

---

## 8. 디자인 톤 규칙 (코드 작성 시 참고)

**"Platinum Editorial"** — 럭셔리 에디토리얼 톤 유지.

| 요소 | 값 |
|------|-----|
| 배경 | `#FAFAF8` (크림, 순백 아님) |
| 본문 텍스트 | `#1A1A1A` (차콜) |
| 보조 텍스트 | `#4A4A4A` |
| 골드 악센트 | `#c9a962` → `#d4af37` 그라데이션 |
| CTA 버튼 | 골드 그라데이션 배경, 흰색 텍스트 |
| 헤딩 폰트 | `Playfair Display` (Serif) |
| 본문 폰트 | `Manrope` (Sans-serif) |
| 이모지 | UI에 사용 금지 (럭셔리 톤) |
| 흰색 텍스트 | 어두운 오버레이/배경 위에서만 |
| 카드 호버 | 골드 글로우 + 상단 골드 액센트 라인 |

---

## 9. 환경 변수 (변경 없음)

```
OPENAI_API_KEY, GEMINI_API_KEY, POLAR_API_KEY, POLAR_WEBHOOK_SECRET,
RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY,
OPENWEATHER_API_KEY, CRON_SECRET
R2 바인딩: PHOTOS_BUCKET, DAILY_IMAGES_BUCKET
```

---

## 10. 핵심 원칙 3줄 요약

1. **"보여주되, 다 주지 마라."** 무료로 1장 보여줘서 품질을 증명하고, 나머지를 $9.99에 판다.
2. **AI 모델은 건드리지 마라.** 이미지 품질이 유일한 차별점이자 핵심 자산이다.
3. **공유가 곧 마케팅이다.** 퍼스널 컬러 결과 카드가 인스타/X에서 퍼져야 유저가 들어온다.
