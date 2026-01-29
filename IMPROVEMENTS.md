# Stylist Studio 개선 분석 문서

## 1. 코드 아키텍처 문제점

### 1.1 모놀리식 컴포넌트 구조 (Critical)

**현재 상태:**
- `App.tsx`가 2,653줄로 단일 파일에 모든 로직 집중
- 30개 이상의 useState 훅이 하나의 컴포넌트에 존재
- 페이지별 렌더링 로직이 조건문으로 분기

**문제점:**
- 유지보수 및 디버깅 어려움
- 코드 재사용 불가
- 테스트 작성 불가
- 번들 크기 최적화 불가 (코드 스플리팅 불가)

**개선 방안:**
```
src/
├── components/
│   ├── common/          # 공통 UI 컴포넌트
│   │   ├── Button.tsx
│   │   ├── PhotoUpload.tsx
│   │   ├── ProgressBar.tsx
│   │   └── LanguageSelector.tsx
│   ├── pages/           # 페이지 컴포넌트
│   │   ├── LandingPage.tsx
│   │   ├── InputPage.tsx
│   │   ├── LoadingPage.tsx
│   │   ├── ResultPage.tsx
│   │   ├── HairSelectionPage.tsx
│   │   └── FashionSelectionPage.tsx
│   └── layout/          # 레이아웃 컴포넌트
│       ├── Header.tsx
│       └── Footer.tsx
├── hooks/               # 커스텀 훅
│   ├── useProfile.ts
│   ├── usePayment.ts
│   └── useStyleGeneration.ts
├── services/            # API 서비스
│   ├── api.ts
│   └── types.ts
├── i18n/                # 다국어
│   └── translations.ts
└── utils/               # 유틸리티
    └── markdown.ts
```

---

### 1.2 상태 관리 부재 (High)

**현재 상태:**
- 30+ useState 훅이 평면적으로 나열
- 상태 간 의존성이 암묵적
- localStorage와 React 상태 동기화 수동 처리

**문제점:**
- 상태 추적 어려움
- 예측 불가능한 상태 변화
- 디버깅 도구 부재

**개선 방안:**
```typescript
// Option 1: useReducer + Context (가벼운 해결책)
interface AppState {
  user: UserState;
  ui: UIState;
  analysis: AnalysisState;
  payment: PaymentState;
}

// Option 2: Zustand (추천 - 간단하고 가벼움)
import { create } from 'zustand'

interface StoreState {
  profile: UserProfile;
  setProfile: (profile: Partial<UserProfile>) => void;
  // ...
}

// Option 3: Jotai (Atomic 상태 관리)
const profileAtom = atom<UserProfile>({...})
```

---

### 1.3 라우팅 시스템 미비 (Medium)

**현재 상태:**
- Hash 기반 수동 라우팅 (`window.location.hash`)
- `setPage` 함수로 직접 history 조작
- 중첩 라우트 미지원

**문제점:**
- URL 파라미터 처리 불가
- 딥링크 제한적
- SEO 불리 (Hash 기반)

**개선 방안:**
```typescript
// React Router 도입
import { BrowserRouter, Routes, Route } from 'react-router-dom'

<BrowserRouter>
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/input" element={<InputPage />} />
    <Route path="/result/:sessionId" element={<ResultPage />} />
    <Route path="/hair/*" element={<HairRoutes />} />
    <Route path="/fashion/*" element={<FashionRoutes />} />
  </Routes>
</BrowserRouter>
```

---

## 2. 보안 취약점

### 2.1 CORS 정책 과도하게 개방 (High)

**현재 상태:**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // 모든 도메인 허용
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}
```

**문제점:**
- 모든 도메인에서 API 접근 가능
- CSRF 공격 가능성
- API 남용 가능

**개선 방안:**
```typescript
// 환경별 도메인 제한
const ALLOWED_ORIGINS = [
  'https://stylist-studio.pages.dev',
  'https://yourdomain.com',
]

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Credentials': 'true',
  // ...
}
```

---

### 2.2 API 키 정보 노출 (Medium)

**현재 상태:**
```typescript
// analyze.ts:243-254
const keyLength = apiKey ? apiKey.length : 0
const keyPrefix = apiKey ? apiKey.substring(0, 10) : 'none'
// ...
return new Response(
  JSON.stringify({
    error: 'OpenAI API key not configured',
    keyLength,    // API 키 길이 노출
    keyPrefix,    // API 키 앞 10자리 노출!
    envKeys: Object.keys(context.env)  // 환경변수 키 목록 노출
  })
)
```

**문제점:**
- API 키 일부 노출로 브루트포스 공격 용이
- 환경변수 구조 노출

**개선 방안:**
```typescript
// 민감 정보 제거
return new Response(
  JSON.stringify({
    error: 'Service temporarily unavailable',
    code: 'API_CONFIG_ERROR'
  }),
  { status: 503 }
)
```

---

### 2.3 입력 검증 미흡 (Medium)

**현재 상태:**
- 프론트엔드에서만 기본적인 검증
- 백엔드에서 필수 필드 존재 여부만 확인
- 타입/범위 검증 없음

**개선 방안:**
```typescript
// Zod 스키마 기반 검증
import { z } from 'zod'

