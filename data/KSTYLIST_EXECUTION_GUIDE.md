# kstylist.cc 전면 개선 실행 가이드
## For Claude AI Agent — 읽고 즉시 실행할 것

> **문서 목적**: 이 문서는 kstylist.cc 코드베이스에 접근하는 Claude AI 에이전트가 읽고, 우선순위대로 구현을 실행하기 위한 상세 지침이다.
> **최종 갱신**: 2026-03-18
> **작성자**: Project Instinct 100B 공동 아키텍트

---

## 0. 현재 상태 요약 (Context)

### 서비스 개요
- **서비스명**: Stylist Studio (kstylist.cc)
- **핵심 기능**: AI 기반 퍼스널 스타일링 — 사진 1장으로 패션 아웃핏 변환
- **프론트엔드**: React 19 SPA, 모노리스 App.tsx (~7,500줄) + App.css (~6,500줄)
- **백엔드**: Cloudflare Pages Functions (Workers)
- **DB**: Supabase (PostgreSQL + Auth)
- **스토리지**: Cloudflare R2 (stylist-photos, stylist-daily-images)
- **결제**: Polar.sh (Stripe 기반)
- **AI**: OpenAI gpt-image-1.5 → Gemini 3 Pro → Gemini 2.5 Flash (3단 폴백)
- **배포**: Cloudflare Pages
- **도메인**: https://kstylist.cc/

### 수익 모델 (현재)
| 상품 | 가격 | 유형 |
|------|------|------|
| Full Style Package | $4.99 | 1회 결제 |
| Daily Style | $6.99/월 | 구독 (7일 무료체험) |
| 무료 체험 | 0 | 브라우저당 3회 (localStorage) |

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
│       ├── generate-styles.ts       # 패션 스타일 생성 (6개 시나리오)
│       ├── transform-batch.ts       # 브랜드 패션 변환 (7개 브랜드)
│       ├── analyze.ts               # 얼굴/체형 분석
│       ├── daily-style-cron.ts      # 매일 7AM 스타일 이메일
│       ├── daily-style.ts           # 오늘의 스타일 조회
│       ├── create-checkout.ts       # 결제
│       ├── polar-webhook.ts         # 웹훅
│       ├── subscribe.ts / subscription-status.ts / cancel-subscription.ts
│       ├── referral.ts              # 추천 시스템
│       ├── send-report.ts / send-payment-email.ts
│       └── ... (기타)
│   └── lib/
│       ├── openai-image.ts          # OpenAI 이미지 생성
│       ├── gemini-image.ts          # Gemini 이미지 생성 (폴백)
│       ├── daily-style-scenarios.ts # 날씨 기반 시나리오
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

---

## 1. 진단 결과 — 왜 수익이 안 나는가

### 치명적 문제 5가지

**문제 1: 1회성 제품 구조 → 리텐션 제로**
- $4.99 Full Package: 사진 넣고 → 결과 보고 → 끝. 재방문 이유 없음
- D7 리텐션은 사실상 0에 가까울 것으로 추정
- 경쟁사(Fits, Klodsy, Acloset)는 디지털 옷장, 소셜 피드, 데일리 추천으로 리텐션 루프 운영 중

**문제 2: SEO 완전 부재**
- `site:kstylist.cc` 검색 결과 0건
- CSR SPA라서 크롤러가 콘텐츠를 읽지 못함
- 무료 유입 채널이 완전히 차단된 상태

**문제 3: 바이럴 메커니즘 미작동**
- CSR이라 공유 시 동적 OG 이미지 없음 → 소셜 미디어에 공유해도 일반 메타태그만 표시
- 공유 카드가 "나도 해보고 싶다"를 유발하지 않음
- 레퍼럴 코드(6자리)를 공유할 동기 부족

**문제 4: 시장 포지셔닝 부재**
- "AI가 옷을 입혀준다"는 Fashn.ai, Miragic, Kolors 같은 무료 virtual try-on과 직접 경쟁
- 이들은 이미 무료이고, 기술적으로 더 성숙함
- kstylist.cc만의 차별점이 명확하지 않음

**문제 5: AI 비용이 수익을 잡아먹을 가능성**
- OpenAI gpt-image-1.5 호출 1회 비용 + 3~6개 이미지 = $4.99에서 마진이 거의 없거나 적자
- Daily Style 구독은 매일 AI 이미지 생성 → $6.99/월로 비용 감당 불가능할 수 있음

