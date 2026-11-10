/**
 * "오늘 뭐 입지" 검색 페이지 데이터 — 기온 구간별 옷차림 공식과 도시 목록.
 *
 * 문구 규칙: 실제 브랜드명 금지, 이모지 금지, 조용한 럭셔리 톤.
 * 이미지는 랜딩 쇼케이스 컷을 재사용한다 (scripts/fetch-assets.mjs가 새 모델로 교체).
 */

export type WtwLang = 'en' | 'ko'

export interface BandCopy {
  name: string
  verdict: string
  layers: string
  outer: string
  top: string
  bottom: string
  shoes: string
  extra: string
  fabrics: string
  palette: string
  note: string
  /** "N도는 추운가요?"에 대한 답 */
  isCold: string
}

export interface Band {
  id: string
  /** 포함 하한 (°C). 가장 추운 구간은 -Infinity */
  min: number
  /** 포함 상한 (°C). 가장 더운 구간은 Infinity */
  max: number
  images: [string, string]
  en: BandCopy
  ko: BandCopy
}

export const DEGREE_MIN = -10
export const DEGREE_MAX = 35

// v2 = 2026-11 브랜드 모델. /*.webp는 1년 immutable 캐시라, 이미지를 바꿀 때는 경로를 새로 판다
const LOOK = (n: number) => `/gallery/showcase/v2/look-0${n}.webp`

