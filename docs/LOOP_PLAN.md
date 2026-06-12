# kstylist.cc — Loop Engineering 마스터플랜

> 작성: 2026-06-12 · 3개 트랙(성장/수익/품질) 병렬 분석 종합
> 운영 원칙: **매주 1사이클 (Build → Ship → Measure → Decide)**. 이 문서가 매 사이클의 기준점이다.
> 각 사이클 종료 시 §7 체크리스트를 실행하고, 이 문서의 상태 표를 갱신한다.

---

## 0. 북극성 지표 (North Star)

**주간 신규 유료 전환 수** (full $4.99 + daily 구독 시작 합산)

| 가드레일 지표 | 기준 |
|---|---|
| 데일리 구독자당 월 COGS | **$2.5 이하** (현재 추정 $13–16, §2 참고) |
| 결제 경로 테스트 커버리지 | money-path 핸들러 테스트 6종 green |
| 크론 발송 실패율 | 30% 초과 시 알림 (ops_events 기반) |
| 환불률 | 주간 10% 초과 시 원인 분석 우선 |

**킬/피벗 기준**: 콘텐츠 유통 4주 실행 후 — 유료 전환 누적 10건 미만 **그리고** 콘텐츠 최고 조회수 1만 미만이면 적극 투자 중단(유지 모드 전환 또는 종료) 결정.

---

## 1. 현재 상태 요약 (2026-06-12 기준)

- 보안: refund 잠금, unsubscribe HMAC, 레이트리밋, 죽은 엔드포인트 7개 제거 완료
- 치명 버그 수정: 유료 결과가 무료로 전달되던 버그, 빌드 차단 문법 오류
- 기능: 리퍼럴 크레딧 사용 연결, Style Advisor 채팅 복구, Supanova 디자인 패스 완료
- **미해결 핵심 문제 3개**:
  1. 데일리 구독 **마진 적자** (구독자당 월 −$6~−$10 추정)
  2. 바이럴 보상 마찰 과다 (친구 "결제" 필요 → "가입"으로 낮춰야 함)
  3. 서버 인증 부재 (body의 email/user_id를 신뢰 — 구조적 패턴)

---

## 2. Phase 0 — 출혈 차단 (1주차, 전부 S 난이도)

> 목표: 돈이 새는 곳을 막고 루프를 돌릴 기반(CI)을 만든다. 마케팅 시작 전 필수.

| # | 작업 | 핵심 앵커 | 왜 |
|---|---|---|---|
| 0-1 | **데일리 이미지 품질 핀**: `editPhotoWithOpenAI`에 quality 파라미터 추가, 크론은 `medium`(또는 `low`), 단건 상품은 기존 auto 유지 | `functions/lib/openai-image.ts:52` (`size:'auto', quality:'auto'`), `daily-style-cron.ts` | 이메일은 이미지를 **240px**로 표시하는데 최고품질(1024×1536 high)로 생성 중. 월 $13–16 → $4–5 |
| 0-2 | **데일리 경로 모델 순서 교체**: 크론 호출만 Gemini 2.5 Flash 우선, OpenAI 폴백 (단건 상품은 OpenAI 우선 유지) | `functions/lib/gemini-image.ts:148-167` | 월 ~$2.40까지 추가 절감. 얼굴 재현성 A/B 확인 필요 |
| 0-3 | **COMEBACK50을 구독에서 제외** | `create-checkout.ts:72` | 적자 구독에 50% 반복 할인은 최악의 쿠폰. Polar에서 구독 할인 적용 방식(1회/영구)도 확인 |
| 0-4 | **공유 라우팅 한 줄 수정**: `public/_routes.json` include에 `"/share/*"` 추가 | `functions/share/[id].ts`는 이미 존재하나 도달 불가 | 죽어있는 동적 OG 기능의 전제조건 |
| 0-5 | **워터마크 마무리**: 그림자 그리기 순서 버그(흰 글자 위에 그림자), R2 버킷 CORS 설정 확인(없으면 원격 이미지 저장 시 워터마크 전부 누락), `image_download` 이벤트에 `watermarked` 파라미터 | `App.tsx:4071-4077`, `4057`, `3547` | 저장된 모든 이미지가 유통 채널이 되게 |
| 0-6 | **CI 구축**: `.github/workflows/ci.yml` (typecheck + vitest + lint). `eslint.config.js` globalIgnores에 `'design'` 추가, `App.tsx:2391` escape 오류 1건 수정 | `.github/` 현재 없음 | "빌드 깨진 채 배포" 재발 방지 (commit 2b463bd 사례) |
| 0-7 | **시즌 라벨 구조화**: `/api/analyze`가 12타입 시즌 라벨(`season`, `season_label`)을 구조적으로 반환 (현재 regex 후 버림) | `analyze.ts:373, 380-413, 422`, `App.tsx:2337 parseStyleDNA`(폴백으로 강등), `5787` 하드코딩 수정 | Phase 2 전체의 전제. "가을 웜 뮤트" = 공유되는 정체성 |

