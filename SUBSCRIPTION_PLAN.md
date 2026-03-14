# Stylist Studio 전환 계획

## 0. TODO — 다음 작업 (우선순위순)

### 0-1. 헤어 분석 무료 3회 전환 (즉시)

현재 무료 체험이 1회(boolean)로 되어 있음. **3회 카운터**로 변경.

**변경 파일: `src/App.tsx`**

| 항목 | 현재 | 변경 후 |
|------|------|---------|
| localStorage 키 | `stylist_free_trial_used` (boolean) | `stylist_free_trial_count` (number) |
| state 변수 | `hasUsedFreeTrial` (boolean) | `freeTrialCount` (number) |
| 무료 판단 | `!hasUsedFreeTrial` | `freeTrialCount < 3` |
| 사용 시 | `setHasUsedFreeTrial(true)` | `setFreeTrialCount(prev => prev + 1)` |

**코드 변경 상세:**

1. **State 초기화** (~line 1682)
   ```ts
   // Before
   const [hasUsedFreeTrial, setHasUsedFreeTrial] = useState(() => localStorage.getItem('stylist_free_trial_used') === 'true')
   // After
   const [freeTrialCount, setFreeTrialCount] = useState(() => {
     const count = parseInt(localStorage.getItem('stylist_free_trial_count') || '0', 10)
     return isNaN(count) ? 0 : count
   })
   const hasFreeTrial = freeTrialCount < 3
   ```

2. **startFreeTrialHairGeneration** (~line 2280)
   ```ts
   const newCount = freeTrialCount + 1
   localStorage.setItem('stylist_free_trial_count', String(newCount))
   setFreeTrialCount(newCount)
   setIsFreeTrial(true)
   ```

3. **handleHairRecommendation 조건** (~line 2731)
   - `!hasUsedFreeTrial` → `hasFreeTrial`

4. **랜딩 페이지 UI** (~line 3775, 3870, 3873)
   - `!hasUsedFreeTrial` → `hasFreeTrial`
   - 남은 횟수 표시: `FREE 2/3` 형태 배지

5. **번역 문자열 업데이트** (5개 언어)
   - `freeTrialDesc`: "1회" → "3회" / "1 free" → "3 free" 등
   - `freeTrialRemaining` 키 추가: "무료 {n}회 남음"

6. **기존 사용자 마이그레이션**
   - `stylist_free_trial_used === 'true'` 인 기존 사용자 → `count = 1`로 변환
   - 기존 사용자도 나머지 2회 무료 사용 가능

7. **Upsell 섹션** (~line 4859)
   - 3회 소진 전: Share 버튼만 표시
   - 3회 소진 후: Upsell 카드 표시 (기존 로직 유지)
   - `isFreeTrial` → `isFreeTrial && !hasFreeTrial` 로 Upsell 조건 변경

### 0-2. 구독 서비스 구현 (Phase 1~4)

아래 섹션 2~5 참조.

---

## 1. 현재 결제 모델 (One-time Purchase)

| 상품 | Product ID | 가격 | 설명 |
|------|-----------|------|------|
| Hair Transformation | `3df2c89e-...` | $2.99 | AI 헤어스타일 5종 생성 |
| Full Style Package | `533aed39-...` | $4.99 | 헤어 + 패션 + 체형 분석 |

- **결제 플랫폼:** Polar.sh (API v1)
- **결제 방식:** 건당 일회성 결제 → Checkout URL 생성 → 결과 전달
- **환불:** 생성 실패 시 자동 환불 (`/api/refund`)
- **재구매 할인:** `COMEBACK50` 코드 (50% 할인)
- **무료 체험:** 헤어 분석 3회 무료 (Free Trial) — ~~1회~~ → 3회로 변경 예정

---

## 2. 구독 상품: What to Wear Today

### 2-1. 상품 정보