---

## 2. 전략적 방향 전환

### 핵심 피벗: "옷 갈아입히기 도구" → "퍼스널 컬러 진단 플랫폼"

**이유:**
- "AI virtual try-on" 시장은 Fashn, Miragic, Kolors 등 무료 도구가 장악 중. 정면 경쟁 불가
- "퍼스널 컬러 분석" 시장은 전문 앱이 Style DNA 정도뿐이고, 오프라인 컨설팅은 비쌈 (10-30만원)
- kstylist.cc는 이미 4계절 퍼스널 컬러 분석 + 체형 분석 로직을 보유 중
- "내 퍼스널 컬러는 Autumn Warm이래!" 같은 결과는 자연스럽게 공유됨

### 새로운 퍼널 구조
```
[무료] 퍼스널 컬러 + 체형 분석 (텍스트 기반, AI 비용 최소)
  → 결과 카드 생성 + 공유 (바이럴 엔진)
  → "이 컬러로 아웃핏을 입어보세요" CTA
    → [유료] AI 아웃핏 변환 (구독 $4.99~6.99/월, 월 N회)
    → [유료] Daily Style (날씨 + 컬러 맞춤 일일 추천)
  → [장기] 쇼핑몰 어필리에이트 (퍼스널 컬러에 맞는 상품 추천)
```

### 새로운 수익 모델
| 상품 | 가격 | 내용 |
|------|------|------|
| 퍼스널 컬러 분석 | 무료 (무제한) | 텍스트 기반 컬러/체형 진단 + 공유 카드 |
| Style Pro | $4.99/월 | AI 아웃핏 변환 5회/월 + Daily Style |
| Style Unlimited | $9.99/월 | 무제한 변환 + 프리미엄 브랜드 스타일링 |
| 쇼핑 추천 | 어필리에이트 커미션 | 퍼스널 컬러 맞춤 상품 추천 (장기) |

---

## 3. 즉시 제거할 기능 (복잡도 감소)

> **원칙: 기능을 줄여야 핵심이 날카로워진다**

### 제거 대상

| 기능 | 파일 | 제거 이유 |
|------|------|----------|
| 7개 브랜드 변환 | `functions/api/transform-batch.ts` | AI 비용 대비 수익 불균형. 유저도 7개 다 안 봄 |
| 직업별 유니폼 6종 | `functions/lib/stylist-prompts.ts` 내 `getWorkScenarios` | 니치가 너무 좁음, 실제 수요 미미 |
| ja, zh, es 언어 | App.tsx 내 번역 객체 | 트래픽 0 상태에서 5개국어는 유지보수만 늘림. ko/en만 유지 |
| A/B 테스트 (paywall_v1) | App.tsx 내 abPaywallVariant 관련 로직 | 트래픽 없으면 통계적 무의미. Variant B(타이머)로 단일화하거나 제거 |
| 트렌드 스타일 5종 | `functions/lib/stylist-prompts.ts` 내 `getTrendScenarios` | Phase 1에서는 핵심 3개 시나리오(Best/Date/Daily)에 집중 |

### 제거 실행 방법

1. `transform-batch.ts`: 파일 전체 비활성화 (삭제하지 말고 export를 주석처리하거나 404 반환)
2. `stylist-prompts.ts`: `getWorkScenarios`, `getTrendScenarios` 함수를 빈 배열 반환으로 변경
3. App.tsx 내 번역: `ja`, `zh`, `es` 키를 translations 객체에서 제거. 언어 선택 UI에서도 제거
4. A/B 테스트: `abPaywallVariant` 관련 분기 제거, 하나의 페이월 디자인으로 통일
5. 프론트엔드에서 브랜드 변환/직업별/트렌드 UI 진입점 제거

---

## 4. 구현 태스크 (우선순위 순서)

### TASK 1: 퍼스널 컬러 분석 무료화 + 공유 카드 (최우선)
**목적**: 바이럴 씨앗 만들기. 유입 장벽 완전 제거.
**소요 예상**: 2-3일

#### 1-1. 무료 분석 범위 변경

