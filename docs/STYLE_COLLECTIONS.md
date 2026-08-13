# 시즌 컬렉션 시스템 — 실제 레퍼런스로 입히기

> 작동 원리: R2 `style-refs/premium/`(콰이어트 럭셔리)·`style-refs/casual/`(컨템포러리)의
> **실제 옷 사진이 생성 모델에 사람 사진과 함께 입력**되어, 텍스트 묘사가 아니라
> "그 옷"을 입힌다. 데일리는 dressy→premium, casual→casual 자동 매칭, 날짜 기준으로
> 룩이 회전. 폴더가 비면 기존 텍스트 방식으로 동작 (서비스 무중단).

## 시즌 교체 = API 호출 몇 번 (배포 불필요)

레퍼런스 추가 (서버가 URL을 직접 가져와 저장 — 로컬 다운로드 불필요):
```bash
curl -X POST "https://kstylist.cc/api/style-refs?secret=$CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"tier":"premium","name":"fw26-look-01","import_url":"https://...사진URL..."}'
```
목록 확인: `curl "https://kstylist.cc/api/style-refs?secret=$CRON_SECRET"`
삭제: `curl -X DELETE ... -d '{"key":"style-refs/premium/fw26-look-01.jpg"}'`

## 첫 시즌 시드 (AI 생성 — 무위험, 지금 바로 실행)

`$CRON_SECRET`을 Cloudflare에 설정된 값으로 바꿔 4번 실행:
```bash
S="YOUR_CRON_SECRET"; B="https://kstylist.cc/api/style-refs?secret=$S"
curl -X POST "$B" -H "Content-Type: application/json" -d '{"tier":"premium","name":"seed-f-camel","import_url":"https://d8j0ntlcm91z4.cloudfront.net/user_3GIv65H6DuhK0liNxN44tHwauC0/hf_20260812_141457_0576bb7c-cc18-4f62-b88f-a684a7032480.png"}'
curl -X POST "$B" -H "Content-Type: application/json" -d '{"tier":"premium","name":"seed-m-cashmere","import_url":"https://d8j0ntlcm91z4.cloudfront.net/user_3GIv65H6DuhK0liNxN44tHwauC0/hf_20260812_141457_a1d9f2da-41f7-43f6-b133-c01d74a26cfb.png"}'
curl -X POST "$B" -H "Content-Type: application/json" -d '{"tier":"casual","name":"seed-f-minimal","import_url":"https://d8j0ntlcm91z4.cloudfront.net/user_3GIv65H6DuhK0liNxN44tHwauC0/hf_20260812_141457_b27e6367-57b0-48f8-b6b7-ce18ebc23623.png"}'
curl -X POST "$B" -H "Content-Type: application/json" -d '{"tier":"casual","name":"seed-m-blazer","import_url":"https://d8j0ntlcm91z4.cloudfront.net/user_3GIv65H6DuhK0liNxN44tHwauC0/hf_20260812_141457_42647310-fc11-4fef-84d7-2b2b75131db7.png"}'
```

## ⚠️ 실제 브랜드 사진을 넣을 때의 선

기술적으로는 어떤 사진이든 레퍼런스로 동작한다. 단:

1. **UI·광고 문구에 브랜드명 금지** — "로로피아나 스타일로 입혀드립니다"는 상표권 침해 초대장. 컬렉션 명명은 "이탈리안 콰이어트 럭셔리", "컨템포러리 에센셜"처럼.
2. **브랜드 공식 화보/이커머스 사진을 그대로 넣는 것은 회색지대** — 저작권(사진)과 트레이드 드레스(시그니처 디자인 재현) 리스크. 안전한 순서:
   ① AI 생성 레퍼런스 (지금 시드 방식) ② 직접 촬영한 옷 사진 ③ 라이선스 이미지 ④ 브랜드 화보 (자기 책임)
3. 시즌 런웨이 컨셉 운영: 런웨이 사진을 직접 넣기보다, 그 시즌 미감을 AI 레퍼런스로 재생성해 넣는 것을 권장 — `docs/MODEL_PROMPTS.md` §5 지시문 활용. 요청하면 시즌당 몇 분 만에 세트로 생성해 준다.

## 티어 매핑

| 서비스 | premium 레퍼런스 | casual 레퍼런스 |
|---|---|---|
| 데일리 이메일 | Dressy 룩 | Casual 룩 |
| $4.99 단건 (3컷) | 1·3번째 컷 | 2번째 컷 |

## 시즌 컬렉션 — SS26 + FW26 (24룩, 생성 완료)

**온도 게이팅**: 파일명 접두사가 사용 시점을 결정한다.
`warm-*` → 18°C 이상에서만, `cold-*` → 18°C 미만에서만, 접두사 없음 → 항상.
27°C 한여름에 캐시미어 코트가 나가는 사고를 구조적으로 막는다.

### 임포트 (배포 불필요)
```bash
CRON_SECRET=실제값 bash scripts/import-collections.sh          # SS26 + FW26 24룩
CRON_SECRET=실제값 bash scripts/import-collections.sh ss26     # 지금 계절만
```

### SS26 (warm — 여름)
- **Atelier 6**: 오트밀 린넨 블레이저 / 스톤그레이 린넨 셔츠 / 아이보리 실크코튼+린넨와이드 / 샌드 린넨 셔츠드레스 / 도브그레이 니트폴로 / 토프니트+크림미디
- **Essentials 6**: 화이트티+그레이쇼츠 / 라이트그레이티+블랙팬츠 / 화이트티+라이트데님 / 베이지슬리브리스+에크루와이드 / 블랙티+에크루쇼츠 / 페일그레이셔츠+에크루팬츠

### FW26 (cold — 가을·겨울)
- **Atelier 6**: 카멜 캐시미어 랩코트 / 시어링 벨티드 / 포레스트그린 케이프 / 차콜 플란넬 오버코트 / 스웨이드 블루종 / 네이비 체스터필드
- **Essentials 6**: 크림 박시 숏재킷 / 라이트그레이 롱패딩 / 카멜 가디건 / 네이비 퀼팅라이너 / 올리브 오버셔츠 / 블랙 푸퍼베스트

### 색 규범 (2026-08 수정)
텍스트 폴백 팔레트에서 채도 높은 색 25종을 뮤트 뉴트럴로 교체하고
(coral·teal·burnt orange·electric blue 등 → stone·slate·clay·brass),
프롬프트에 **채도 상한 규칙**을 넣었다: 전체 룩을 sand·oatmeal·stone·greige·
taupe·charcoal·navy·ivory·olive 범위로 유지, 밝고 선명한 색 금지, 액센트는
가죽·금속 디테일에서만. 레퍼런스가 없을 때의 결과도 조용해진다.

이전 시즌 정리:
```bash
curl -X DELETE "https://kstylist.cc/api/style-refs?secret=$CRON_SECRET" \
  -H "Content-Type: application/json" -d '{"key":"style-refs/premium/seed-f-camel.png"}'
```
