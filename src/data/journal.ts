/**
 * The Journal — 스타일 트렌드 기사.
 *
 * 정적 데이터로 유지하는 이유: 편집이 곧 배포이고, 런타임 비용이 0이며,
 * 이미지가 이미 사이트 에셋이라 추가 스토리지가 필요 없다.
 * 새 글은 이 배열 맨 앞에 추가한다 (최신순).
 */

export interface JournalPost {
  slug: string
  title: string
  titleKo: string
  excerpt: string
  excerptKo: string
  body: string[]
  bodyKo: string[]
  image: string
  tag: string
  date: string
  readMinutes: number
}

export const journalPosts: JournalPost[] = [
  {
    slug: 'fw26-quiet-luxury',
    title: 'FW26: Quiet Luxury Grows Softer',
    titleKo: 'FW26: 더 부드러워진 콰이어트 럭셔리',
    excerpt: 'The season trades sharp tailoring for weight and drape — and the colors that carry it.',
    excerptKo: '이번 시즌은 각진 테일러링 대신 무게감과 드레이프로 옮겨갑니다. 그리고 그것을 지탱하는 색.',
    body: [
      'Quiet luxury is not going anywhere, but its silhouette has relaxed. The defining FW26 piece is the double-faced cashmere coat — unlined, unstructured, and heavy enough to hang in a single clean line from the shoulder. Nothing about it announces itself, which is the point.',
      'The palette moved with it. Camel and oatmeal remain the base, but this season they are joined by deep forest green and a chocolate brown warm enough to read as a neutral. If your color season is Autumn Warm, this is your year: those two shades were made for golden undertones.',
      'For Winter Cool complexions, the same silhouette works in charcoal and midnight navy — the drape does the talking, so the color can stay severe without looking harsh.',
      'How to wear it: keep everything underneath quiet. A fine-gauge turtleneck, wide trousers in a shade adjacent to the coat, and one leather accessory. Contrast belongs in texture, not color.',
    ],
    bodyKo: [
      '콰이어트 럭셔리는 사라지지 않았지만, 실루엣이 확실히 느슨해졌습니다. FW26을 정의하는 아이템은 더블페이스 캐시미어 코트입니다. 안감 없이, 구조 없이, 어깨에서 한 줄로 떨어질 만큼 묵직하게. 자기를 드러내지 않는다는 점이 핵심입니다.',
      '팔레트도 함께 움직였습니다. 카멜과 오트밀이 여전히 기본이지만, 이번 시즌엔 딥 포레스트 그린과 뉴트럴처럼 읽히는 따뜻한 초콜릿 브라운이 합류했습니다. 가을 웜이라면 올해가 당신의 해입니다. 이 두 색은 골든 언더톤을 위해 만들어졌습니다.',
      '겨울 쿨이라면 같은 실루엣을 차콜과 미드나잇 네이비로. 드레이프가 말을 대신하므로 색은 엄격해도 딱딱해 보이지 않습니다.',
      '입는 법: 안쪽은 전부 조용하게. 얇은 터틀넥, 코트와 인접한 톤의 와이드 트라우저, 그리고 가죽 액세서리 하나. 대비는 색이 아니라 소재에서 만드세요.',
    ],
    image: '/gallery/journal-fw26.webp',
    tag: 'SEASON REPORT',
    date: '2026-08-10',
    readMinutes: 3,
  },
  {
    slug: 'dressing-for-rain',
    title: 'Dressing for Rain Without Dressing Down',
    titleKo: '비 오는 날, 무너지지 않는 옷차림',
    excerpt: 'Deep tones, water-resistant surfaces, and the one shoe decision that saves the outfit.',
    excerptKo: '딥톤, 발수 소재, 그리고 룩을 살리는 단 하나의 신발 선택.',
    body: [
      'Rain flattens most outfits because people dress defensively: dark, shapeless, forgettable. The fix is to choose depth over darkness. A navy gabardine mac reads richer than a black one in low light, and it photographs better under grey skies.',
      'Surface matters more than layers. One water-resistant outer over a breathable mid-layer beats three cotton layers that hold water. Cotton gabardine, waxed cotton, and tightly woven wool all shed light rain without looking technical.',
      'The shoe decision is the whole outfit. A polished waterproof Chelsea boot keeps the line of your trouser intact; a sneaker collapses it the moment it darkens. If you own one rain-appropriate leather boot, it will carry every wet day of the season.',
      'Finish with a compact umbrella and tuck the coat hem back when you sit. Small, unglamorous, and the difference between arriving composed and arriving damp.',
    ],
    bodyKo: [
      '비 오는 날 옷차림이 무너지는 이유는 사람들이 방어적으로 입기 때문입니다. 어둡고, 형태 없고, 기억에 남지 않게. 해법은 어둠 대신 깊이를 고르는 것입니다. 네이비 개버딘 맥코트는 흐린 빛 아래서 블랙보다 풍부하게 읽히고, 회색 하늘 아래서 사진도 더 잘 나옵니다.',
      '겹보다 표면이 중요합니다. 발수되는 아우터 한 겹이 물을 머금는 면 세 겹보다 낫습니다. 코튼 개버딘, 왁스드 코튼, 촘촘한 울은 기능성 옷처럼 보이지 않으면서 가벼운 비를 흘려보냅니다.',
      '신발 선택이 룩 전체를 결정합니다. 광이 나는 방수 첼시 부츠는 바지의 라인을 지켜주지만, 스니커즈는 젖어 색이 변하는 순간 무너집니다. 비에 견디는 가죽 부츠 한 켤레가 그 시즌의 모든 젖은 날을 책임집니다.',
      '마무리는 작은 우산, 그리고 앉을 때 코트 자락을 살짝 뒤로 넘기기. 사소하고 멋없지만, 단정하게 도착하느냐 축축하게 도착하느냐를 가릅니다.',
    ],
    image: '/gallery/journal-rain.webp',
    tag: 'WEATHER STYLING',
    date: '2026-08-03',
    readMinutes: 2,
  },
  {
    slug: 'your-season-is-a-shortcut',
    title: 'Your Color Season Is a Shortcut, Not a Rulebook',
    titleKo: '퍼스널 컬러는 규칙집이 아니라 지름길입니다',
    excerpt: 'Twelve types, one useful idea: stop testing colors on the rack and start testing them on your face.',
    excerptKo: '12타입이 주는 하나의 쓸모: 옷걸이에서 색을 고르지 말고, 얼굴에서 고르세요.',
    body: [
      'Personal color analysis gets dismissed as pseudoscience, and the mystical framing invites that. But the underlying observation is plain: some colors reflect light onto your face in a way that evens your skin, and others drain it. You have seen it in fitting-room mirrors your whole life.',
      'A twelve-type label — Autumn Warm Mute, Winter Cool Bright — is just a compression of that observation into something you can shop with. It is a shortcut for the thirty seconds you spend deciding between two shirts, not a law that forbids you from wearing red.',
      'Use it where it pays: outerwear, knitwear near the face, and anything you will own for years. Ignore it where it does not: shoes, bags, trousers, and any color you love enough to wear regardless.',
      'The most practical test remains free. Hold the garment under your chin in daylight. If your under-eyes lighten, keep it. If your face flattens, put it back — no matter what the label says.',
    ],
    bodyKo: [
      '퍼스널 컬러는 종종 유사과학으로 취급되고, 신비주의적 포장이 그 오해를 부릅니다. 하지만 바탕에 있는 관찰은 단순합니다. 어떤 색은 빛을 얼굴로 반사해 피부를 고르게 만들고, 어떤 색은 얼굴을 빼앗습니다. 평생 탈의실 거울에서 본 그 현상입니다.',
      '가을 웜 뮤트, 겨울 쿨 브라이트 같은 12타입 라벨은 그 관찰을 쇼핑에 쓸 수 있게 압축한 것입니다. 셔츠 두 장 사이에서 고민하는 30초를 위한 지름길이지, 빨강을 금지하는 법이 아닙니다.',
      '값어치가 있는 곳에 쓰세요. 아우터, 얼굴 가까이 오는 니트, 몇 년을 함께할 물건. 값어치가 없는 곳은 무시하세요. 신발, 가방, 바지, 그리고 그것과 상관없이 사랑하는 색.',
      '가장 실용적인 테스트는 여전히 공짜입니다. 자연광에서 옷을 턱 아래에 대보세요. 눈 밑이 밝아지면 남기고, 얼굴이 납작해지면 내려놓으세요. 라벨이 뭐라고 하든.',
    ],
    image: '/gallery/journal-color.webp',
    tag: 'COLOR',
    date: '2026-07-28',
    readMinutes: 3,
  },
]