**현재**: 브라우저당 3회 무료 → 이후 $4.99
**변경**: 퍼스널 컬러 + 체형 **텍스트 분석**은 완전 무료 (무제한). AI **이미지 변환**만 유료.

**구현 포인트 (App.tsx):**
- `freeTrialCount` 체크 로직 수정: `/api/analyze` (텍스트 분석)은 카운트 차감 없이 항상 허용
- 카운트 차감은 `/api/generate-styles` (이미지 생성) 호출 시에만 적용
- 결과 페이지 분리: "무료 분석 결과" 뷰와 "유료 이미지 결과" 뷰
- 무료 분석 결과에 "AI로 이 스타일을 입어보세요 →" CTA 삽입

**무료 분석 결과 페이지에 표시할 것:**
```
- 퍼스널 컬러 시즌 (Spring Warm / Summer Cool / Autumn Warm / Winter Cool)
- 퍼스널 컬러 팔레트 (추천 컬러 6-8개, 시각적 스와치)
- 체형 분석 (역삼각/직사각/모래시계/삼각/라운드)
- 체형별 추천 실루엣
- 추천 색상 vs 피해야 할 색상
- [유료 CTA] "이 컬러로 나만의 아웃핏을 만들어보세요"
```

#### 1-2. 공유 카드 생성

**결과 페이지에 "결과 공유" 버튼 추가. Canvas API로 공유용 이미지 자동 생성.**

공유 카드 디자인 스펙:
```
크기: 1080×1920 (인스타 스토리용 9:16) + 1200×628 (OG/트위터용)
내용:
  - 상단: "My Personal Color is..." 텍스트
  - 중앙: 컬러 시즌 명칭 + 추천 컬러 팔레트 스와치 (시각적으로 예쁘게)
  - 하단: "Discover your personal color → kstylist.cc" + QR코드 또는 짧은 URL
  - 배경: 브랜드 컬러 (Platinum Editorial 톤)
디자인 톤: 럭셔리 에디토리얼 — Gold accent(#c9a962), 크림 배경(#FAFAF8), Playfair Display + Manrope
```

**Canvas API 구현 (프론트엔드):**
```typescript
// src/lib/shareCard.ts
export async function generateShareCard(data: {
  season: string;        // "Autumn Warm"
  palette: string[];     // ["#CD853F", "#8B4513", ...]
  bodyType: string;      // "Hourglass"
  userName?: string;
  format: '9:16' | 'og'; // 인스타 스토리 vs OG
}): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  if (data.format === '9:16') {
    canvas.width = 1080;
    canvas.height = 1920;
  } else {
    canvas.width = 1200;
    canvas.height = 628;
  }

  // 배경 (크림)
  ctx.fillStyle = '#FAFAF8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 골드 악센트 라인 (상단)
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, '#c9a962');
  gradient.addColorStop(1, '#d4af37');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, 4);

  // "My Personal Color" 타이틀
  ctx.fillStyle = '#1A1A1A';
  ctx.font = '600 32px Manrope, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('My Personal Color', canvas.width / 2, 120);

  // 시즌 명칭 (큰 글씨)
  ctx.font = 'italic 700 56px "Playfair Display", serif';
  ctx.fillStyle = '#c9a962';
  ctx.fillText(data.season, canvas.width / 2, 200);

  // 컬러 팔레트 스와치 (원형 6-8개)
  const swatchY = data.format === '9:16' ? 350 : 280;
  const swatchSize = 60;
  const gap = 20;
  const totalWidth = data.palette.length * (swatchSize + gap) - gap;
  let startX = (canvas.width - totalWidth) / 2;

  data.palette.forEach((color, i) => {
    ctx.beginPath();
    ctx.arc(startX + i * (swatchSize + gap) + swatchSize/2, swatchY, swatchSize/2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#E5E5E5';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // CTA
  ctx.fillStyle = '#4A4A4A';
  ctx.font = '500 24px Manrope, sans-serif';
  const ctaY = data.format === '9:16' ? 1800 : 560;
  ctx.fillText('Discover your personal color → kstylist.cc', canvas.width / 2, ctaY);

  return new Promise(resolve => canvas.toBlob(resolve!, 'image/png'));
}
```