const RequestSchema = z.object({
  photo: z.string().regex(/^data:image\/(jpeg|png|webp);base64,/),
  height: z.string().regex(/^\d{2,3}$/).transform(Number)
    .refine(n => n >= 100 && n <= 250),
  weight: z.string().regex(/^\d{2,3}$/).transform(Number)
    .refine(n => n >= 30 && n <= 300),
  gender: z.enum(['male', 'female', 'other']),
  language: z.enum(['ko', 'en', 'ja', 'zh', 'es'])
})

// 백엔드에서
const result = RequestSchema.safeParse(body)
if (!result.success) {
  return new Response(JSON.stringify({
    error: 'Validation failed',
    details: result.error.issues
  }), { status: 400 })
}
```

---

## 3. 성능 문제

### 3.1 이미지 처리 비효율 (High)

**현재 상태:**
- 원본 이미지를 Base64로 인코딩하여 전송
- 이미지 리사이즈/압축 없음
- 대용량 payload로 인한 느린 API 응답

**문제점:**
- 5MB 이미지 → ~6.7MB Base64 (33% 증가)
- 메모리 사용량 급증
- API 응답 시간 증가

**개선 방안:**
```typescript
// 이미지 리사이즈 및 압축
async function processImage(file: File): Promise<string> {
  const MAX_WIDTH = 1024;
  const MAX_HEIGHT = 1024;
  const QUALITY = 0.8;

  const img = await createImageBitmap(file);
  const canvas = document.createElement('canvas');

  let { width, height } = img;
  if (width > MAX_WIDTH || height > MAX_HEIGHT) {
    const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
    width *= ratio;
    height *= ratio;
  }

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', QUALITY);
}

// 또는 Cloudflare Images 서비스 활용
// 이미지 업로드 → URL 반환 → URL만 API에 전달
```

---

### 3.2 번들 최적화 미적용 (Medium)

**현재 상태:**
- 단일 번들 파일
- 코드 스플리팅 미적용
- Tree-shaking 최적화 미확인

**개선 방안:**
```typescript
// vite.config.ts 최적화
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          polar: ['@polar-sh/checkout']
        }
      }
    },
    chunkSizeWarningLimit: 500,
  },
  // Lazy loading 적용
  // const ResultPage = lazy(() => import('./pages/ResultPage'))
})
```

---

### 3.3 API 호출 최적화 부재 (Medium)

**현재 상태:**
- 동일 요청에 대한 캐싱 없음
- 요청 중복 방지 로직 없음
- 에러 시 자동 재시도 없음

**개선 방안:**
```typescript
// React Query 또는 SWR 도입
import { useQuery, useMutation } from '@tanstack/react-query'

function useStyleAnalysis() {
  return useMutation({
    mutationFn: analyzeStyle,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
    onError: (error) => {
      // 에러 핸들링
    }
  })
}

// 또는 간단한 캐싱 레이어
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5분
```

---

## 4. UX/접근성 문제

### 4.1 에러 처리 미흡 (High)

**현재 상태:**
- 일반적인 에러 메시지만 표시
- 사용자 행동 가이드 없음
- 에러 복구 옵션 제한적

**개선 방안:**
```typescript
// 상세한 에러 타입 정의
enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_TIMEOUT = 'API_TIMEOUT',
  INVALID_IMAGE = 'INVALID_IMAGE',
  GENERATION_FAILED = 'GENERATION_FAILED',
  PAYMENT_FAILED = 'PAYMENT_FAILED'
}

// 사용자 친화적 에러 UI
function ErrorDisplay({ error, onRetry, onReport }) {
  const { title, message, actions } = getErrorDetails(error)
  return (
    <div className="error-container">
      <h3>{title}</h3>
      <p>{message}</p>
      <div className="error-actions">
        {actions.canRetry && <button onClick={onRetry}>다시 시도</button>}
        {actions.canReport && <button onClick={onReport}>문제 신고</button>}
      </div>
    </div>
  )
}
```

---

### 4.2 접근성(A11y) 부재 (Medium)

**현재 상태:**
- ARIA 속성 미사용
- 키보드 네비게이션 미지원
- 스크린 리더 대응 없음
- 색상 대비 미검증

**개선 방안:**
```typescript
// 접근성 속성 추가
<button
  aria-label={t.uploadPhoto}
  aria-describedby="photo-upload-hint"
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
>
  {t.uploadPhoto}
</button>

<div
  role="progressbar"
  aria-valuenow={loadingProgress}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label={loadingStep}
>

// 포커스 관리
useEffect(() => {
  if (page === 'result') {
    resultHeadingRef.current?.focus()
  }
}, [page])
```

---

### 4.3 모바일 최적화 부족 (Medium)

**현재 상태:**
- 기본적인 반응형만 적용
- 터치 제스처 미지원
- 모바일 특화 UX 없음

**개선 방안:**
- 터치 친화적 UI 요소 (최소 44x44px 터치 타겟)
- 스와이프 제스처 (이미지 갤러리)
- PWA 지원 추가
- 이미지 지연 로딩

---

## 5. 테스트 부재 (Critical)

### 5.1 현재 상태
- 단위 테스트 없음
- 통합 테스트 없음
- E2E 테스트 없음

### 5.2 개선 방안

```typescript
// 테스트 환경 설정
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})