| 항목 | 값 |
|------|-----|
| **Name** | What to Wear Today |
| **Product ID** | `2c761310-373e-4017-8141-8532748713c0` |
| **가격** | $6.99/월 (Recurring subscription) |
| **무료 체험** | 7일 (Free trial) |
| **기능** | 매일 아침 날씨 + 유저 프로필 기반 스타일 추천 |

### 2-2. Polar 대시보드 설정

| 필드 | 설정값 |
|------|--------|
| Name | `What to Wear Today` |
| Pricing | Recurring / 1 month / $6.99 USD |
| Free trial | 7 days |
| Metadata | `plan_type: daily_style`, `trial_days: 7`, `feature: weather_outfit_recommendation` |
| Customer Portal | Public |
| Checkout Description | 아래 참고 |

**Checkout Description:**
```
Try free for 7 days — cancel anytime.

Your AI stylist checks the weather every morning and picks
the perfect outfit from your wardrobe. Just wake up and get dressed.

After your 7-day free trial: just $6.99/month — less than a single coffee.
```

### 2-3. 전환 심리 설계 (거짓말 없음, 사실 기반)

**구매 전 — 관심 유도**
- 손실 회피 (Loss Aversion): "매일 아침 30분 낭비하고 있습니다"
- 기준점 편향 (Anchoring): "커피 두 잔 $12 vs 한 달 $6.99"
- 사회적 증거 (Social Proof): 실제 사용자 수 표시
- 호기심의 틈 (Curiosity Gap): "내일 날씨에 맞는 옷이 뭘까?"

**체험 중 — 7일 무료 기간**
- 이케아 효과 (IKEA Effect): 체형/스타일 정보 직접 입력 → 떠나기 아까움
- 변동성 보상 (Variable Reward): 매일 다른 스타일 추천 → 습관 형성
- 목표 그라데이션 (Goal Gradient): "7일 중 5일째!" → 완료 욕구
- 피크엔드 법칙 (Peak-End Rule): 7일차에 가장 좋은 추천 제공

**결제 전환 — 7일차**
- 결핍 효과 (Scarcity): "무료 체험이 오늘 끝납니다"
- 디드로 효과 (Diderot Effect): "이미 7일간 스타일 데이터가 쌓였습니다"
- 프레이밍 (Framing): "$6.99/월" = 하루 약 7센트
- 기본 편향 (Default Bias): 체험 후 자동 구독 전환 (Polar 기본 동작)

### 2-3. 코드 변경 필요 사항

#### A. 환경변수 추가

```
# wrangler.toml 또는 Cloudflare Pages 환경변수
POLAR_PRODUCT_DAILY_STYLE=2c761310-373e-4017-8141-8532748713c0
```

#### B. `/api/create-checkout.ts` 수정

- `ProductType`에 구독 추가: `'hair' | 'full' | 'daily_style'`
- Polar API 호출 시 구독 상품 ID 사용 (Polar가 자동으로 구독 결제 처리)
- `success_url`에 `subscription=true` 파라미터 추가

#### C. 구독 상태 관리 (신규)

```
/api/subscription-status.ts  — Polar API로 구독 상태 조회
/api/webhook.ts              — Polar 웹훅 수신 (구독 갱신/취소/만료)
```

- **Polar Webhook 이벤트:**
  - `subscription.created` — 구독 시작
  - `subscription.updated` — 플랜 변경
  - `subscription.canceled` — 구독 취소
  - `subscription.revoked` — 결제 실패로 해지

#### D. 프론트엔드 (`App.tsx`) 변경

- 구독 상태 확인 로직 추가 (`/api/subscription-status` 호출)
- 월 사용량 추적 (localStorage 또는 서버 사이드)
- 랜딩 페이지에 구독 플랜 비교 UI 추가
- 결과 페이지에서 남은 사용 횟수 표시
- Customer Portal 링크 추가 (구독 관리/취소)

### 2-4. 사용자 인증 연동

현재 Supabase Auth를 사용 중이므로:

- 구독 구매 시 Supabase `user_id`를 Polar checkout metadata에 포함
- Webhook 수신 시 Supabase에 구독 상태 저장
- 테이블 예시: `subscriptions(user_id, polar_subscription_id, plan_tier, status, current_period_end)`

