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

## FW26 컬렉션 — 12룩 프롬프트 (생성 대기)

법적 안전 명명: premium = **FW26 Atelier**, casual = **FW26 Essentials** (브랜드명 없음).
공통 프리픽스: "Full-body fashion catalog photograph of a complete outfit on a Korean [female/male] model, face turned away from camera, neutral seamless studio, soft even catalog lighting, garment textures crisp, no visible logos, photorealistic, 3:4"

### FW26 Atelier (premium 6)
1. F — double-faced camel cashmere wrap coat, chocolate turtleneck, ivory wide wool trousers, suede boots
2. F — dove-grey belted shearling-collar coat, cream ribbed knit dress, leather gloves
3. F — deep forest-green heavy cashmere cape coat, black fine knit, charcoal straight trousers
4. M — charcoal double-breasted flannel overcoat, oatmeal cashmere turtleneck, grey pleated trousers
5. M — dark-brown suede blouson, ecru chunky rollneck, olive heavy wool trousers, leather boots
6. M — midnight-navy cashmere chesterfield, ivory brushed knit, dark denim, polished loafers

### FW26 Essentials (casual 6)
1. F — cream boxy wool-blend short jacket, white tee, medium-wash straight jeans, white sneakers
2. F — light-grey longline padded coat, black knit, black straight trousers, chunky sneakers
3. F — camel oversized knit cardigan, ivory turtleneck, dark straight denim, ankle boots
4. M — navy quilted liner jacket, grey hoodie-free crewneck sweat, washed black jeans, trainers
5. M — dark-olive wool overshirt, white heavyweight tee, beige carpenter pants, retro sneakers
6. M — black puffer vest over charcoal knit, medium-grey wool trousers, white minimal sneakers

### ✅ 생성 완료 — 임포트 방법

12룩 전부 생성됨 (soul_2, 3:4, 로고 없음). 한 줄로 임포트:

```bash
CRON_SECRET=your_secret bash scripts/import-fw26.sh
```

스크립트가 12장을 R2 `style-refs/premium|casual/`로 넣고 목록을 출력한다.
서버가 URL을 직접 가져오므로 로컬 다운로드 불필요. 임포트 즉시 다음
데일리 발송과 $4.99 상품이 FW26 룩으로 스타일링된다.

이전 시즌을 걷어내려면 목록의 key를 DELETE 하면 된다 (시드 4장 등):
```bash
curl -X DELETE "https://kstylist.cc/api/style-refs?secret=$CRON_SECRET" \
  -H "Content-Type: application/json" -d '{"key":"style-refs/premium/seed-f-camel.png"}'
```
