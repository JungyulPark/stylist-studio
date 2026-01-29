# Stylist Studio 개선 태스크 목록

## 태스크 개요

총 태스크: 25개
- Critical (P0): 6개
- High (P1): 10개
- Medium (P2): 9개

---

## Phase 1: 보안 및 긴급 수정 (P0)

### TASK-001: API 키 정보 노출 제거
**우선순위:** P0 (Critical)
**예상 작업:** 단순
**영향 범위:** Backend

**현재 문제:**
- `functions/api/analyze.ts:243-254`에서 API 키 정보 노출
- keyPrefix, keyLength, envKeys가 에러 응답에 포함

**작업 내용:**
1. `functions/api/analyze.ts` 열기
2. 에러 응답에서 민감 정보 제거:
   ```typescript
   // Before
   return new Response(
     JSON.stringify({
       error: 'OpenAI API key not configured',
       keyLength,
       keyPrefix,
       envKeys: Object.keys(context.env)
     })
   )

   // After
   return new Response(
     JSON.stringify({
       error: 'Service configuration error',
       code: 'CONFIG_ERROR'
     }),
     { status: 503, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
   )
   ```
3. 모든 API 파일에서 동일 패턴 검색 및 수정

**완료 조건:**
- [ ] 에러 응답에 API 키 관련 정보 없음
- [ ] 환경변수 키 목록 노출 없음

---

### TASK-002: CORS 정책 강화
**우선순위:** P0 (Critical)
**예상 작업:** 단순
**영향 범위:** Backend (전체 API)

**현재 문제:**
- 모든 API에서 `Access-Control-Allow-Origin: '*'` 사용

**작업 내용:**
1. `functions/lib/cors.ts` 생성:
   ```typescript
   const ALLOWED_ORIGINS = [
     'https://stylist-studio.pages.dev',
     'https://localhost:5173',
   ]

   export function getCorsHeaders(request: Request) {
     const origin = request.headers.get('Origin') || ''
     const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
       ? origin
       : ALLOWED_ORIGINS[0]

     return {
       'Access-Control-Allow-Origin': allowedOrigin,
       'Access-Control-Allow-Methods': 'POST, OPTIONS',
       'Access-Control-Allow-Headers': 'Content-Type',
       'Access-Control-Allow-Credentials': 'true',
     }
   }
   ```
2. 모든 API 파일에서 import 및 적용

**완료 조건:**
- [ ] 공통 CORS 모듈 생성
- [ ] 모든 API에서 동적 Origin 검증
- [ ] localhost 개발 환경 지원

---

### TASK-003: 입력 검증 추가
**우선순위:** P0 (Critical)
**예상 작업:** 중간
**영향 범위:** Backend

**현재 문제:**
- 필수 필드 존재 여부만 확인
- 타입/범위 검증 없음

**작업 내용:**
1. `functions/lib/validation.ts` 생성:
   ```typescript
   export interface ValidationError {
     field: string
     message: string
   }

   export function validateAnalyzeRequest(body: unknown): {
     valid: boolean
     errors?: ValidationError[]
     data?: AnalyzeRequestBody
   } {
     const errors: ValidationError[] = []

     if (typeof body !== 'object' || body === null) {
       return { valid: false, errors: [{ field: 'body', message: 'Invalid request body' }] }
     }

     const { height, weight, gender, language, photo } = body as Record<string, unknown>

     // Height validation (100-250cm)
     if (!height || !/^\d{2,3}$/.test(String(height))) {
       errors.push({ field: 'height', message: 'Height must be 100-250cm' })
     }

     // Weight validation (30-300kg)
     if (!weight || !/^\d{2,3}$/.test(String(weight))) {
       errors.push({ field: 'weight', message: 'Weight must be 30-300kg' })
     }

     // Gender validation
     if (!['male', 'female', 'other'].includes(String(gender))) {
       errors.push({ field: 'gender', message: 'Invalid gender' })
     }

     // Language validation
     if (!['ko', 'en', 'ja', 'zh', 'es'].includes(String(language))) {
       errors.push({ field: 'language', message: 'Invalid language' })
     }

     // Photo validation (optional, but if provided must be valid base64)
     if (photo && typeof photo === 'string' && photo.length > 0) {
       if (!photo.startsWith('data:image/')) {
         errors.push({ field: 'photo', message: 'Invalid photo format' })
       }
     }

     return errors.length > 0
       ? { valid: false, errors }
       : { valid: true, data: body as AnalyzeRequestBody }
   }
   ```
2. 각 API에서 검증 함수 호출

**완료 조건:**
- [ ] 공통 검증 모듈 생성
- [ ] analyze.ts에 검증 적용
- [ ] transform-batch.ts에 검증 적용
- [ ] create-checkout.ts에 검증 적용