---

## 3. 마이그레이션 전략

### 기존 사용자 처리
- 기존 일회성 구매자: 기존 결과물 영구 접근 유지
- Free Trial 사용자: 구독 유도 (첫 달 할인 쿠폰 제공 가능)

### 단계적 전환
1. **Phase 1:** Polar에 구독 상품 생성 + 웹훅 엔드포인트 구축
2. **Phase 2:** 프론트엔드에 구독 플랜 선택 UI 추가
3. **Phase 3:** 기존 일회성 결제와 구독을 병행 운영
4. **Phase 4:** 일회성 결제 단계적 종료 (선택 사항)

---

## 4. 구독 vs 일회성 비교

| 항목 | 일회성 (현재) | 구독형 (전환 후) |
|------|-------------|----------------|
| 결제 빈도 | 사용할 때마다 | 월 자동 결제 |
| 환불 | 생성 실패 시 자동 | 구독 취소로 대체 |
| 사용 제한 | 건당 | 월 N회 (플랜별) |
| 재구매 할인 | COMEBACK50 코드 | 불필요 (구독에 포함) |
| 고객 유지 | 낮음 | 높음 (recurring revenue) |
| Polar 수수료 | 건당 | 건당 (동일) |

---

## 5. Polar 대시보드 체크리스트

- [ ] 구독 상품 3개 생성 (Basic / Pro / Unlimited)
- [ ] 각 상품에 Metadata 설정 (`plan_tier`, `monthly_*_limit`)
- [ ] Webhook URL 등록: `https://yourdomain.com/api/webhook`
- [ ] Webhook 이벤트 선택: `subscription.*`
- [ ] Customer Portal 활성화
- [ ] 테스트 모드에서 구독 결제 플로우 검증
- [ ] 프로덕션 Product ID를 환경변수에 등록

---

## 6. 전체 구현 진행 상황

### 헤어 분석 무료 3회
- [x] `stylist_free_trial_used` → `stylist_free_trial_count` 전환
- [x] state/로직 변경 (hasFreeTrial = count < 3)
- [x] 기존 사용자 마이그레이션 로직
- [x] 번역 문자열 5개 언어 업데이트
- [x] 남은 횟수 배지 UI
- [x] Upsell 조건 변경 (3회 소진 후에만)
- [x] 빌드 & 테스트

### 구독 서비스 (What to Wear Today) — $6.99/월, 7일 무료 체험
- [x] Phase 1: `/api/create-checkout` 구독 상품(daily_style) 지원
- [x] Phase 1: `/api/subscription-status` 엔드포인트
- [x] Phase 1: `/api/subscribe` 엔드포인트 (프로필+도시+R2 사진 저장)
- [x] Phase 1: Supabase `subscribers` + `daily_recommendations` 테이블
- [x] Phase 1: Cloudflare R2 바인딩 (사진 저장)
- [x] Phase 2: 랜딩 페이지 구독 카드 UI
- [x] Phase 2: 도시 입력 폼 + 시간대 자동감지
- [x] Phase 2: 결제 성공 후 구독 데이터 백엔드 저장
- [x] Phase 2: 구독 상태 확인 로직 (프론트엔드)
- [x] Phase 2: `/api/daily-style-cron` — 매일 6AM 날씨 기반 AI 스타일 이메일
- [x] Phase 3: Polar 웹훅 (`/api/polar-webhook`) — 구독 생성/갱신/취소/만료 처리
- [x] Phase 3: Customer Portal 링크 (대시보드 + 프로필 설정)
- [ ] Phase 4: 일회성 결제 단계적 종료 (선택)

### LTV/CAC 분석 ($6.99/월 기준)
- LTV: $6.99 × 8개월 = $55.92
- Organic CAC: ~$2.00 → LTV/CAC = ~28
- Paid CAC: ~$5.00 → LTV/CAC = ~11.2
- 모두 10 초과 ✓