**Phase 0 완료 판정**: 데일리 구독자당 일일 이미지 원가 $0.105 이하 + CI green + `/share/test`가 404가 아님.

---

## 3. Phase 1 — 측정 가능하게 + 기반 보안 (2~3주차)

> 목표: 루프의 "Measure"가 실제로 작동하게 만든다. 측정 없는 실험은 루프가 아니다.

| # | 작업 | 난이도 | 핵심 앵커 |
|---|---|---|---|
| 1-1 | 클라이언트 퍼널 이벤트 보강: `free_result_view`(또는 result_view에 is_paid), `paywall_impression {placement}` | S | `App.tsx:5919` 클릭만 있고 노출 이벤트 없음 |
| 1-2 | **서버사이드 구매 진실원장**: `polar-webhook.ts`의 `order.created`(현재 log-only)에서 GA4 Measurement Protocol로 `purchase` 발신. `checkout_session_id`를 Polar metadata로 조인 | M | 모바일 탭 닫힘으로 유실되는 구매 이벤트 복구. 구독 trial/active 분리 이벤트도 함께 |
| 1-3 | **ops_events 감사 테이블**: 마이그레이션 `006`(§5의 성장 컬럼과 함께 작성), `functions/lib/ops-log.ts` fire-and-forget 헬퍼. 기록 지점: polar-webhook 전체, refund(거부 포함 — 보안 시그널), cron summary | M | 크론 결과가 현재 증발. 환불 분쟁 시 기록 없음 |
| 1-4 | **알림**: cron 실패율 >30% 또는 eligible>0 & sent=0 → Resend로 `OWNER_ALERT_EMAIL` 발송. 환불 발생 시 건별 메일 | S | "유료 이메일이 며칠째 안 나감"을 즉시 인지 |
| 1-5 | **인증 헬퍼 + 고위험 3종 수정**: `functions/lib/auth.ts` (Supabase Bearer 토큰 → `/auth/v1/user` 검증). 적용: ①cancel-subscription/customer-portal(임의 이메일로 남의 구독 해지·포털 접근) ②update-subscriber-profile ③referral use_credit(남의 크레딧 소진) + 전환 기록을 webhook 서버사이드로 이동 | M | 크레딧 = 돈. 마케팅으로 주목받기 전에 닫아야 함 |
| 1-6 | **Money-path 핸들러 테스트 6종**: vitest에서 핸들러 직접 호출 + `vi.stubGlobal('fetch')` URL 라우팅 목. 대상: analyze(유료 플래그 회귀 포함), create-checkout, referral use_credit, refund 가드, polar-webhook HMAC, unsubscribe 왕복 | M | 703cd1d급 버그(결제 미전달)의 재발 차단. `_middleware`가 핸들러 밖이라 목 충돌 없음 확인됨 |
| 1-7 | **번역 분리**: `translations` 객체(~2,200줄, App.tsx의 1/3) → `src/i18n/translations.ts`. + `trackEvent`류 → `src/lib/analytics.ts` | S | Phase 2의 3개 기능이 전부 App.tsx 결과 페이지 블록을 건드림 — 충돌 표면적 축소 선행 |
| 1-8 | Resend 오픈 트래킹 + `daily_recommendations.opened_at` 저장 | M | 구독 30일 리텐션은 GA4가 아니라 Supabase SQL로 계산 (제품이 이메일에서 소비됨) |

