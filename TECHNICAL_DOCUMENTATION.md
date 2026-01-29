# Stylist Studio 기술 문서

## 1. 프로젝트 개요

**Stylist Studio**는 AI 기반 개인 스타일링 서비스로, 사용자의 사진을 분석하여 맞춤형 헤어스타일과 패션을 추천하고, AI 이미지 생성을 통해 실제 적용 모습을 미리 볼 수 있는 웹 애플리케이션입니다.

### 1.1 핵심 기능
- **AI 스타일 분석**: OpenAI GPT-5.2를 활용한 개인 스타일 컨설팅 리포트 생성
- **헤어스타일 변환**: 사용자 사진에 다양한 헤어스타일 적용 (Gemini AI)
- **패션 스타일 변환**: 사용자 사진에 다양한 의상 적용 (Gemini AI)
- **다국어 지원**: 한국어, 영어, 일본어, 중국어, 스페인어
- **결제 시스템**: Polar Checkout 연동 (Sandbox 환경)

### 1.2 타겟 사용자
- 새로운 헤어스타일을 고민하는 사용자
- 특정 상황(면접, 데이트 등)에 맞는 패션을 찾는 사용자
- 전문 스타일링 컨설팅을 받고 싶은 사용자

---

## 2. 기술 스택

### 2.1 프론트엔드
| 기술 | 버전 | 용도 |
|------|------|------|
| React | 19.2.0 | UI 프레임워크 |
| TypeScript | 5.9.3 | 타입 안전성 |
| Vite | 7.2.4 | 빌드 도구 |
| CSS3 (Vanilla) | - | 스타일링 |

### 2.2 백엔드
| 기술 | 버전 | 용도 |
|------|------|------|
| Cloudflare Pages Functions | - | 서버리스 API |
| Wrangler | 4.60.0 | Cloudflare 배포 CLI |

### 2.3 외부 서비스
| 서비스 | 모델/버전 | 용도 |
|--------|-----------|------|
| OpenAI | GPT-5.2 | 스타일 분석 텍스트 생성 |
| Google Gemini | nano-banana-pro-preview | 이미지 편집/생성 (Primary) |
| Google Gemini | gemini-2.0-flash-exp-image-generation | 이미지 생성 (Fallback) |
| Polar | Sandbox API | 결제 처리 |

---

## 3. 프로젝트 구조

```
stylist-studio/
├── src/                              # 프론트엔드 소스
│   ├── main.tsx                      # React 진입점
│   ├── App.tsx                       # 메인 애플리케이션 (2653 lines)
│   ├── App.css                       # 전체 스타일 (2821 lines)
│   └── index.css                     # 글로벌 스타일
├── functions/api/                    # Cloudflare Pages Functions
│   ├── analyze.ts                    # 스타일 분석 API
│   ├── generate-styles.ts            # 스타일 이미지 생성 API
│   ├── generate-hair-styles.ts       # 헤어스타일 생성 API
│   ├── generate-fashion-styles.ts    # 패션 스타일 생성 API
│   ├── transform-batch.ts            # 배치 변환 API
│   ├── transform-style.ts            # 단일 스타일 변환 API
│   └── create-checkout.ts            # 결제 세션 생성 API
├── public/                           # 정적 에셋
├── dist/                             # 프로덕션 빌드 결과물
├── package.json                      # 의존성 관리
├── vite.config.ts                    # Vite 설정
├── tsconfig.json                     # TypeScript 설정
├── wrangler.toml                     # Cloudflare 설정
└── dev-server.js                     # 로컬 개발 서버
```

---

## 4. 아키텍처

### 4.1 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                        사용자 브라우저                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              React SPA (Vite Build)                      │   │
│  │  • 페이지 라우팅 (Hash-based)                            │   │
│  │  • 상태 관리 (useState/useCallback)                      │   │
│  │  • 이미지 처리 (Base64 인코딩)                           │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Pages                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Pages Functions (API)                       │   │
│  │  /api/analyze          → OpenAI GPT-5.2                 │   │
│  │  /api/generate-styles  → Gemini Image API               │   │
│  │  /api/transform-batch  → Gemini Image API               │   │
│  │  /api/create-checkout  → Polar API                      │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   OpenAI API  │    │  Gemini API   │    │   Polar API   │
│   (분석 텍스트)│    │  (이미지 생성) │    │    (결제)     │
└───────────────┘    └───────────────┘    └───────────────┘
```

### 4.2 데이터 흐름

```
1. 사용자 입력
   ┌──────────────────────────────────────────────────────┐
   │ 사진 업로드 → FileReader → Base64 Data URI → State  │
   │ 신체 정보 → Form Input → State                       │
   │ 성별/언어 → Selection → State                        │
   └──────────────────────────────────────────────────────┘

2. API 요청
   ┌──────────────────────────────────────────────────────┐
   │ State → JSON → fetch() → Cloudflare Function         │
   │         → 외부 AI API → Response → State Update      │
   └──────────────────────────────────────────────────────┘