// 따뜻한 순서 → 추운 순서
export const BANDS: Band[] = [
  {
    id: 'hot', min: 28, max: Infinity, images: [LOOK(5), LOOK(4)],
    en: {
      name: 'Hot', verdict: 'Dress to let air move: one breathable layer, nothing more.', layers: '1 layer',
      outer: 'None. Carry a thin overshirt only for air-conditioned rooms',
      top: 'Linen or seersucker shirt, loose cotton tee',
      bottom: 'Linen trousers, relaxed shorts or a light midi skirt',
      shoes: 'Leather sandals or canvas slip-ons',
      extra: 'Sunglasses, a straw hat, a breathable tote',
      fabrics: 'Linen, seersucker, cotton voile',
      palette: 'Bone, sand, washed white and pale stone. Light colours reflect heat.',
      note: 'Midday is the peak; mornings can run five degrees cooler.',
      isCold: 'No. It is hot: dress for heat and sun.',
    },
    ko: {
      name: '무더위', verdict: '바람이 통하게, 통기성 좋은 한 겹이면 충분합니다.', layers: '1겹',
      outer: '없음. 실내 냉방용 얇은 셔츠만 챙기기',
      top: '린넨·시어서커 셔츠, 루즈한 코튼 티',
      bottom: '린넨 팬츠, 여유 있는 반바지, 가벼운 미디 스커트',
      shoes: '레더 샌들, 캔버스 슬립온',
      extra: '선글라스, 라피아 햇, 통기성 좋은 토트',
      fabrics: '린넨, 시어서커, 코튼 보일',
      palette: '본, 샌드, 워시드 화이트, 페일 스톤. 밝은 색이 열을 반사합니다.',
      note: '한낮이 가장 덥고, 아침은 5도 정도 낮을 수 있어요.',
      isCold: '아니요. 더운 날씨입니다. 더위와 햇볕에 맞춰 입으세요.',
    },
  },
  {
    id: 'warm', min: 23, max: 27, images: [LOOK(5), LOOK(4)],
    en: {
      name: 'Warm', verdict: 'Short sleeves by day, one light layer in reserve for the evening.', layers: '1 layer, plus 1 in the bag',
      outer: 'Unlined cotton overshirt or a light linen jacket, for the evening',
      top: 'Short-sleeve knit polo, cotton tee, fluid blouse',
      bottom: 'Cotton chinos, light straight-leg denim, linen-blend trousers',
      shoes: 'Clean leather sneakers, loafers without socks',
      extra: 'A light scarf for air conditioning',
      fabrics: 'Cotton, linen blends, fine-gauge knit',
      palette: 'Ecru, light grey and sand, with a navy accent.',
      note: 'Air-conditioned offices run cold. A thin layer saves the afternoon.',
      isCold: 'No. It is warm: most people are comfortable in short sleeves.',
    },
    ko: {
      name: '더움', verdict: '낮엔 반팔, 저녁을 위해 얇은 한 겹만 챙기세요.', layers: '1겹 (+가방 속 1겹)',
      outer: '언라인드 코튼 오버셔츠, 가벼운 린넨 재킷 (저녁용)',
      top: '반팔 니트 폴로, 코튼 티, 흐르는 블라우스',
      bottom: '코튼 치노, 연한 스트레이트 데님, 린넨 혼방 팬츠',
      shoes: '깔끔한 레더 스니커즈, 맨발 로퍼',
      extra: '냉방 대비 얇은 스카프',
      fabrics: '코튼, 린넨 혼방, 하이게이지 니트',
      palette: '에크루, 라이트 그레이, 샌드에 네이비 포인트.',
      note: '냉방이 센 사무실은 쌀쌀해요. 얇은 한 겹이 오후를 지켜줍니다.',
      isCold: '아니요. 따뜻한 날씨라 대부분 반팔이 편합니다.',
    },
  },
  {
    id: 'mild', min: 20, max: 22, images: [LOOK(3), LOOK(4)],
    en: {
      name: 'Mild', verdict: 'Long sleeves, light fabrics: the easiest weather of the year to dress well.', layers: '1 to 2 layers',
      outer: 'Optional: a cotton cardigan or an unstructured blazer',
      top: 'Long-sleeve tee, fine knit, oxford shirt',
      bottom: 'Chinos, straight-leg denim, wide cotton trousers',
      shoes: 'Loafers, leather sneakers, ballet flats',
      extra: 'A slim belt and a watch. Details show in mild weather',
      fabrics: 'Cotton, fine merino, poplin',
      palette: 'Oatmeal, stone and soft navy.',
      note: 'Mornings and evenings can dip below 18°C, so keep the cardigan close.',
      isCold: 'Not really. It is mild: long sleeves are comfortable and a jacket is optional.',
    },
    ko: {
      name: '포근함', verdict: '긴팔에 가벼운 소재, 일 년 중 옷 입기 가장 좋은 날씨입니다.', layers: '1~2겹',
      outer: '선택: 코튼 카디건 또는 언스트럭처드 블레이저',
      top: '긴팔 티, 얇은 니트, 옥스퍼드 셔츠',
      bottom: '치노, 스트레이트 데님, 와이드 코튼 팬츠',
      shoes: '로퍼, 레더 스니커즈, 발레 플랫',
      extra: '슬림한 벨트와 시계. 포근한 날엔 디테일이 보입니다',
      fabrics: '코튼, 얇은 메리노, 포플린',
      palette: '오트밀, 스톤, 소프트 네이비.',
      note: '아침저녁엔 18도 아래로 내려갈 수 있어요. 카디건을 가까이 두세요.',
      isCold: '아니요. 포근한 날씨라 긴팔이면 충분하고 겉옷은 선택입니다.',
    },
  },
  {
    id: 'fresh', min: 17, max: 19, images: [LOOK(3), LOOK(2)],
    en: {
      name: 'Fresh', verdict: 'A light outer layer earns its place now.', layers: '2 layers',
      outer: 'Light jacket, overshirt or a cotton trench worn open',
      top: 'Fine knit or a long-sleeve shirt',
      bottom: 'Wool-blend trousers, mid-wash denim',
      shoes: 'Loafers, suede sneakers, low boots',
      extra: 'A thin knit scarf for the evening',
      fabrics: 'Cotton twill, light wool, fine knit',
      palette: 'Stone, taupe, navy and ivory.',
      note: 'The sun feels warm and the shade does not. Dress for the shade.',
      isCold: 'It is fresh: most people want a light jacket, especially in the shade.',
    },
    ko: {
      name: '선선함', verdict: '이제 가벼운 아우터 한 벌이 제 몫을 합니다.', layers: '2겹',
      outer: '가벼운 재킷, 오버셔츠, 앞을 연 코튼 트렌치',
      top: '얇은 니트, 긴팔 셔츠',
      bottom: '울 혼방 팬츠, 중청 데님',
      shoes: '로퍼, 스웨이드 스니커즈, 로우 부츠',
      extra: '저녁용 얇은 니트 스카프',
      fabrics: '코튼 트윌, 가벼운 울, 얇은 니트',
      palette: '스톤, 토프, 네이비, 아이보리.',
      note: '햇볕은 따뜻해도 그늘은 서늘해요. 그늘 기준으로 입으세요.',
      isCold: '선선한 날씨입니다. 특히 그늘에서는 가벼운 재킷이 필요해요.',
    },
  },
  {
    id: 'cool', min: 12, max: 16, images: [LOOK(1), LOOK(2)],
    en: {
      name: 'Cool', verdict: 'Jacket weather: a real outer layer over a knit.', layers: '2 to 3 layers',
      outer: 'Trench coat, wool-blend jacket or a light suede jacket',
      top: 'Merino crewneck, or a shirt under a fine knit',
      bottom: 'Wool trousers, dark denim',
      shoes: 'Leather loafers, chelsea boots',
      extra: 'A light scarf you can take off',
      fabrics: 'Gabardine, wool blends, merino',
      palette: 'Camel, charcoal, stone and ecru.',
      note: 'A ten-degree swing between morning and afternoon is common. Layers you can remove beat one heavy piece.',
      isCold: 'It is cool: you will want a proper jacket.',
    },
    ko: {
      name: '쌀쌀함', verdict: '재킷의 계절, 니트 위에 제대로 된 아우터 한 벌.', layers: '2~3겹',
      outer: '트렌치코트, 울 혼방 재킷, 가벼운 스웨이드 재킷',
      top: '메리노 크루넥, 또는 셔츠 위 얇은 니트',
      bottom: '울 팬츠, 진청 데님',
      shoes: '레더 로퍼, 첼시 부츠',
      extra: '벗었다 둘렀다 할 가벼운 스카프',
      fabrics: '개버딘, 울 혼방, 메리노',
      palette: '카멜, 차콜, 스톤, 에크루.',
      note: '아침과 오후 기온 차가 10도 가까이 나는 날이 많아요. 두꺼운 한 벌보다 벗을 수 있는 레이어가 낫습니다.',
      isCold: '쌀쌀한 날씨입니다. 제대로 된 재킷이 필요해요.',
    },
  },
  {
    id: 'chilly', min: 9, max: 11, images: [LOOK(1), LOOK(6)],
    en: {
      name: 'Chilly', verdict: 'The first coat day: wool on the outside, knit underneath.', layers: '3 layers',
      outer: 'Light wool coat or a lined trench',
      top: 'Medium-weight knit over a tee or shirt',
      bottom: 'Flannel or heavy cotton trousers',
      shoes: 'Leather boots, or loafers with socks',
      extra: 'A wool scarf',
      fabrics: 'Wool, flannel, cashmere blends',
      palette: 'Camel, oatmeal, charcoal and navy.',
      note: 'Wind makes 10°C feel like 6°C. Check the wind before you leave.',
      isCold: 'Yes, it is chilly: time for a light coat.',
    },
    ko: {
      name: '꽤 쌀쌀함', verdict: '코트를 처음 꺼내는 날, 겉은 울, 안은 니트.', layers: '3겹',
      outer: '가벼운 울 코트, 안감 있는 트렌치',
      top: '티셔츠나 셔츠 위 중간 두께 니트',
      bottom: '플란넬 또는 두꺼운 코튼 팬츠',
      shoes: '레더 부츠, 양말과 함께 신는 로퍼',
      extra: '울 스카프',
      fabrics: '울, 플란넬, 캐시미어 혼방',
      palette: '카멜, 오트밀, 차콜, 네이비.',
      note: '바람이 불면 10도도 6도처럼 느껴져요. 나가기 전 바람을 확인하세요.',
      isCold: '네, 꽤 쌀쌀합니다. 가벼운 코트를 꺼낼 때예요.',
    },
  },
  {
    id: 'cold', min: 5, max: 8, images: [LOOK(1), LOOK(6)],
    en: {
      name: 'Cold', verdict: 'A proper wool coat and a heavier knit.', layers: '3 layers',
      outer: 'Wool or cashmere-blend overcoat',
      top: 'Heavier knit or a turtleneck',
      bottom: 'Wool trousers; tights under skirts',
      shoes: 'Leather boots',
      extra: 'Scarf and leather gloves',
      fabrics: 'Heavy wool, cashmere, boiled wool',
      palette: 'Charcoal, camel, ivory and deep navy.',
      note: 'Indoors stay warm: choose a coat you can take off rather than a thicker sweater.',
      isCold: 'Yes, it is cold: wear a wool coat.',
    },
    ko: {
      name: '추움', verdict: '제대로 된 울 코트와 두꺼운 니트.', layers: '3겹',
      outer: '울 또는 캐시미어 혼방 오버코트',
      top: '두꺼운 니트, 터틀넥',
      bottom: '울 팬츠, 스커트엔 타이츠',
      shoes: '레더 부츠',
      extra: '스카프와 가죽 장갑',
      fabrics: '두꺼운 울, 캐시미어, 보일드 울',
      palette: '차콜, 카멜, 아이보리, 딥 네이비.',
      note: '실내는 따뜻해요. 더 두꺼운 니트보다 벗을 수 있는 코트를 고르세요.',
      isCold: '네, 추운 날씨입니다. 울 코트를 입으세요.',
    },
  },
  {
    id: 'very-cold', min: 0, max: 4, images: [LOOK(1), LOOK(6)],
    en: {
      name: 'Very cold', verdict: 'Insulation first: a padded or heavy coat over a warm base layer.', layers: '3 to 4 layers',
      outer: 'Down coat, padded parka or a heavy double-faced wool coat',
      top: 'Thermal base layer under a thick knit',
      bottom: 'Lined or heavy wool trousers',
      shoes: 'Insulated leather boots',
      extra: 'Scarf, gloves and a knit hat',
      fabrics: 'Down, heavy wool, cashmere',
      palette: 'Black, charcoal, camel and cream.',
      note: 'Below 5°C the scarf and gloves matter as much as the coat.',
      isCold: 'Yes, it is very cold: insulate.',
    },
    ko: {
      name: '매우 추움', verdict: '보온이 먼저, 따뜻한 이너 위에 패딩이나 두꺼운 코트.', layers: '3~4겹',
      outer: '다운 코트, 패딩 파카, 두꺼운 더블페이스 울 코트',
      top: '두꺼운 니트 안에 발열 이너',
      bottom: '안감 있는 팬츠, 두꺼운 울 팬츠',
      shoes: '보온 레더 부츠',
      extra: '스카프, 장갑, 니트 비니',
      fabrics: '다운, 두꺼운 울, 캐시미어',
      palette: '블랙, 차콜, 카멜, 크림.',
      note: '5도 아래에선 스카프와 장갑이 코트만큼 중요해요.',
      isCold: '네, 매우 추운 날씨입니다. 보온에 집중하세요.',
    },
  },
  {
    id: 'freezing', min: -Infinity, max: -1, images: [LOOK(1), LOOK(6)],
    en: {
      name: 'Freezing', verdict: 'Dress like you mean it: long down, thermal layers, every accessory.', layers: '4 layers',
      outer: 'Long down coat with a hood',
      top: 'Thermal base layer, with a fleece or heavy knit mid-layer',
      bottom: 'Fleece-lined trousers, or thermal leggings under wool',
      shoes: 'Waterproof insulated boots with grip',
      extra: 'Hat, scarf and insulated gloves',
      fabrics: 'Down, fleece, heavy wool',
      palette: 'Black, charcoal, ivory and deep olive.',
      note: 'Wind chill can sit five to ten degrees below the reading. Cover your ears and hands.',
      isCold: 'Yes. It is below freezing.',
    },
    ko: {
      name: '한파', verdict: '단단히 무장하세요. 롱패딩, 발열 이너, 모든 액세서리.', layers: '4겹',
      outer: '후드 달린 롱 다운 코트',
      top: '발열 이너 + 플리스 또는 두꺼운 니트',
      bottom: '기모 팬츠, 울 팬츠 안 발열 레깅스',
      shoes: '미끄럼 방지 방수 보온 부츠',
      extra: '모자, 목도리, 보온 장갑',
      fabrics: '다운, 플리스, 두꺼운 울',
      palette: '블랙, 차콜, 아이보리, 딥 올리브.',
      note: '체감온도는 표시 기온보다 5~10도 낮을 수 있어요. 귀와 손을 꼭 가리세요.',
      isCold: '네, 영하의 날씨입니다.',
    },
  },
]

