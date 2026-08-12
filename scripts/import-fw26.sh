#!/usr/bin/env bash
# FW26 컬렉션 12룩을 R2 style-refs로 임포트한다.
# 서버가 URL을 직접 가져오므로 로컬 다운로드가 필요 없다.
#
#   CRON_SECRET=... bash scripts/import-fw26.sh
#
# 확인:  curl "https://kstylist.cc/api/style-refs?secret=$CRON_SECRET"
set -euo pipefail

: "${CRON_SECRET:?CRON_SECRET 환경변수가 필요합니다 (Cloudflare에 설정된 값)}"
BASE="${BASE_URL:-https://kstylist.cc}/api/style-refs?secret=${CRON_SECRET}"
CDN="https://d8j0ntlcm91z4.cloudfront.net/user_3GIv65H6DuhK0liNxN44tHwauC0"

import() { # tier name file
  echo "→ $2 ($1)"
  curl -sS -X POST "$BASE" -H "Content-Type: application/json" \
    -d "{\"tier\":\"$1\",\"name\":\"$2\",\"import_url\":\"$CDN/$3\"}"
  echo
}

# ── FW26 ATELIER (premium 6) ──
import premium fw26-atl-01 hf_20260812_231616_f039d787-3749-438f-828c-c5f36f75c6c2.png  # F 카멜 캐시미어 랩코트
import premium fw26-atl-02 hf_20260812_231616_5bbb0893-3bb8-4ee1-b902-bf34e7c45eaa.png  # F 시어링 칼라 벨티드 코트
import premium fw26-atl-03 hf_20260812_231616_e3b31d4f-91f7-47fc-a7c3-c23987cf3c42.png  # F 포레스트 그린 케이프 코트
import premium fw26-atl-04 hf_20260812_231616_82f5d430-1558-4e6a-97b6-d9db63272064.png  # M 차콜 더블 플란넬 오버코트
import premium fw26-atl-05 hf_20260812_231616_0c06b41c-1e8d-4ca1-ad74-03e6cfd3ff29.png  # M 다크브라운 스웨이드 블루종
import premium fw26-atl-06 hf_20260812_231616_197c1bd9-50eb-4ce8-95ef-e945f44cdeca.png  # M 미드나잇 네이비 체스터필드

# ── FW26 ESSENTIALS (casual 6) ──
import casual  fw26-ess-01 hf_20260812_231616_4de1c576-32f4-436b-9db7-426ff0acc4b1.png  # F 크림 박시 숏 재킷
import casual  fw26-ess-02 hf_20260812_231616_fcd6efa1-5427-495f-93e7-d9eff2c107c6.png  # F 라이트그레이 롱 패딩
import casual  fw26-ess-03 hf_20260812_231616_ff60163c-0e84-4552-8b66-c9e9f0c92f2f.png  # F 카멜 오버사이즈 가디건
import casual  fw26-ess-04 hf_20260812_231616_44d3f425-b668-4622-9440-4a9bbaab3feb.png  # M 네이비 퀼팅 라이너 재킷
import casual  fw26-ess-05 hf_20260812_231616_2c6bda63-bc62-4ef8-80eb-97cacde805f6.png  # M 다크올리브 울 오버셔츠
import casual  fw26-ess-06 hf_20260812_231616_e22b91e2-a705-4f4b-a453-b5868d06a442.png  # M 블랙 푸퍼 베스트

echo "완료 — 목록 확인:"
curl -sS "$BASE"
echo
