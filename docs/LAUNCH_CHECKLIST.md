# 수익 스위치 체크리스트

> 이 문서의 모든 ⬜가 ✅가 되는 순간, 광고를 틀어도 되는 상태다.
> 코드 쪽은 완료: 결제 경로 테스트 10종 보호, 감사 기록(ops_events), 환불·크론 실패 오너 알림.

## A. 결제 인프라 (Polar) — 최우선

- ⬜ Polar 대시보드에서 3개 상품이 **활성**인지: full($4.99, `533aed39`), daily($6.99/mo, `2c761310`), chat_tokens($0.99, `32416265`)
- ⬜ **Webhook 설정**: Polar → Settings → Webhooks에 `https://kstylist.cc/api/polar-webhook` 등록, 이벤트: subscription.* + order.created. 발급된 secret을 Cloudflare env **`POLAR_WEBHOOK_SECRET`** 로 저장 ← 이게 없으면 서명 검증이 꺼진 채 돌아간다
- ⬜ 기존 구독자에게 COMEBACK50이 붙어있는지 확인 (신규는 코드가 차단, 기존은 수동 정리)
- ⬜ **실결제 3종 테스트**: $4.99 → 블러 해제+PDF / 구독 → 다음날 이메일 / $0.99 → 채팅 10회

## B. Cloudflare 환경변수 (Production)

- ⬜ 기본 8종 존재 확인: OPENAI/GEMINI/POLAR/RESEND/SUPABASE(URL·SERVICE_KEY)/OPENWEATHER/CRON_SECRET
- ⬜ `POLAR_WEBHOOK_SECRET` (A에서)
- ⬜ `VAPID_PRIVATE_JWK` (푸시 — 채팅으로 전달한 파일 내용. 2026-08-13에 키를 재발급했으니 **새 파일**을 쓰세요. 공개키는 코드에 반영 완료)
- ⬜ (선택) `OWNER_ALERT_EMAIL` — 미설정 시 mdjypark@gmail.com으로 알림
- ⬜ 변수 추가 후 **Retry deployment** 1회

## C. 데이터베이스 (Supabase SQL Editor에서 1회)

- ✅ 001~010 적용됨 (2026-08-19: 008 ops_events + 009 journal_subscribers + 010 보안 하드닝을 프로덕션에 직접 적용·검증 완료 — 사용자 작업 불필요)

## D. 에셋

- ⬜ 로컬에서 `node scripts/fetch-assets.mjs` 실행 → commit → push (히어로 필름/비포·애프터/서비스 카드/360 프레임 일괄 배치)

## E. 기능 스모크 (시크릿 창)

- ⬜ 랜딩: 날씨 eyebrow + 대기효과 / 서비스 인덱스 3종 / 헤어 스튜디오 무료 생성
- ⬜ 로그인: 홈=오늘 → 대시보드 → 내 옷장 업로드 → 오늘의 룩 좋아요/별로예요 → "내일 추천에 반영돼요"
- ⬜ 아침 알림 켜기 → 다음날 7시 이메일+푸시 동시 수신, **등록한 옷 위주 코디인지**

## F. 법적 표시

- ✅ 상호/대표/문의 푸터 표시
- ⬜ 사업자등록번호·통신판매업 신고번호 발급 후 푸터에 추가 (App.tsx `footer-business` 블록, 주석 위치)

## 운영 중 모니터링 (런칭 후)

- 환불이 발생하면 **자동으로 이메일이 온다** — 오면 이미지 생성 실패율부터 확인
- 크론이 대상 대비 30% 이상 실패하면 **자동으로 이메일이 온다**
- 주간 리뷰: `docs/LOOP_PLAN.md` §7 프롬프트로 세션 시작 → ops_events/GA4 숫자로 다음 사이클 결정