export function bandFor(tempC: number): Band {
  const t = Math.round(tempC)
  return BANDS.find(b => t >= b.min && t <= b.max) || BANDS[BANDS.length - 1]
}

/** 바로 더 추운/더 따뜻한 구간 */
export function neighbourBands(band: Band): { colder: Band | null; warmer: Band | null } {
  const i = BANDS.indexOf(band)
  return { warmer: i > 0 ? BANDS[i - 1] : null, colder: i < BANDS.length - 1 ? BANDS[i + 1] : null }
}

export interface City {
  slug: string
  en: string
  ko: string
  lat: number
  lon: number
  tz: string
}

export const CITIES: City[] = [
  { slug: 'seoul', en: 'Seoul', ko: '서울', lat: 37.5665, lon: 126.978, tz: 'Asia/Seoul' },
  { slug: 'busan', en: 'Busan', ko: '부산', lat: 35.1796, lon: 129.0756, tz: 'Asia/Seoul' },
  { slug: 'tokyo', en: 'Tokyo', ko: '도쿄', lat: 35.6762, lon: 139.6503, tz: 'Asia/Tokyo' },
  { slug: 'osaka', en: 'Osaka', ko: '오사카', lat: 34.6937, lon: 135.5023, tz: 'Asia/Tokyo' },
  { slug: 'shanghai', en: 'Shanghai', ko: '상하이', lat: 31.2304, lon: 121.4737, tz: 'Asia/Shanghai' },
  { slug: 'hong-kong', en: 'Hong Kong', ko: '홍콩', lat: 22.3193, lon: 114.1694, tz: 'Asia/Hong_Kong' },
  { slug: 'taipei', en: 'Taipei', ko: '타이베이', lat: 25.033, lon: 121.5654, tz: 'Asia/Taipei' },
  { slug: 'singapore', en: 'Singapore', ko: '싱가포르', lat: 1.3521, lon: 103.8198, tz: 'Asia/Singapore' },
  { slug: 'bangkok', en: 'Bangkok', ko: '방콕', lat: 13.7563, lon: 100.5018, tz: 'Asia/Bangkok' },
  { slug: 'sydney', en: 'Sydney', ko: '시드니', lat: -33.8688, lon: 151.2093, tz: 'Australia/Sydney' },
  { slug: 'dubai', en: 'Dubai', ko: '두바이', lat: 25.2048, lon: 55.2708, tz: 'Asia/Dubai' },
  { slug: 'london', en: 'London', ko: '런던', lat: 51.5072, lon: -0.1276, tz: 'Europe/London' },
  { slug: 'paris', en: 'Paris', ko: '파리', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris' },
  { slug: 'milan', en: 'Milan', ko: '밀라노', lat: 45.4642, lon: 9.19, tz: 'Europe/Rome' },
  { slug: 'berlin', en: 'Berlin', ko: '베를린', lat: 52.52, lon: 13.405, tz: 'Europe/Berlin' },
  { slug: 'madrid', en: 'Madrid', ko: '마드리드', lat: 40.4168, lon: -3.7038, tz: 'Europe/Madrid' },
  { slug: 'new-york', en: 'New York', ko: '뉴욕', lat: 40.7128, lon: -74.006, tz: 'America/New_York' },
  { slug: 'los-angeles', en: 'Los Angeles', ko: '로스앤젤레스', lat: 34.0522, lon: -118.2437, tz: 'America/Los_Angeles' },
  { slug: 'san-francisco', en: 'San Francisco', ko: '샌프란시스코', lat: 37.7749, lon: -122.4194, tz: 'America/Los_Angeles' },
  { slug: 'chicago', en: 'Chicago', ko: '시카고', lat: 41.8781, lon: -87.6298, tz: 'America/Chicago' },
  { slug: 'toronto', en: 'Toronto', ko: '토론토', lat: 43.6532, lon: -79.3832, tz: 'America/Toronto' },
  { slug: 'vancouver', en: 'Vancouver', ko: '밴쿠버', lat: 49.2827, lon: -123.1207, tz: 'America/Vancouver' },
]

export function degreeSlug(c: number): string {
  return c < 0 ? `minus-${Math.abs(c)}-degrees` : `${c}-degrees`
}

/** "15-degrees" → 15, "minus-5-degrees" → -5. 범위 밖이거나 형식이 다르면 null */
export function parseDegreeSlug(slug: string): number | null {
  const m = /^(minus-)?(\d{1,2})-degrees$/.exec(slug)
  if (!m) return null
  const c = (m[1] ? -1 : 1) * parseInt(m[2], 10)
  if (Object.is(c, -0) || (m[1] && m[2] === '0')) return null
  return c >= DEGREE_MIN && c <= DEGREE_MAX ? c : null
}

export function toF(c: number): number {
  return Math.round((c * 9) / 5 + 32)
}

export function allDegrees(): number[] {
  const out: number[] = []
  for (let c = DEGREE_MIN; c <= DEGREE_MAX; c++) out.push(c)
  return out
}