**Phase 1 완료 판정**: 대시보드(GA4 + Supabase 쿼리)에서 방문→체험→페이월→구매→구독→30일 리텐션이 숫자로 보임.

---

## 4. Phase 2 — 바이럴 엔진 (3~5주차)

> 목표: 공유할 이유를 "$4.99 절약(나중)"에서 "내 결과 더 보기(지금)"로 바꾼다.

### 2-A. 동적 OG 공유 페이지 (M) — *절반은 이미 존재*
- 발견: `functions/share/[id].ts`(크롤러 분기 OG HTML)와 `005_shared_results.sql`이 **이미 구현돼 있으나** 라우팅 누락(0-4에서 해결) + 생성 엔드포인트/프론트 호출이 없어 완전히 죽은 코드.
- 신규 `functions/api/share-result.ts`: 클라이언트가 이미 렌더링하는 1200×628 OG 캔버스(`src/utils/shareCard.ts:143-198`)를 업로드 받아 R2 `share-cards/{uuid}.png` 저장(`favorite-image.ts:48-90` 패턴 재사용) + `shared_results` insert. 서버사이드 렌더링(Satori 등) 불필요.
- 공유 모달에 **옵트인 문구** 필수: "시즌+팔레트만 공개, 사진은 절대 포함 안 됨". 카드에 얼굴 사진 미포함 (v1).
- `share/[id].ts` 리다이렉트를 해시 파라미터에서 실쿼리(`?shared=ID&ref=CODE`)로 수정 — 현재 형태는 `App.tsx:2691`의 파서가 못 읽음.
- 측정: `share_link_created`, `share_visit`, `/share/*` 유입의 분석 시작 수.

### 2-B. 초대-잠금해제 (M) — *보상 화폐 분리가 핵심*
- 친구 **가입**(이메일 인증 완료) 시 추천인의 블러 이미지 1장 해제. 기존 `available_credits`(=완전 무료권)와 **별도 화폐** `image_unlocks`로, 최대 3 캡 (어뷰징 가치 제거).
- 어뷰징 방어 스택: ①Supabase Admin API로 `email_confirmed_at` 확인(미인증=무효) ②일회용 도메인 차단 목록 ③기존 자기추천 차단 ④`stylist_device_id` 해시 비교(같은 브라우저 자작 차단) ⑤IP 해시 일일 캡.
- 잠금 오버레이(`App.tsx:5860`)에 2번째 CTA: "친구 초대하고 이 이미지 무료로 열기" → 기존 공유 모달.
- 가입 전환 기록은 반드시 **서버 검증** (현재 구매 전환 기록이 클라이언트발인 것과 달리, 가입 보상은 curl로 위조 가능).
- 측정: 결과 페이지 뷰당 인증된 추천 가입 수 (목표 >0.05).

### 2-C. 시즌 정체성 카드 통합 (S)
- 0-7의 구조화된 라벨을 두 카드 생성기(`shareCard.ts` 시즌 카드 / `App.tsx:4082` 아웃핏 카드 — 후자는 시즌 텍스트가 아예 없음)에 통일 적용. 아웃핏 카드를 `shareCard.ts`로 통합하는 방향.
- 12타입 라벨 실패 시 4계절 라벨 폴백, "Unknown"은 카드 버튼 자체를 숨김.
- 측정: 분석 완료당 공유 카드 생성률, 시즌별 공유 세그먼트.

**Phase 2 완료 판정**: 공유 링크가 받은 사람에게 개인화된 카드로 보이고, `/share/*` 유입이 GA4에 잡히며, 초대-가입-해제 루프가 1회 이상 실제로 작동.

---

## 5. Phase 3 — 가격/패키징 실험 (5주차~, 측정 기반)

> 전제: Phase 0 원가 수정 없이 번들 실험 금지 (서빙 원가 ~$13인 채로 $9.99 번들을 팔면 안 됨).