// 단위 테스트 예시
// src/utils/markdown.test.ts
describe('renderMarkdownToHtml', () => {
  it('should convert headers correctly', () => {
    const input = '## 💎 Title'
    const output = renderMarkdownToHtml(input)
    expect(output).toContain('<h3>Title</h3>')
  })
})

// 컴포넌트 테스트 예시
// src/components/PhotoUpload.test.tsx
describe('PhotoUpload', () => {
  it('should handle file upload', async () => {
    const onUpload = vi.fn()
    render(<PhotoUpload onUpload={onUpload} />)

    const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
    await userEvent.upload(screen.getByRole('button'), file)

    expect(onUpload).toHaveBeenCalled()
  })
})

// E2E 테스트 (Playwright)
// e2e/style-analysis.spec.ts
test('complete style analysis flow', async ({ page }) => {
  await page.goto('/')
  await page.click('[data-testid="start-button"]')
  await page.setInputFiles('[data-testid="photo-input"]', 'test-photo.jpg')
  await page.fill('[data-testid="height-input"]', '175')
  await page.fill('[data-testid="weight-input"]', '70')
  await page.click('[data-testid="gender-male"]')
  await page.click('[data-testid="submit-button"]')
  await expect(page.locator('[data-testid="result-report"]')).toBeVisible()
})
```

---

## 6. 코드 품질 문제

### 6.1 타입 안전성 미흡 (Medium)

**현재 상태:**
- 일부 `any` 타입 사용
- API 응답 타입이 불완전
- 런타임 타입 검증 없음

**개선 방안:**
```typescript
// 엄격한 타입 정의
interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          mimeType: string;
          data: string;
        };
        text?: string;
      }>;
    };
  }>;
  error?: {
    code: number;
    message: string;
  };
}

// Type Guard
function isGeminiSuccess(response: unknown): response is GeminiResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'candidates' in response
  )
}
```

---

### 6.2 중복 코드 (Medium)

**현재 상태:**
- CORS 헤더 정의가 모든 API 파일에 중복
- Gemini API 호출 로직 중복
- 에러 응답 생성 로직 중복

**개선 방안:**
```typescript
// functions/lib/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': getAllowedOrigin(),
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export function withCors(response: Response): Response {
  const newHeaders = new Headers(response.headers)
  Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v))
  return new Response(response.body, { ...response, headers: newHeaders })
}

// functions/lib/gemini.ts
export async function callGeminiImageEdit(
  photo: string,
  prompt: string,
  apiKey: string
): Promise<string | null> {
  // 공통 로직
}

// functions/lib/errors.ts
export function errorResponse(code: string, message: string, status = 500) {
  return new Response(
    JSON.stringify({ error: message, code }),
    { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  )
}
```

---

## 7. 인프라 및 운영

### 7.1 모니터링 부재 (High)

**현재 상태:**
- 에러 추적 시스템 없음
- 성능 모니터링 없음
- 사용자 행동 분석 없음

**개선 방안:**
```typescript
// Sentry 에러 추적
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
})

// 간단한 분석 이벤트
function trackEvent(name: string, properties?: Record<string, unknown>) {
  // Cloudflare Analytics 또는 자체 구현
  navigator.sendBeacon('/api/analytics', JSON.stringify({ name, properties }))
}
```

---

### 7.2 환경 분리 미흡 (Medium)

**현재 상태:**
- Sandbox/Production 분리 불명확
- 환경별 설정 관리 어려움
- Feature Flag 시스템 없음

**개선 방안:**
```typescript
// 환경 설정 중앙화
// src/config/index.ts
const config = {
  development: {
    apiBase: 'http://localhost:8788',
    polarApi: 'https://sandbox-api.polar.sh',
    enableDebug: true,
  },
  production: {
    apiBase: 'https://stylist-studio.pages.dev',
    polarApi: 'https://api.polar.sh',
    enableDebug: false,
  }
}[import.meta.env.MODE]

export default config
```

---

## 8. 우선순위 요약

| 순위 | 항목 | 심각도 | 난이도 | 영향도 |
|------|------|--------|--------|--------|
| 1 | 컴포넌트 분리 | Critical | High | High |
| 2 | 테스트 환경 구축 | Critical | Medium | High |
| 3 | 보안 강화 (CORS, 입력검증) | High | Low | High |
| 4 | API 키 정보 노출 제거 | High | Low | High |
| 5 | 에러 처리 개선 | High | Medium | High |
| 6 | 이미지 최적화 | High | Medium | Medium |
| 7 | 상태 관리 도입 | High | Medium | Medium |
| 8 | 라우터 도입 | Medium | Medium | Medium |
| 9 | 접근성 개선 | Medium | Medium | Medium |
| 10 | 모니터링 추가 | High | Low | Medium |

---

*문서 작성일: 2026-01-28*