3. 결과 표시
   ┌──────────────────────────────────────────────────────┐
   │ State → renderMarkdownToHtml() → JSX → DOM           │
   │ 이미지 → Base64 Data URI → <img src={...} />        │
   └──────────────────────────────────────────────────────┘
```

---

## 5. 핵심 컴포넌트 상세

### 5.1 App.tsx 구조 (Line 분석)

| 라인 범위 | 내용 |
|-----------|------|
| 1-60 | 타입 정의, 헤어/패션 옵션 상수 |
| 61-649 | 다국어 번역 객체 (translations) |
| 650-743 | 마크다운→HTML 변환 함수 |
| 744-855 | 상태 관리 및 초기화 로직 |
| 856-891 | 로딩 프로그레스 타이머 |
| 892-979 | 파일 업로드 및 결제 처리 |
| 980-1100+ | API 호출 및 결과 처리 |
| 1100+ | UI 렌더링 (JSX) |

### 5.2 주요 상태 (State)

```typescript
// 핵심 사용자 데이터
profile: { photo, height, weight, gender }

// 페이지 및 UI 상태
page: Page (landing, input, loading, result, ...)
lang: Language (ko, en, ja, zh, es)

// 분석 결과
report: string (마크다운 형식)
styleImages: StyleImage[]
transformedHairstyles: { id, label, imageUrl }[]
transformedFashion: { id, label, imageUrl }[]

// 로딩 상태
isGeneratingStyles, isTransformingHair, isTransformingFashion
loadingProgress, loadingStep

// 결제 상태
isPaid, isProcessingPayment, isRepeatCustomer
```

### 5.3 API 엔드포인트 상세

#### `/api/analyze`
- **Purpose**: 사용자 프로필 기반 스타일 분석
- **Method**: POST
- **Input**: `{ photo, height, weight, gender, language }`
- **Output**: `{ report: string }` (마크다운)
- **External**: OpenAI GPT-5.2

#### `/api/transform-batch`
- **Purpose**: 헤어/패션 배치 변환
- **Method**: POST
- **Input**: `{ photo, type, gender, language }`
- **Output**: `{ type, results: [{id, label, imageUrl}], successCount }`
- **External**: Gemini nano-banana-pro-preview

#### `/api/create-checkout`
- **Purpose**: 결제 세션 생성
- **Method**: POST
- **Input**: `{ productId?, successUrl?, isRepeatCustomer?, discountCode? }`
- **Output**: `{ url, clientSecret }`
- **External**: Polar Sandbox API

---

## 6. 환경 변수

| 변수명 | 필수 | 용도 |
|--------|------|------|
| `OPENAI_API_KEY` | Yes | OpenAI API 인증 |
| `GEMINI_API_KEY` | Yes | Google Gemini API 인증 |
| `POLAR_API_KEY` | No | Polar 결제 API 인증 |

---

## 7. 빌드 및 배포

### 7.1 개발 환경
```bash
npm run dev          # 프론트엔드만 (localhost:5173)
npm run dev:api      # 백엔드만 (localhost:8788)
npm run dev:full     # 전체 실행
```

### 7.2 프로덕션 빌드
```bash
npm run build        # TypeScript 컴파일 + Vite 번들링
npm run deploy       # Cloudflare Pages 배포
```

### 7.3 배포 플랫폼
- **Hosting**: Cloudflare Pages
- **Functions**: Cloudflare Pages Functions (서버리스)
- **CDN**: Cloudflare Global CDN

---

## 8. 보안 고려사항

### 8.1 현재 구현
- API 키는 환경변수로 관리 (Cloudflare Secrets)
- CORS 헤더 설정 (`Access-Control-Allow-Origin: *`)
- 클라이언트 측 입력 검증

### 8.2 주의 필요 사항
- CORS가 `*`로 열려 있음 (프로덕션에서는 도메인 제한 필요)
- API 키 로깅 주의 (keyPrefix 노출)
- 이미지 데이터가 Base64로 전송되어 payload 크기 증가

---

## 9. 성능 특성

### 9.1 현재 상태
- 단일 컴포넌트 App.tsx가 2600+ 라인 (모놀리식)
- 이미지가 Base64로 인코딩되어 메모리 사용량 높음
- API 호출 시 병렬 처리 (`Promise.all`)

### 9.2 측정 지표 (추정)
- 초기 번들 크기: ~200KB (gzip)
- 이미지 생성 API: 5-15초/이미지
- 분석 API: 3-8초

---

## 10. 버전 히스토리

| 커밋 | 날짜 | 주요 변경 |
|------|------|-----------|
| a606852 | 최신 | 남성 헤어스타일 프롬프트 완화 |
| 169344b | - | 피부 보정, 성별별 헤어, 서비스 소개 추가 |
| 426a0b8 | - | Nano Banana Pro (Gemini 3) 전환 |
| 8916ac7 | - | 파이프라인 단순화, 타이머 기반 프로그레스 |
| 6cd6a1a | - | FaceFusion → 빠른 모델 교체, 4이미지로 감소 |

---

*문서 작성일: 2026-01-28*
*버전: 1.0.0*