| 실험 | 난이도 | 알게 되는 것 |
|---|---|---|
| $6.99 vs $9.99 데일리 가격 분할 테스트 (`create-checkout.ts:57`의 `body.productId` 오버라이드 활용) | S | 가격 탄력성. $9.99면 이미지당 $0.13에서도 흑자 |
| KRW 표시 가격 (`lang==='ko'`일 때 ₩ 병기, 결제는 USD 유지) | S | USD 결제 마찰이 한국 전환을 누르고 있는지. 효과 크면 국내 PG 도입 근거 |
| $9.99 번들: full + 30일 데일리 (webhook `order.created`에서 `current_period_end` 30일 부여 — 크론이 이미 기간 만료를 존중) | M | 데일리가 단독 구독보다 "히어로 구매에 붙는 유료 체험"으로 더 잘 팔리는지. 번들 테이크레이트 >15% & 번들→정기 전환 >20% |
| 연간 플랜 $49–59 | S | 리텐션 데이터(1-8) 확보 후 판단 |
| 구독자별 이미지 라이브러리 (온도 밴드별 10–14룩 사전 생성, R2 키 `(subscriber, temp-band, kit)`, 월 1회 갱신) | M–L | 구조적 원가 해결 (~$1–2/월). 교차 사용자 캐시는 불가(본인 사진 편집물) — 시나리오 회전 체계가 일 단위 캐시를 의도적으로 깨는 구조임을 유의 (`daily-style-scenarios.ts:159-169`) |
| 미오픈 구독자 발송 중단 (Resend 오픈 N회 연속 0 → suppression) | M | 비활성 구독자 원가 0화. 오픈 시점 생성 방식은 Apple MPP 때문에 비추천 |

---

## 6. 상시 백로그 (여유 시 1주 1개)

- 보안 중위험: subscription-status PII 응답 축소(신체치수 노출 중), send-payment-email/send-report에 checkout_id 검증, favorite-image 인증+자체 도메인 제한, subscribe.ts 사진 크기 캡
- `src/lib/api.ts` 점진 도입 (새 코드부터; 인증 헤더 부착 지점 단일화)
- 크론 스테이징 스모크: `scripts/smoke-cron.mjs` — 배포본에 `?force=true` + 테스트 구독자 1명, JSON summary 검증
- `parseStyleDNA` 단위 테스트 (AI 출력 파싱 — 취약 클래스)
- CLAUDE.md 현행화 (5개 언어 규칙 → ko/en, 파일 구조에서 삭제된 엔드포인트 제거, 이 문서 링크 추가)
- 모놀리스 추가 분리는 **하지 않음** (명시적 비목표)

---

## 7. 주간 루프 운영 절차

매주 1회 (권장: 월요일) Claude Code 세션에서:

```
docs/LOOP_PLAN.md를 읽고 이번 주 사이클을 실행해줘.
1. MEASURE: GA4 퍼널 숫자와 Supabase(ops_events, daily_recommendations) 쿼리로
   북극성 지표·가드레일 현황을 표로 정리 (내가 GA4 숫자를 붙여넣을게)
2. DECIDE: 현재 Phase의 완료 판정 기준과 대조해 이번 주 작업 1~3개 선정
   (가드레일 위반이 있으면 그것이 무조건 최우선)
3. BUILD: 선정 작업 구현 + 테스트 + 커밋
4. SHIP: 푸시. 배포는 내가 npm run deploy로 실행
5. 이 문서의 상태 표를 갱신하고 커밋
```

- **세션 내 자동 반복이 필요할 때만** `/loop` 사용 (예: "CI가 green이 될 때까지 30분마다 확인"). 주의: 원격 세션은 휘발성이라 `/loop`는 세션이 살아있는 동안만 동작 — 주간 사이클은 위 프롬프트로 새 세션을 여는 방식이 맞다.
- PR 기반으로 작업할 경우 세션에 PR 감시를 맡기면 CI 실패·리뷰 코멘트에 자동 대응 가능.

## 8. 상태 추적

| Phase | 상태 | 완료일 | 메모 |
|---|---|---|---|
| Phase 0 출혈 차단 | ⬜ 미착수 | | |
| Phase 1 측정+보안 | ⬜ 미착수 | | |
| Phase 2 바이럴 엔진 | ⬜ 미착수 | | |
| Phase 3 가격 실험 | ⬜ 미착수 | | Phase 0·1 완료가 전제 |
| 유통(콘텐츠) 4주 실험 | ⬜ 미착수 | | 킬 기준의 시계가 여기서 시작 |
