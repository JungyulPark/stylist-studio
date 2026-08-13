#!/usr/bin/env bash
# 시즌 컬렉션 임포트 — SS26(더운 날)과 FW26(추운 날) 24룩을 R2에 넣는다.
# 서버가 URL을 직접 가져오므로 로컬 다운로드가 필요 없다.
#
#   CRON_SECRET=... bash scripts/import-collections.sh          # 전체
#   CRON_SECRET=... bash scripts/import-collections.sh ss26     # 지금 계절만
#
# 파일명 접두사가 온도 게이팅을 결정한다:
#   warm-*  →  18°C 이상에서만 사용
#   cold-*  →  18°C 미만에서만 사용
set -euo pipefail

: "${CRON_SECRET:?CRON_SECRET 환경변수가 필요합니다 (Cloudflare에 설정된 값)}"
WHICH="${1:-all}"
BASE="${BASE_URL:-https://kstylist.cc}/api/style-refs?secret=${CRON_SECRET}"
CDN="https://d8j0ntlcm91z4.cloudfront.net/user_3GIv65H6DuhK0liNxN44tHwauC0"

import() { # tier name file
  printf '→ %-22s (%s)\n' "$2" "$1"
  curl -sS -X POST "$BASE" -H "Content-Type: application/json" \
    -d "{\"tier\":\"$1\",\"name\":\"$2\",\"import_url\":\"$CDN/$3\"}" >/dev/null
}

if [ "$WHICH" = "all" ] || [ "$WHICH" = "ss26" ]; then
  echo "── SS26 (18°C 이상에서 사용) ──"
  # Atelier — 여름 콰이어트 럭셔리 (린넨·실크코튼, 전부 뮤트 뉴트럴)
  import premium warm-ss26-atl-01 hf_20260813_053814_7f49e275-b917-4fb5-a377-7461ba68a550.png  # M 오트밀 린넨 블레이저
  import premium warm-ss26-atl-02 hf_20260813_053814_0cf1c914-1108-4b36-b07c-ff2be61ae8c6.png  # M 스톤그레이 린넨 셔츠
  import premium warm-ss26-atl-03 hf_20260813_053814_12e389ea-f271-4a98-a8e2-cdff45dfb528.png  # F 아이보리 실크코튼 + 린넨 와이드
  import premium warm-ss26-atl-04 hf_20260813_053814_67d8d2af-ab3d-41df-8af5-8e84e1102b08.png  # F 샌드 린넨 셔츠 드레스
  import premium warm-ss26-atl-05 hf_20260813_053814_c4c02218-fc42-4bc8-b5cb-404218043508.png  # M 도브그레이 니트 폴로
  import premium warm-ss26-atl-06 hf_20260813_053814_57d1cf9c-a085-4e24-80d3-c7412a5ee4cd.png  # F 토프 니트 + 크림 미디
  # Essentials — 여름 미니멀 (무채색 코튼)
  import casual  warm-ss26-ess-01 hf_20260813_053814_2598352a-6ca6-4098-b4cd-484040c8e8d3.png  # M 화이트 티 + 그레이 쇼츠
  import casual  warm-ss26-ess-02 hf_20260813_053814_d2caee7b-c9d1-4944-9eee-97412027c518.png  # M 라이트그레이 티 + 블랙 팬츠
  import casual  warm-ss26-ess-03 hf_20260813_053814_80f318c0-0c14-41d6-aef8-4befdad26153.png  # F 화이트 티 + 라이트 데님
  import casual  warm-ss26-ess-04 hf_20260813_053814_e9819c02-f5ff-4cfd-be98-242a80909ded.png  # F 베이지 슬리브리스 + 에크루 와이드
  import casual  warm-ss26-ess-05 hf_20260813_053814_d88fb4ff-9a62-4306-b296-8678b2ecda4e.png  # M 블랙 티 + 에크루 쇼츠
  import casual  warm-ss26-ess-06 hf_20260813_053814_3f6da86a-3f42-4136-8caa-b984e75b0519.png  # F 페일그레이 셔츠 + 에크루 팬츠
fi

if [ "$WHICH" = "all" ] || [ "$WHICH" = "fw26" ]; then
  echo "── FW26 (18°C 미만에서 사용) ──"
  import premium cold-fw26-atl-01 hf_20260812_231616_f039d787-3749-438f-828c-c5f36f75c6c2.png  # F 카멜 캐시미어 랩코트
  import premium cold-fw26-atl-02 hf_20260812_231616_5bbb0893-3bb8-4ee1-b902-bf34e7c45eaa.png  # F 시어링 칼라 벨티드 코트
  import premium cold-fw26-atl-03 hf_20260812_231616_e3b31d4f-91f7-47fc-a7c3-c23987cf3c42.png  # F 포레스트그린 케이프
  import premium cold-fw26-atl-04 hf_20260812_231616_82f5d430-1558-4e6a-97b6-d9db63272064.png  # M 차콜 플란넬 오버코트
  import premium cold-fw26-atl-05 hf_20260812_231616_0c06b41c-1e8d-4ca1-ad74-03e6cfd3ff29.png  # M 스웨이드 블루종
  import premium cold-fw26-atl-06 hf_20260812_231616_197c1bd9-50eb-4ce8-95ef-e945f44cdeca.png  # M 네이비 체스터필드
  import casual  cold-fw26-ess-01 hf_20260812_231616_4de1c576-32f4-436b-9db7-426ff0acc4b1.png  # F 크림 박시 숏재킷
  import casual  cold-fw26-ess-02 hf_20260812_231616_fcd6efa1-5427-495f-93e7-d9eff2c107c6.png  # F 라이트그레이 롱패딩
  import casual  cold-fw26-ess-03 hf_20260812_231616_ff60163c-0e84-4552-8b66-c9e9f0c92f2f.png  # F 카멜 가디건
  import casual  cold-fw26-ess-04 hf_20260812_231616_44d3f425-b668-4622-9440-4a9bbaab3feb.png  # M 네이비 퀼팅 라이너
  import casual  cold-fw26-ess-05 hf_20260812_231616_2c6bda63-bc62-4ef8-80eb-97cacde805f6.png  # M 올리브 오버셔츠
  import casual  cold-fw26-ess-06 hf_20260812_231616_e22b91e2-a705-4f4b-a453-b5868d06a442.png  # M 블랙 푸퍼 베스트
fi

echo
echo "완료 — 현재 컬렉션:"
curl -sS "$BASE"
echo