**공유 버튼 동작:**
```typescript
async function handleShare(platform: 'instagram' | 'kakao' | 'twitter' | 'copy') {
  trackEvent('share_initiated', { platform, content_type: 'color_analysis' });

  const blob = await generateShareCard({
    season: analysisResult.season,
    palette: analysisResult.palette,
    bodyType: analysisResult.bodyType,
    format: platform === 'instagram' ? '9:16' : 'og'
  });

  if (platform === 'copy' || platform === 'instagram') {
    // 이미지 다운로드 (인스타는 직접 공유 불가 → 저장 후 스토리에 올리기 유도)
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-personal-color-${analysisResult.season.toLowerCase().replace(' ', '-')}.png`;
    a.click();
    // 인스타 공유 가이드 모달 표시
  } else if (platform === 'twitter') {
    // X/Twitter 공유 (텍스트 + 링크)
    const text = `My personal color season is ${analysisResult.season}! ✨ Discover yours →`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent('https://kstylist.cc?ref=' + referralCode)}`);
  } else if (platform === 'kakao') {
    // 카카오 링크 API (이미 구현되어 있다면 활용)
  }

  trackEvent('share_completed', { platform, content_type: 'color_analysis' });
}
```

---

### TASK 2: Cloudflare Worker 동적 OG 이미지 (바이럴 핵심)
**목적**: 공유 링크 클릭 시 소셜 미디어에 매력적인 미리보기 표시
**소요 예상**: 2일

#### 2-1. 공유 URL 구조
```
https://kstylist.cc/share/[RESULT_ID]
```
`RESULT_ID`는 Supabase에 저장된 분석 결과의 UUID.

#### 2-2. Supabase에 공유용 테이블 추가

```sql
-- 분석 결과 공유용 테이블
CREATE TABLE public.shared_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  season text NOT NULL,           -- 'Spring Warm', 'Summer Cool', etc.
  palette jsonb NOT NULL,         -- ["#CD853F", "#8B4513", ...]
  body_type text,
  share_image_url text,           -- R2에 저장된 공유 카드 이미지 URL
  view_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.shared_results ENABLE ROW LEVEL SECURITY;

-- 누구나 공유 결과 읽기 가능 (공유 목적)
CREATE POLICY "Anyone can view shared results" ON public.shared_results
  FOR SELECT USING (true);

-- 본인만 생성 가능
CREATE POLICY "Users create own shared results" ON public.shared_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### 2-3. Cloudflare Worker OG 이미지 생성

**파일**: `functions/share/[id].ts` (또는 `functions/api/og-image.ts`)

**동작 원리:**
1. 요청 User-Agent가 크롤러(Twitterbot, facebookexternalhit, kakaotalk 등)인지 확인
2. 크롤러면 → Supabase에서 결과 조회 → Satori로 OG 이미지 생성 → HTML 메타태그 반환
3. 사람이면 → SPA 메인(`/`)으로 리다이렉트 + `?share=[RESULT_ID]` 파라미터

```typescript
// functions/share/[id].ts
interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
}

const CRAWLERS = [
  'twitterbot', 'facebookexternalhit', 'linkedinbot',
  'slackbot', 'kakaotalk', 'telegrambot', 'whatsapp',
  'googlebot', 'bingbot', 'yandex', 'baiduspider'
];