---

### TASK-004: 테스트 환경 설정
**우선순위:** P0 (Critical)
**예상 작업:** 중간
**영향 범위:** 프로젝트 전체

**작업 내용:**
1. 테스트 의존성 설치:
   ```bash
   npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
   ```

2. `vitest.config.ts` 생성:
   ```typescript
   import { defineConfig } from 'vitest/config'
   import react from '@vitejs/plugin-react'

   export default defineConfig({
     plugins: [react()],
     test: {
       environment: 'jsdom',
       setupFiles: ['./src/test/setup.ts'],
       globals: true,
     },
   })
   ```

3. `src/test/setup.ts` 생성:
   ```typescript
   import '@testing-library/jest-dom'
   ```

4. `package.json`에 스크립트 추가:
   ```json
   {
     "scripts": {
       "test": "vitest",
       "test:coverage": "vitest --coverage"
     }
   }
   ```

**완료 조건:**
- [ ] Vitest 설정 완료
- [ ] 샘플 테스트 통과
- [ ] npm test 명령어 동작

---

### TASK-005: 기본 단위 테스트 작성
**우선순위:** P0 (Critical)
**예상 작업:** 중간
**영향 범위:** Frontend

**작업 내용:**
1. `src/utils/markdown.ts`로 함수 분리
2. `src/utils/markdown.test.ts` 작성:
   ```typescript
   import { describe, it, expect } from 'vitest'
   import { renderMarkdownToHtml } from './markdown'

   describe('renderMarkdownToHtml', () => {
     it('converts section headers with emoji', () => {
       const input = '## 💎 Your Style Profile'
       const output = renderMarkdownToHtml(input)
       expect(output).toContain('💎')
       expect(output).toContain('Your Style Profile')
       expect(output).toContain('section-header')
     })

     it('converts bullet lists', () => {
       const input = '- Item 1\n- Item 2'
       const output = renderMarkdownToHtml(input)
       expect(output).toContain('list-item')
     })

     it('handles empty input', () => {
       expect(renderMarkdownToHtml('')).toBe('')
       expect(renderMarkdownToHtml(null as unknown as string)).toBe('')
     })
   })
   ```

**완료 조건:**
- [ ] markdown 유틸리티 테스트 작성
- [ ] 모든 테스트 통과
- [ ] 최소 80% 커버리지

---

### TASK-006: 에러 응답 표준화
**우선순위:** P0 (Critical)
**예상 작업:** 단순
**영향 범위:** Backend

**작업 내용:**
1. `functions/lib/errors.ts` 생성:
   ```typescript
   export enum ErrorCode {
     VALIDATION_ERROR = 'VALIDATION_ERROR',
     CONFIG_ERROR = 'CONFIG_ERROR',
     EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
     RATE_LIMIT = 'RATE_LIMIT',
     INTERNAL_ERROR = 'INTERNAL_ERROR',
   }

   export function errorResponse(
     code: ErrorCode,
     message: string,
     status: number = 500,
     corsHeaders: Record<string, string>
   ): Response {
     return new Response(
       JSON.stringify({
         error: message,
         code,
         timestamp: new Date().toISOString(),
       }),
       {
         status,
         headers: {
           'Content-Type': 'application/json',
           ...corsHeaders,
         },
       }
     )
   }
   ```

2. 모든 API에서 사용

**완료 조건:**
- [ ] 에러 응답 모듈 생성
- [ ] 모든 API에서 통일된 에러 형식 사용

---

## Phase 2: 코드 구조 개선 (P1)

### TASK-007: 공통 라이브러리 분리
**우선순위:** P1 (High)
**예상 작업:** 중간
**영향 범위:** Backend

**작업 내용:**
1. `functions/lib/` 디렉토리 구조:
   ```
   functions/lib/
   ├── cors.ts        # CORS 헤더
   ├── errors.ts      # 에러 응답
   ├── validation.ts  # 입력 검증
   └── gemini.ts      # Gemini API 래퍼
   ```