function isCrawler(ua: string): boolean {
  const lower = ua.toLowerCase();
  return CRAWLERS.some(bot => lower.includes(bot));
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { id } = context.params;
  const ua = context.request.headers.get('user-agent') || '';

  if (!isCrawler(ua)) {
    // 사람 → SPA로 리다이렉트
    return Response.redirect(`https://kstylist.cc/#result?share=${id}`, 302);
  }

  // 크롤러 → OG 메타태그 HTML 반환
  try {
    const res = await fetch(`${context.env.SUPABASE_URL}/rest/v1/shared_results?id=eq.${id}&select=*`, {
      headers: {
        'apikey': context.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`
      }
    });
    const [result] = await res.json();

    if (!result) {
      return Response.redirect('https://kstylist.cc', 302);
    }

    // OG 이미지 URL (R2에 미리 저장하거나, 별도 이미지 생성 Worker 호출)
    const ogImageUrl = result.share_image_url || `https://kstylist.cc/api/og-image?season=${encodeURIComponent(result.season)}`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>My Personal Color: ${result.season} | Stylist Studio</title>
  <meta property="og:title" content="My Personal Color is ${result.season} ✨">
  <meta property="og:description" content="I discovered my personal color season! Find yours with AI analysis.">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="628">
  <meta property="og:url" content="https://kstylist.cc/share/${id}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="My Personal Color is ${result.season} ✨">
  <meta name="twitter:description" content="Discover your personal color season with AI →">
  <meta name="twitter:image" content="${ogImageUrl}">
</head>
<body>
  <p>Redirecting to Stylist Studio...</p>
  <script>window.location.href = "https://kstylist.cc/#result?share=${id}";</script>
</body>
</html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  } catch (e) {
    return Response.redirect('https://kstylist.cc', 302);
  }
};
```

#### 2-4. wrangler.toml 라우팅 설정

Cloudflare Pages Functions에서 `/share/[id]` 경로가 SPA가 아닌 Worker로 처리되도록 확인. `functions/share/[id].ts` 위치에 파일을 두면 자동으로 라우팅됨.

---

### TASK 3: 랜딩 페이지 히어로 개선
**목적**: 방문 3초 내 가치 전달
**소요 예상**: 1-2일

#### 현재 문제
- 히어로가 "PERSONAL STYLIST | 헤어스타일 추천 & 런웨이 패션 스타일링"으로 시작 → 뭘 하는 서비스인지 3초 내 파악 불가
- Before/After가 정적 이미지 → 인터랙티브하지 않아서 호기심 유발 부족

#### 변경 후 히어로 구조

```
[히어로 섹션 — 뷰포트 100% 높이]

왼쪽 (텍스트):
  상단 배지: "AI-Powered Personal Color Analysis" (골드 배경)
  메인 헤드라인: "Discover Your Perfect Colors"
  서브 헤드라인: "사진 한 장으로 퍼스널 컬러 진단 → 나만의 스타일 발견"
  CTA 버튼: "무료 컬러 분석 시작 →" (골드 그라데이션, 크게)
  신뢰 시그널: "✓ 무료 ✓ 30초 완료 ✓ 10,000+ 분석 완료"

오른쪽 (인터랙티브 데모):
  Before/After 슬라이더 (드래그로 비교)
  또는: 퍼스널 컬러 결과 카드 애니메이션 미리보기
```

#### App.tsx 히어로 섹션 수정 가이드

현재 히어로 섹션을 찾아서 (아마 `renderLanding()` 함수 내부) 아래 구조로 교체:

```tsx
// 히어로 섹션 — renderLanding() 내부
<section className="hero-section">
  <div className="hero-content">
    <span className="hero-badge">AI-Powered Personal Color Analysis</span>
    <h1 className="hero-title">
      Discover Your<br />
      <span className="hero-title-accent">Perfect Colors</span>
    </h1>
    <p className="hero-subtitle">
      {lang === 'ko'
        ? '사진 한 장으로 퍼스널 컬러 진단. 30초면 충분합니다.'
        : 'Upload one photo. Get your personal color season in 30 seconds.'}
    </p>
    <button
      className="hero-cta"
      onClick={() => {
        trackEvent('hero_cta_clicked', { type: 'free_analysis' });
        navigateTo('input');
      }}
    >
      {lang === 'ko' ? '무료 컬러 분석 시작 →' : 'Start Free Color Analysis →'}
    </button>
    <div className="hero-trust">
      <span>✓ {lang === 'ko' ? '완전 무료' : 'Completely Free'}</span>
      <span>✓ {lang === 'ko' ? '30초 완료' : '30 Seconds'}</span>
      <span>✓ {lang === 'ko' ? '10,000+ 분석' : '10,000+ Analyzed'}</span>
    </div>
  </div>
  <div className="hero-demo">
    {/* Before/After 인터랙티브 슬라이더 또는 결과 카드 프리뷰 */}
  </div>
</section>
```

**CSS 핵심 (App.css에 추가):**
```css
.hero-section {
  min-height: 100vh;
  display: flex;
  align-items: center;
  padding: 0 24px;
  max-width: 1200px;
  margin: 0 auto;
  gap: 48px;
}
.hero-badge {
  display: inline-block;
  background: linear-gradient(135deg, #c9a962, #d4af37);
  color: white;
  padding: 6px 16px;
  border-radius: 100px;
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.hero-title {
  font-family: 'Playfair Display', serif;
  font-size: clamp(2.5rem, 5vw, 4rem);
  line-height: 1.15;
  color: #1A1A1A;
  margin: 24px 0 16px;
}
.hero-title-accent {
  background: linear-gradient(135deg, #c9a962, #d4af37);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.hero-cta {
  background: linear-gradient(135deg, #c9a962, #d4af37);
  color: white;
  border: none;
  padding: 16px 40px;
  font-size: 1.125rem;
  font-weight: 700;
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  font-family: 'Manrope', sans-serif;
}
.hero-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(201, 169, 98, 0.3);
}
.hero-trust {
  display: flex;
  gap: 20px;
  margin-top: 16px;
  font-size: 0.875rem;
  color: #4A4A4A;
}

/* 모바일 */
@media (max-width: 768px) {
  .hero-section {
    flex-direction: column;
    text-align: center;
    padding-top: 80px;
  }
  .hero-trust { justify-content: center; flex-wrap: wrap; }
}
```

---

### TASK 4: 수익 모델 전환 (1회 결제 → 구독)
**목적**: LTV 극대화, 리텐션 인센티브
**소요 예상**: 3-4일

#### 4-1. Polar.sh 상품 재구성

**기존 상품 유지 (하위 호환)** + 새 구독 상품 추가:

| 상품 | 가격 | Polar 설정 |
|------|------|-----------|
| Style Pro (신규) | $4.99/월 | 구독, 7일 무료체험 |
| Style Unlimited (신규) | $9.99/월 | 구독, 7일 무료체험 |
| Full Style Package (기존) | $4.99 | 1회 결제 — 유지하되 위치 축소 |

#### 4-2. 크레딧 시스템 도입

Supabase에 크레딧 관리 테이블 추가:

```sql
CREATE TABLE public.user_credits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) UNIQUE,
  credits_remaining integer DEFAULT 0,
  credits_monthly_limit integer DEFAULT 0,  -- 플랜별 월 한도
  plan_type text DEFAULT 'free',            -- 'free', 'pro', 'unlimited'
  last_reset_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own credits" ON public.user_credits
  FOR SELECT USING (auth.uid() = user_id);

-- 크레딧 사용 로그
CREATE TABLE public.credit_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  amount integer NOT NULL,           -- 양수: 충전, 음수: 사용
  reason text NOT NULL,              -- 'monthly_reset', 'image_generation', 'referral_bonus'
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own transactions" ON public.credit_transactions
  FOR SELECT USING (auth.uid() = user_id);
```

#### 4-3. 크레딧 차감 로직

`/api/generate-styles` 수정:
```typescript
// functions/api/generate-styles.ts 상단에 크레딧 체크 추가
// 1. 유저 크레딧 조회
// 2. credits_remaining > 0 확인
// 3. 이미지 생성 성공 후 크레딧 차감
// 4. 실패 시 크레딧 차감 안 함

// 크레딧 부족 시 페이월로 유도:
// { error: "No credits remaining", code: "CREDITS_EXHAUSTED", upgrade_url: "..." }
```

---

### TASK 5: 랜딩 페이지 구조 간소화
**목적**: 전환율 최적화
**소요 예상**: 1일

#### 현재 (9개 섹션) → 변경 후 (5개 섹션)

```
[유지] 1. 히어로 (TASK 3에서 개선)
[유지] 2. How It Works (3단계 — "Upload → AI Analyzes → Get Your Colors")
[유지] 3. Before/After 갤러리 (3-4개 예시)
[신규] 4. 소셜 증명 (트위터/인스타 임베드 형태의 유저 후기, 초기에는 가상 데이터)
[유지] 5. 가격 & CTA (구독 플랜 카드)
[삭제] 마키 티커, 중복 Trust Signals, 다중 서비스 카드
```

---

### TASK 6: AI 비용 최적화
**목적**: 마진 확보
**소요 예상**: 1일

#### 6-1. 모델 우선순위 재조정

```
무료 분석 (텍스트): GPT-4o-mini 또는 Gemini Flash (가장 저렴)
유료 이미지 변환:
  1순위: Gemini 2.5 Flash (비용 최저, 품질 허용 범위)
  2순위: Gemini 3 Pro (품질 업그레이드)
  3순위: OpenAI gpt-image-1.5 (최고 품질, 최고 비용 — Pro/Unlimited만)
```

**구현**: `functions/lib/` 내 폴백 체인 순서를 변경. OpenAI를 1순위에서 3순위로 내림.

#### 6-2. 이미지 생성 수 최적화

현재: 1회 분석에 3~6개 이미지 생성
변경: 
- 무료: 0개 (텍스트만)
- Pro ($4.99/월): 1회당 3개
- Unlimited ($9.99/월): 1회당 6개

---

### TASK 7: SEO 기초 (중기)
**목적**: 무료 유입 채널 확보
**소요 예상**: 3-5일

#### 7-1. 정적 SEO 페이지 추가

Cloudflare Pages에 정적 HTML 페이지 추가 (SPA 외부):

```
/blog/personal-color-analysis-guide     → "퍼스널 컬러 분석 완벽 가이드"
/blog/what-is-personal-color            → "퍼스널 컬러란? 4계절 유형 총정리"
/blog/best-colors-for-spring-warm       → "봄 웜톤에 어울리는 색상과 스타일"
/blog/best-colors-for-summer-cool       → "여름 쿨톤에 어울리는 색상과 스타일"
/blog/best-colors-for-autumn-warm       → "가을 웜톤에 어울리는 색상과 스타일"
/blog/best-colors-for-winter-cool       → "겨울 쿨톤에 어울리는 색상과 스타일"
```

이 페이지들은 SPA 밖에서 독립적으로 제공 (크롤러가 읽을 수 있도록).

#### 7-2. sitemap.xml + robots.txt

```xml
<!-- public/sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemapindex.org/schemas/sitemap/0.9">
  <url><loc>https://kstylist.cc/</loc><priority>1.0</priority></url>
  <url><loc>https://kstylist.cc/blog/personal-color-analysis-guide</loc></url>
  <url><loc>https://kstylist.cc/blog/what-is-personal-color</loc></url>
  <!-- 각 블로그 페이지 -->
</urlset>
```

```
# public/robots.txt
User-agent: *
Allow: /
Sitemap: https://kstylist.cc/sitemap.xml
```

#### 7-3. index.html OG 태그 개선

```html
<meta property="og:title" content="Discover Your Personal Color Season | AI Analysis">
<meta property="og:description" content="Upload one photo. Get your personal color season, best colors, and style recommendations in 30 seconds. Free.">
<meta property="og:image" content="https://kstylist.cc/og-default.png">
<meta property="og:url" content="https://kstylist.cc">
<meta name="description" content="AI-powered personal color analysis. Discover your color season, best colors, body type analysis, and personalized styling recommendations. Free and instant.">
<title>Personal Color Analysis by AI | Stylist Studio</title>
```

---

## 5. 하지 말아야 할 것 (경고)

> 아래 작업은 현 단계에서 시간 낭비다. 하지 마라.

| 하지 말 것 | 이유 |
|-----------|------|
| App.tsx 모노리스 전면 리팩토링 | 트래픽 0인데 코드 구조 개선은 성장에 기여 안 함. 새 기능만 별도 파일로 |
| SSR 마이그레이션 | Cloudflare Worker OG로 크롤러 대응 가능. 전면 SSR은 과잉 |
| 추가 언어 지원 | ko/en 2개만 유지. 나머지는 MAU 1만 이후 |
| React Native / 네이티브 앱 | PWA로 충분. 앱스토어 심사 비용 대비 효과 없음 |
| 디자인 시스템 대규모 정비 | 현재 Platinum Editorial 톤 유지. 큰 변경 불필요 |
| 추가 AI 모델 통합 | 현재 3단 폴백이면 충분 |

---

## 6. 성공 지표 (이 개선 후 추적할 것)

| 지표 | 현재 추정 | 1개월 목표 | 3개월 목표 |
|------|----------|-----------|-----------|
| 일일 무료 분석 수 | ~0 | 50+ | 300+ |
| 공유 카드 생성 수 | 0 | 10+/일 | 50+/일 |
| 공유 → 신규 방문 전환율 | 0% | 15%+ | 25%+ |
| 유료 구독 전환율 | ~0% | 2%+ | 3-5% |
| MRR | ~₩0 | ₩50만+ | ₩300만+ |
| D7 Retention (무료 유저) | ~0% | 10%+ | 20%+ |

### 측정을 위한 필수 이벤트 추가

```typescript
// 새로 추가해야 할 Analytics 이벤트
trackEvent('free_analysis_completed', { season, body_type });
trackEvent('share_card_generated', { platform, season });
trackEvent('share_link_clicked', { referrer_id, source });
trackEvent('paywall_viewed', { trigger: 'after_free_analysis' | 'credits_exhausted' });
trackEvent('subscription_plan_selected', { plan: 'pro' | 'unlimited' });
trackEvent('credit_used', { remaining, plan_type });
trackEvent('og_share_viewed', { result_id, platform });  // Worker에서 발생
```

---

## 7. 실행 순서 체크리스트

**Phase A: 이번 주 (Day 1-7)**
- [ ] TASK 1-1: 퍼스널 컬러 분석 무료화 (freeTrialCount 로직 수정)
- [ ] TASK 1-2: 공유 카드 Canvas API 구현
- [ ] TASK 3: 랜딩 히어로 교체
- [ ] 제거 작업: 3개 언어, 브랜드 변환, 직업별 시나리오, A/B 테스트

**Phase B: 다음 주 (Day 8-14)**
- [ ] TASK 2: Cloudflare Worker OG 이미지 + shared_results 테이블
- [ ] TASK 5: 랜딩 9섹션 → 5섹션 간소화
- [ ] TASK 6: AI 모델 우선순위 재조정 (비용 최적화)

**Phase C: 3주차 (Day 15-21)**
- [ ] TASK 4: 구독 모델 + 크레딧 시스템 (Polar 상품 추가, DB 테이블, 프론트엔드)
- [ ] TASK 7: SEO 기초 (블로그 페이지 3개 + sitemap + robots.txt)

**Phase D: 4주차 (Day 22-30)**
- [ ] 인스타 릴스/틱톡용 Before/After 변환 영상 자동 생성 기능
- [ ] 레퍼럴 인센티브 강화 (추천인에게 크레딧 +1, 피추천인에게 무료 변환 1회)
- [ ] 전체 퍼널 데이터 수집 시작, 첫 주간 Growth Report 작성

---

## 8. 디자인 톤 유지 규칙 (코드 작성 시 참고)

이 서비스의 디자인 톤은 **"Platinum Editorial"** — 럭셔리 에디토리얼 느낌이다.

| 요소 | 규칙 |
|------|------|
| 배경 | 크림 `#FAFAF8` (순백 X) |
| 본문 텍스트 | 차콜 `#1A1A1A` |
| 보조 텍스트 | `#4A4A4A` |
| 골드 악센트 | `#c9a962` → `#d4af37` 그라데이션 |
| CTA 버튼 | 골드 그라데이션 배경, 흰색 텍스트 |
| 헤딩 폰트 | `Playfair Display` (Serif) |
| 본문 폰트 | `Manrope` (Sans-serif) |
| 이모지 | 금지 (럭셔리 톤) |
| 흰색 텍스트 | 어두운 배경 위에서만 허용 |
| 카드 호버 | 골드 글로우 + 상단 골드 악센트 라인 |
| 애니메이션 | 스크롤 페이드인, 골드 시머 (6초 주기) |

---

## 9. 환경 변수 (변경 없음, 참고용)

```
OPENAI_API_KEY, GEMINI_API_KEY, POLAR_API_KEY, POLAR_WEBHOOK_SECRET,
RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY,
OPENWEATHER_API_KEY, CRON_SECRET
R2 바인딩: PHOTOS_BUCKET, DAILY_IMAGES_BUCKET
```

---

## 10. 핵심 원칙 요약

1. **기능을 빼는 것이 더하는 것보다 중요하다.** 복잡한 서비스가 아니라 날카로운 서비스가 산다.
2. **무료 → 바이럴 → 유료 전환 퍼널이 생명이다.** 무료 분석이 공유되지 않으면 모든 게 멈춘다.
3. **AI 비용 > 수익이면 사업이 아니다.** 무료 분석은 텍스트(저비용), 유료만 이미지(고비용).
4. **코드 리팩토링은 성장 이후에.** 지금은 퍼널과 바이럴에만 집중.
5. **모든 UI 인터랙션에 trackEvent를 포함하라.** 측정 안 되면 개선 안 된다.