2. `functions/lib/gemini.ts`:
   ```typescript
   const GEMINI_MODELS = [
     'nano-banana-pro-preview',
     'gemini-2.0-flash-exp-image-generation'
   ]

   export async function editImageWithGemini(
     photo: string,
     prompt: string,
     apiKey: string
   ): Promise<string | null> {
     const base64Match = photo.match(/^data:image\/(\w+);base64,(.+)$/)
     if (!base64Match) return null

     const mimeType = `image/${base64Match[1]}`
     const base64Data = base64Match[2]

     for (const model of GEMINI_MODELS) {
       try {
         const response = await fetch(
           `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
           {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               contents: [{
                 role: 'user',
                 parts: [
                   { inlineData: { mimeType, data: base64Data } },
                   { text: prompt }
                 ]
               }],
               generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
             })
           }
         )

         if (response.ok) {
           const data = await response.json()
           for (const part of data.candidates?.[0]?.content?.parts || []) {
             if (part.inlineData?.data) {
               return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
             }
           }
         }
       } catch (e) {
         console.error(`[Gemini] ${model} error:`, e)
       }
     }
     return null
   }
   ```

**완료 조건:**
- [ ] 모든 공통 모듈 분리
- [ ] API 파일에서 중복 코드 제거
- [ ] 기존 기능 정상 동작 확인

---

### TASK-008: 다국어 파일 분리
**우선순위:** P1 (High)
**예상 작업:** 단순
**영향 범위:** Frontend

**작업 내용:**
1. `src/i18n/` 디렉토리 생성:
   ```
   src/i18n/
   ├── index.ts       # 타입 및 내보내기
   ├── ko.ts          # 한국어
   ├── en.ts          # 영어
   ├── ja.ts          # 일본어
   ├── zh.ts          # 중국어
   └── es.ts          # 스페인어
   ```

2. `src/i18n/types.ts`:
   ```typescript
   export type Language = 'ko' | 'en' | 'ja' | 'zh' | 'es'

   export interface Translations {
     title: string
     subtitle: string
     // ... 모든 키 정의
   }
   ```

3. App.tsx에서 translations 객체 제거하고 import

**완료 조건:**
- [ ] 언어별 파일 분리
- [ ] 타입 안전성 유지
- [ ] App.tsx에서 ~600줄 감소

---

### TASK-009: 유틸리티 함수 분리
**우선순위:** P1 (High)
**예상 작업:** 단순
**영향 범위:** Frontend

**작업 내용:**
1. `src/utils/` 디렉토리 생성:
   ```
   src/utils/
   ├── markdown.ts    # renderMarkdownToHtml
   ├── image.ts       # processFile, 이미지 처리
   └── storage.ts     # localStorage 래퍼
   ```

2. `src/utils/image.ts`:
   ```typescript
   export function processFile(file: File): Promise<string> {
     return new Promise((resolve, reject) => {
       if (!file.type.startsWith('image/')) {
         reject(new Error('Invalid file type'))
         return
       }
       const reader = new FileReader()
       reader.onloadend = () => resolve(reader.result as string)
       reader.onerror = reject
       reader.readAsDataURL(file)
     })
   }

   export async function compressImage(
     dataUrl: string,
     maxWidth = 1024,
     quality = 0.8
   ): Promise<string> {
     // 이미지 압축 로직
   }
   ```

**완료 조건:**
- [ ] 모든 유틸리티 함수 분리
- [ ] 테스트 작성
- [ ] App.tsx에서 함수 import

---

### TASK-010: 커스텀 훅 분리
**우선순위:** P1 (High)
**예상 작업:** 중간
**영향 범위:** Frontend

**작업 내용:**
1. `src/hooks/` 디렉토리 생성:
   ```
   src/hooks/
   ├── useProfile.ts       # 프로필 상태 관리
   ├── useAnalysis.ts      # 분석 API 호출
   ├── usePayment.ts       # 결제 처리
   └── useLoadingProgress.ts # 로딩 프로그레스
   ```

2. `src/hooks/useProfile.ts`:
   ```typescript
   import { useState, useCallback } from 'react'

   export interface UserProfile {
     photo: string | null
     height: string
     weight: string
     gender: 'male' | 'female' | 'other' | null
   }

   export function useProfile() {
     const [profile, setProfile] = useState<UserProfile>({
       photo: null,
       height: '',
       weight: '',
       gender: null
     })

     const updateProfile = useCallback((updates: Partial<UserProfile>) => {
       setProfile(prev => ({ ...prev, ...updates }))
     }, [])

     const resetProfile = useCallback(() => {
       setProfile({ photo: null, height: '', weight: '', gender: null })
     }, [])

     const isComplete = Boolean(
       profile.height && profile.weight && profile.gender
     )

     return { profile, updateProfile, resetProfile, isComplete }
   }
   ```

3. `src/hooks/useLoadingProgress.ts`:
   ```typescript
   import { useState, useEffect } from 'react'

   export function useLoadingProgress(isActive: boolean, lang: 'ko' | 'en') {
     const [progress, setProgress] = useState(0)
     const [step, setStep] = useState('')

     useEffect(() => {
       if (!isActive) {
         setProgress(0)
         setStep('')
         return
       }

       const steps = lang === 'ko'
         ? ['프로필 분석 시작...', '체형 및 컬러 분석 중...', ...]
         : ['Starting analysis...', 'Analyzing body type...', ...]

       // 타이머 로직
     }, [isActive, lang])

     return { progress, step }
   }
   ```

**완료 조건:**
- [ ] 모든 커스텀 훅 분리
- [ ] App.tsx에서 훅 사용
- [ ] 상태 로직 캡슐화

---

### TASK-011: 페이지 컴포넌트 분리
**우선순위:** P1 (High)
**예상 작업:** 높음
**영향 범위:** Frontend

**작업 내용:**
1. `src/components/pages/` 디렉토리:
   ```
   src/components/pages/
   ├── LandingPage.tsx
   ├── InputPage.tsx
   ├── LoadingPage.tsx
   ├── ResultPage.tsx
   ├── HairSelectionPage.tsx
   ├── HairResultPage.tsx
   ├── FashionSelectionPage.tsx
   ├── FashionResultPage.tsx
   └── HowToUsePage.tsx
   ```

2. 각 페이지 컴포넌트 구조:
   ```typescript
   // src/components/pages/InputPage.tsx
   import { useProfile } from '../../hooks/useProfile'
   import { PhotoUpload } from '../common/PhotoUpload'
   import { GenderSelector } from '../common/GenderSelector'

   interface InputPageProps {
     lang: Language
     onSubmit: (profile: UserProfile) => void
   }

   export function InputPage({ lang, onSubmit }: InputPageProps) {
     const { profile, updateProfile, isComplete } = useProfile()
     const t = translations[lang]

     return (
       <div className="input-page">
         <PhotoUpload
           photo={profile.photo}
           onUpload={(photo) => updateProfile({ photo })}
           hint={t.photoHint}
         />
         {/* ... */}
       </div>
     )
   }
   ```

3. App.tsx 단순화:
   ```typescript
   function App() {
     const [page, setPage] = useState<Page>('landing')
     const [lang, setLang] = useState<Language>('en')

     return (
       <div className="app">
         {page === 'landing' && <LandingPage lang={lang} onNavigate={setPage} />}
         {page === 'input' && <InputPage lang={lang} onSubmit={handleSubmit} />}
         {/* ... */}
       </div>
     )
   }
   ```

**완료 조건:**
- [ ] 9개 페이지 컴포넌트 분리
- [ ] App.tsx 500줄 이하로 축소
- [ ] 모든 페이지 정상 동작

---

### TASK-012: 공통 UI 컴포넌트 분리
**우선순위:** P1 (High)
**예상 작업:** 중간
**영향 범위:** Frontend

**작업 내용:**
1. `src/components/common/` 디렉토리:
   ```
   src/components/common/
   ├── Button.tsx
   ├── PhotoUpload.tsx
   ├── ProgressBar.tsx
   ├── LanguageSelector.tsx
   ├── GenderSelector.tsx
   ├── OccasionSelector.tsx
   └── ImageGrid.tsx
   ```

2. 예시 - `PhotoUpload.tsx`:
   ```typescript
   interface PhotoUploadProps {
     photo: string | null
     onUpload: (dataUrl: string) => void
     hint: string
     accept?: string
   }

   export function PhotoUpload({
     photo,
     onUpload,
     hint,
     accept = 'image/*'
   }: PhotoUploadProps) {
     const inputRef = useRef<HTMLInputElement>(null)
     const [isDragging, setIsDragging] = useState(false)

     // 드래그 앤 드롭 로직

     return (
       <div
         className={`photo-upload ${isDragging ? 'dragging' : ''}`}
         onClick={() => inputRef.current?.click()}
         onDragOver={handleDragOver}
         onDrop={handleDrop}
       >
         {photo ? (
           <img src={photo} alt="Uploaded" />
         ) : (
           <span>{hint}</span>
         )}
         <input
           ref={inputRef}
           type="file"
           accept={accept}
           onChange={handleChange}
           hidden
         />
       </div>
     )
   }
   ```

**완료 조건:**
- [ ] 7개 이상 공통 컴포넌트 분리
- [ ] Props 타입 정의
- [ ] 재사용 가능한 구조

---

### TASK-013: 이미지 압축 구현
**우선순위:** P1 (High)
**예상 작업:** 중간
**영향 범위:** Frontend

**작업 내용:**
1. `src/utils/image.ts`에 압축 함수 추가:
   ```typescript
   export async function compressImage(
     file: File,
     options: {
       maxWidth?: number
       maxHeight?: number
       quality?: number
       format?: 'jpeg' | 'webp'
     } = {}
   ): Promise<string> {
     const {
       maxWidth = 1024,
       maxHeight = 1024,
       quality = 0.8,
       format = 'jpeg'
     } = options

     const img = await createImageBitmap(file)
     const canvas = document.createElement('canvas')

     let { width, height } = img
     if (width > maxWidth || height > maxHeight) {
       const ratio = Math.min(maxWidth / width, maxHeight / height)
       width = Math.round(width * ratio)
       height = Math.round(height * ratio)
     }

     canvas.width = width
     canvas.height = height

     const ctx = canvas.getContext('2d')!
     ctx.drawImage(img, 0, 0, width, height)

     return canvas.toDataURL(`image/${format}`, quality)
   }
   ```

2. PhotoUpload에서 사용:
   ```typescript
   const handleFile = async (file: File) => {
     const compressed = await compressImage(file, {
       maxWidth: 1024,
       quality: 0.8
     })
     onUpload(compressed)
   }
   ```

**완료 조건:**
- [ ] 이미지 압축 함수 구현
- [ ] 업로드 시 자동 압축 적용
- [ ] 원본 대비 50% 이상 용량 감소

---

### TASK-014: 에러 처리 UI 개선
**우선순위:** P1 (High)
**예상 작업:** 중간
**영향 범위:** Frontend

**작업 내용:**
1. `src/components/common/ErrorDisplay.tsx`:
   ```typescript
   interface ErrorDisplayProps {
     error: AppError
     lang: Language
     onRetry?: () => void
     onDismiss?: () => void
   }

   const errorMessages: Record<ErrorCode, Record<Language, { title: string; message: string }>> = {
     NETWORK_ERROR: {
       ko: { title: '네트워크 오류', message: '인터넷 연결을 확인해주세요.' },
       en: { title: 'Network Error', message: 'Please check your internet connection.' },
       // ...
     },
     // ...
   }

   export function ErrorDisplay({ error, lang, onRetry, onDismiss }: ErrorDisplayProps) {
     const { title, message } = errorMessages[error.code]?.[lang] || {
       title: 'Error',
       message: error.message
     }

     return (
       <div className="error-display" role="alert">
         <div className="error-icon">⚠️</div>
         <h3 className="error-title">{title}</h3>
         <p className="error-message">{message}</p>
         <div className="error-actions">
           {onRetry && (
             <button onClick={onRetry} className="btn-retry">
               {lang === 'ko' ? '다시 시도' : 'Try Again'}
             </button>
           )}
           {onDismiss && (
             <button onClick={onDismiss} className="btn-dismiss">
               {lang === 'ko' ? '닫기' : 'Dismiss'}
             </button>
           )}
         </div>
       </div>
     )
   }
   ```

**완료 조건:**
- [ ] ErrorDisplay 컴포넌트 구현
- [ ] 에러 코드별 다국어 메시지
- [ ] 재시도/닫기 액션 지원

---

### TASK-015: API 서비스 레이어 구현
**우선순위:** P1 (High)
**예상 작업:** 중간
**영향 범위:** Frontend

**작업 내용:**
1. `src/services/api.ts`:
   ```typescript
   const API_BASE = '/api'

   class ApiError extends Error {
     constructor(
       public code: string,
       message: string,
       public status: number
     ) {
       super(message)
     }
   }

   async function request<T>(
     endpoint: string,
     options: RequestInit = {}
   ): Promise<T> {
     const response = await fetch(`${API_BASE}${endpoint}`, {
       ...options,
       headers: {
         'Content-Type': 'application/json',
         ...options.headers,
       },
     })

     const data = await response.json()

     if (!response.ok) {
       throw new ApiError(
         data.code || 'UNKNOWN_ERROR',
         data.error || 'An error occurred',
         response.status
       )
     }

     return data as T
   }

   export const api = {
     analyze: (body: AnalyzeRequest) =>
       request<AnalyzeResponse>('/analyze', {
         method: 'POST',
         body: JSON.stringify(body),
       }),

     transformBatch: (body: TransformRequest) =>
       request<TransformResponse>('/transform-batch', {
         method: 'POST',
         body: JSON.stringify(body),
       }),

     createCheckout: (body: CheckoutRequest) =>
       request<CheckoutResponse>('/create-checkout', {
         method: 'POST',
         body: JSON.stringify(body),
       }),
   }
   ```

2. App.tsx에서 사용:
   ```typescript
   const { profile } = useProfile()

   const handleAnalyze = async () => {
     try {
       const result = await api.analyze({
         photo: profile.photo,
         height: profile.height,
         weight: profile.weight,
         gender: profile.gender!,
         language: lang,
       })
       setReport(result.report)
     } catch (error) {
       if (error instanceof ApiError) {
         setError({ code: error.code, message: error.message })
       }
     }
   }
   ```

**완료 조건:**
- [ ] API 서비스 클래스 구현
- [ ] 타입 안전한 요청/응답
- [ ] 에러 처리 통합

---

### TASK-016: 모니터링 추가
**우선순위:** P1 (High)
**예상 작업:** 단순
**영향 범위:** Frontend + Backend

**작업 내용:**
1. 간단한 에러 추적 (console → 서버):
   ```typescript
   // src/utils/monitoring.ts
   export function logError(error: Error, context?: Record<string, unknown>) {
     console.error('[App Error]', error, context)

     // 프로덕션에서만 서버로 전송
     if (import.meta.env.PROD) {
       navigator.sendBeacon('/api/log', JSON.stringify({
         type: 'error',
         message: error.message,
         stack: error.stack,
         context,
         timestamp: new Date().toISOString(),
         userAgent: navigator.userAgent,
       }))
     }
   }

   export function logEvent(name: string, properties?: Record<string, unknown>) {
     if (import.meta.env.PROD) {
       navigator.sendBeacon('/api/analytics', JSON.stringify({
         event: name,
         properties,
         timestamp: new Date().toISOString(),
       }))
     }
   }
   ```

2. 주요 이벤트에 로깅 추가:
   ```typescript
   // 분석 시작
   logEvent('analysis_started', { hasPhoto: !!profile.photo })

   // 분석 완료
   logEvent('analysis_completed', { duration: Date.now() - startTime })

   // 에러 발생
   logError(error, { page, action: 'analyze' })
   ```

**완료 조건:**
- [ ] 에러 로깅 함수 구현
- [ ] 이벤트 추적 함수 구현
- [ ] 주요 사용자 플로우에 적용

---

## Phase 3: UX 및 최적화 (P2)

### TASK-017: React Router 도입
**우선순위:** P2 (Medium)
**예상 작업:** 중간
**영향 범위:** Frontend

**작업 내용:**
1. 의존성 설치:
   ```bash
   npm install react-router-dom
   ```

2. 라우터 설정:
   ```typescript
   // src/App.tsx
   import { BrowserRouter, Routes, Route } from 'react-router-dom'

   function App() {
     return (
       <BrowserRouter>
         <Routes>
           <Route path="/" element={<LandingPage />} />
           <Route path="/input" element={<InputPage />} />
           <Route path="/loading" element={<LoadingPage />} />
           <Route path="/result" element={<ResultPage />} />
           <Route path="/hair">
             <Route path="select" element={<HairSelectionPage />} />
             <Route path="result" element={<HairResultPage />} />
           </Route>
           <Route path="/fashion">
             <Route path="select" element={<FashionSelectionPage />} />
             <Route path="result" element={<FashionResultPage />} />
           </Route>
           <Route path="/how-to-use" element={<HowToUsePage />} />
         </Routes>
       </BrowserRouter>
     )
   }
   ```

3. 네비게이션 변경:
   ```typescript
   // Before
   setPage('result')

   // After
   navigate('/result')
   ```

**완료 조건:**
- [ ] React Router 설치 및 설정
- [ ] 모든 페이지 라우트 정의
- [ ] 기존 해시 라우팅 제거

---

### TASK-018: 상태 관리 라이브러리 도입
**우선순위:** P2 (Medium)
**예상 작업:** 중간
**영향 범위:** Frontend

**작업 내용:**
1. Zustand 설치:
   ```bash
   npm install zustand
   ```

2. 스토어 정의:
   ```typescript
   // src/store/index.ts
   import { create } from 'zustand'
   import { persist } from 'zustand/middleware'

   interface AppState {
     // User
     profile: UserProfile
     setProfile: (profile: Partial<UserProfile>) => void
     resetProfile: () => void

     // UI
     lang: Language
     setLang: (lang: Language) => void

     // Analysis
     report: string | null
     setReport: (report: string) => void
     styleImages: StyleImage[]
     setStyleImages: (images: StyleImage[]) => void

     // Payment
     isPaid: boolean
     setIsPaid: (paid: boolean) => void
   }

   export const useAppStore = create<AppState>()(
     persist(
       (set) => ({
         profile: { photo: null, height: '', weight: '', gender: null },
         setProfile: (updates) =>
           set((state) => ({ profile: { ...state.profile, ...updates } })),
         resetProfile: () =>
           set({ profile: { photo: null, height: '', weight: '', gender: null } }),

         lang: 'en',
         setLang: (lang) => set({ lang }),

         report: null,
         setReport: (report) => set({ report }),
         styleImages: [],
         setStyleImages: (styleImages) => set({ styleImages }),

         isPaid: false,
         setIsPaid: (isPaid) => set({ isPaid }),
       }),
       {
         name: 'stylist-studio-storage',
         partialize: (state) => ({
           lang: state.lang,
           isPaid: state.isPaid,
         }),
       }
     )
   )
   ```

**완료 조건:**
- [ ] Zustand 스토어 설정
- [ ] localStorage 영속화
- [ ] 컴포넌트에서 스토어 사용

---

### TASK-019: 접근성 개선
**우선순위:** P2 (Medium)
**예상 작업:** 중간
**영향 범위:** Frontend

**작업 내용:**
1. ARIA 속성 추가:
   ```typescript
   // 버튼
   <button
     aria-label={t.startAnalysis}
     aria-busy={isLoading}
     disabled={!isComplete}
   >

   // 프로그레스 바
   <div
     role="progressbar"
     aria-valuenow={progress}
     aria-valuemin={0}
     aria-valuemax={100}
     aria-label={step}
   />

   // 이미지
   <img
     src={styleImage.imageUrl}
     alt={`${styleImage.label} style preview`}
   />
   ```

2. 키보드 네비게이션:
   ```typescript
   // 이미지 그리드
   <div
     role="listbox"
     onKeyDown={(e) => {
       if (e.key === 'ArrowRight') selectNext()
       if (e.key === 'ArrowLeft') selectPrev()
       if (e.key === 'Enter') confirmSelection()
     }}
   >
   ```

3. 포커스 관리:
   ```typescript
   useEffect(() => {
     if (page === 'result') {
       reportHeadingRef.current?.focus()
     }
   }, [page])
   ```

**완료 조건:**
- [ ] 모든 인터랙티브 요소에 ARIA 속성
- [ ] 키보드 네비게이션 지원
- [ ] 스크린 리더 테스트

---

### TASK-020: 번들 최적화
**우선순위:** P2 (Medium)
**예상 작업:** 단순
**영향 범위:** Build

**작업 내용:**
1. `vite.config.ts` 최적화:
   ```typescript
   export default defineConfig({
     build: {
       rollupOptions: {
         output: {
           manualChunks: {
             vendor: ['react', 'react-dom'],
             router: ['react-router-dom'],
             polar: ['@polar-sh/checkout'],
           }
         }
       },
       chunkSizeWarningLimit: 500,
       sourcemap: false,
       minify: 'esbuild',
     },
     optimizeDeps: {
       include: ['react', 'react-dom'],
     },
   })
   ```

2. 코드 스플리팅:
   ```typescript
   // Lazy loading
   const ResultPage = lazy(() => import('./pages/ResultPage'))
   const HairSelectionPage = lazy(() => import('./pages/HairSelectionPage'))

   // Suspense 사용
   <Suspense fallback={<LoadingSpinner />}>
     <ResultPage />
   </Suspense>
   ```

**완료 조건:**
- [ ] 청크 분리 설정
- [ ] 주요 페이지 lazy loading
- [ ] 초기 번들 100KB 이하

---

### TASK-021: E2E 테스트 추가
**우선순위:** P2 (Medium)
**예상 작업:** 중간
**영향 범위:** Testing

**작업 내용:**
1. Playwright 설치:
   ```bash
   npm install -D @playwright/test
   npx playwright install
   ```

2. `playwright.config.ts`:
   ```typescript
   import { defineConfig } from '@playwright/test'

   export default defineConfig({
     testDir: './e2e',
     fullyParallel: true,
     forbidOnly: !!process.env.CI,
     retries: process.env.CI ? 2 : 0,
     workers: process.env.CI ? 1 : undefined,
     reporter: 'html',
     use: {
       baseURL: 'http://localhost:5173',
       trace: 'on-first-retry',
     },
   })
   ```

3. `e2e/analysis.spec.ts`:
   ```typescript
   import { test, expect } from '@playwright/test'

   test('complete analysis flow', async ({ page }) => {
     await page.goto('/')

     // 랜딩 페이지
     await expect(page.getByRole('heading', { name: /AI Stylist/i })).toBeVisible()
     await page.getByRole('button', { name: /Start/i }).click()

     // 입력 페이지
     await page.setInputFiles('[data-testid="photo-input"]', 'e2e/fixtures/test-photo.jpg')
     await page.fill('[data-testid="height"]', '175')
     await page.fill('[data-testid="weight"]', '70')
     await page.getByRole('button', { name: /Male/i }).click()
     await page.getByRole('button', { name: /Start Analysis/i }).click()

     // 로딩 → 결과
     await expect(page.getByRole('progressbar')).toBeVisible()
     await expect(page.getByText(/Style Profile/i)).toBeVisible({ timeout: 30000 })
   })
   ```

**완료 조건:**
- [ ] Playwright 설정
- [ ] 핵심 사용자 플로우 테스트 3개 이상
- [ ] CI에서 실행 가능

---

### TASK-022: PWA 지원
**우선순위:** P2 (Medium)
**예상 작업:** 단순
**영향 범위:** Frontend

**작업 내용:**
1. `vite-plugin-pwa` 설치:
   ```bash
   npm install -D vite-plugin-pwa
   ```

2. `vite.config.ts`:
   ```typescript
   import { VitePWA } from 'vite-plugin-pwa'

   export default defineConfig({
     plugins: [
       react(),
       VitePWA({
         registerType: 'autoUpdate',
         manifest: {
           name: 'Stylist Studio',
           short_name: 'Stylist',
           theme_color: '#d4728c',
           icons: [
             { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
             { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
           ],
         },
       }),
     ],
   })
   ```

**완료 조건:**
- [ ] PWA 매니페스트 생성
- [ ] 서비스 워커 등록
- [ ] 오프라인 기본 페이지

---

### TASK-023: 환경 설정 분리
**우선순위:** P2 (Medium)
**예상 작업:** 단순
**영향 범위:** 전체

**작업 내용:**
1. `src/config/index.ts`:
   ```typescript
   interface Config {
     apiBase: string
     polarApi: string
     polarProductId: string
     enableDebug: boolean
   }

   const configs: Record<string, Config> = {
     development: {
       apiBase: 'http://localhost:8788',
       polarApi: 'https://sandbox-api.polar.sh',
       polarProductId: 'cca7d48e-6758-4e83-a375-807ab70615ea',
       enableDebug: true,
     },
     production: {
       apiBase: '',
       polarApi: 'https://api.polar.sh',
       polarProductId: 'PRODUCTION_PRODUCT_ID',
       enableDebug: false,
     },
   }

   export const config = configs[import.meta.env.MODE] || configs.production
   ```

2. 하드코딩된 값 교체

**완료 조건:**
- [ ] 환경별 설정 파일
- [ ] 하드코딩된 URL/ID 제거
- [ ] 개발/프로덕션 분리

---

### TASK-024: API 캐싱 구현
**우선순위:** P2 (Medium)
**예상 작업:** 단순
**영향 범위:** Frontend

**작업 내용:**
1. 간단한 캐시 레이어:
   ```typescript
   // src/services/cache.ts
   interface CacheEntry<T> {
     data: T
     timestamp: number
   }

   const cache = new Map<string, CacheEntry<unknown>>()
   const DEFAULT_TTL = 5 * 60 * 1000 // 5분

   export function getCached<T>(key: string): T | null {
     const entry = cache.get(key) as CacheEntry<T> | undefined
     if (!entry) return null

     if (Date.now() - entry.timestamp > DEFAULT_TTL) {
       cache.delete(key)
       return null
     }

     return entry.data
   }

   export function setCache<T>(key: string, data: T): void {
     cache.set(key, { data, timestamp: Date.now() })
   }

   export function clearCache(): void {
     cache.clear()
   }
   ```

2. API 서비스에서 사용:
   ```typescript
   async function analyzeWithCache(body: AnalyzeRequest) {
     const cacheKey = `analyze:${JSON.stringify(body)}`
     const cached = getCached<AnalyzeResponse>(cacheKey)
     if (cached) return cached

     const result = await api.analyze(body)
     setCache(cacheKey, result)
     return result
   }
   ```

**완료 조건:**
- [ ] 캐시 유틸리티 구현
- [ ] 분석 결과 캐싱
- [ ] TTL 만료 처리

---

### TASK-025: 문서화 완료
**우선순위:** P2 (Medium)
**예상 작업:** 단순
**영향 범위:** Documentation

**작업 내용:**
1. `README.md` 업데이트:
   - 프로젝트 소개
   - 설치 방법
   - 개발 환경 설정
   - 배포 방법
   - 환경 변수 설명

2. `CONTRIBUTING.md` 작성:
   - 코드 스타일 가이드
   - PR 프로세스
   - 테스트 작성 가이드

3. API 문서 (`docs/API.md`):
   - 엔드포인트 목록
   - 요청/응답 형식
   - 에러 코드

**완료 조건:**
- [ ] README.md 완성
- [ ] CONTRIBUTING.md 작성
- [ ] API 문서 작성

---

## 태스크 진행 추적

### 완료 상태
| 태스크 | 상태 | 완료일 | 담당자 |
|--------|------|--------|--------|
| TASK-001 | ✅ 완료 | 2026-01-28 | Claude |
| TASK-002 | ✅ 완료 | 2026-01-28 | Claude |
| TASK-003 | ✅ 완료 | 2026-01-28 | Claude |
| TASK-004 | ✅ 완료 | 2026-01-28 | Claude |
| TASK-005 | ✅ 완료 | 2026-01-29 | Claude |
| TASK-006 | ✅ 완료 | 2026-01-29 | Claude |
| TASK-007 | ⬜ 대기 | - | - |
| ... | ... | ... | ... |

### 상태 범례
- ⬜ 대기
- 🔄 진행 중
- ✅ 완료
- ❌ 취소

---

*문서 작성일: 2026-01-28*
*총 태스크: 25개*
