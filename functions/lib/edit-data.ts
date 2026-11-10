/**
 * The Edit — 주간 트렌드 에디트.
 *
 * 매주 월요일 한 편씩 공개된다. `date`가 지난 에디션만 사이트·사이트맵·뉴스레터에 나오므로,
 * 미리 써 둔 에디션은 그 주가 되면 자동으로 발행된다. 새 에디션은 배열 끝에 추가한다.
 *
 * 편집 규칙: 실제 브랜드·디자이너명 금지, 이모지 금지. 트렌드는 실루엣·색·소재로만 말한다.
 * 수치나 특정 쇼를 인용하지 않는다 (확인할 수 없는 주장은 쓰지 않는다).
 */

export type EditLang = 'en' | 'ko'

export interface EditCopy {
  title: string
  dek: string
  /** 무슨 일이 일어나고 있는가 — 2문단 */
  trend: [string, string]
  /** 어떻게 입는가 — 3가지 */
  wear: [{ h: string; p: string }, { h: string; p: string }, { h: string; p: string }]
  pieces: string[]
  skip: string
}

export interface Swatch {
  hex: string
  en: string
  ko: string
}

export interface Edition {
  no: number
  slug: string
  /** 발행일 (월요일, YYYY-MM-DD, UTC 기준) */
  date: string
  palette: Swatch[]
  images: { her: string; him: string }
  en: EditCopy
  ko: EditCopy
}

const img = (slug: string) => ({ her: `/gallery/edit/${slug}-her.webp`, him: `/gallery/edit/${slug}-him.webp` })

const C = {
  oatmeal: { hex: '#D8CDB8', en: 'Oatmeal', ko: '오트밀' },
  ivory: { hex: '#F2EDE3', en: 'Ivory', ko: '아이보리' },
  cream: { hex: '#EDE6D6', en: 'Cream', ko: '크림' },
  stone: { hex: '#A9A397', en: 'Stone', ko: '스톤' },
  camel: { hex: '#B8935F', en: 'Camel', ko: '카멜' },
  chocolate: { hex: '#4A3426', en: 'Chocolate', ko: '초콜릿' },
  brown: { hex: '#6B4E3A', en: 'Soft brown', ko: '소프트 브라운' },
  grey: { hex: '#8E8E90', en: 'Mid grey', ko: '미드 그레이' },
  flannel: { hex: '#77787B', en: 'Flannel grey', ko: '플란넬 그레이' },
  charcoal: { hex: '#3A3A3C', en: 'Charcoal', ko: '차콜' },
  navy: { hex: '#1F2A44', en: 'Navy', ko: '네이비' },
  plum: { hex: '#5B2A45', en: 'Plum', ko: '플럼' },
  berry: { hex: '#7A3B4E', en: 'Muted berry', ko: '뮤트 베리' },
  forest: { hex: '#2F4A3C', en: 'Forest', ko: '포레스트' },
  oxblood: { hex: '#6E2630', en: 'Oxblood', ko: '옥스블러드' },
} satisfies Record<string, Swatch>

export const EDITIONS: Edition[] = [
  {
    no: 1, slug: 'quiet-but-seen', date: '2026-11-09',
    palette: [C.oatmeal, C.ivory, C.charcoal, C.plum], images: img('quiet-but-seen'),
    en: {
      title: 'Quiet, but seen',
      dek: 'The season in one rule: keep the calm base, then add a single piece that gets noticed.',
      trend: [
        'This winter the runways stepped away from clothes that only whisper. Texture, checks and deep colour came back, and the commentary split in two: some called it the end of quiet luxury, others a return to clothes people can actually wear.',
        'Both are right. The calm, tonal base has not gone anywhere. What changed is that one piece in the outfit is now allowed to be seen. That is the whole season, and it is an easy one to dress for.',
      ],
      wear: [
        { h: 'Start with a tonal base', p: 'Knit and trousers in neighbouring shades: oatmeal with ivory, charcoal with grey. This is the part nobody notices, and it is what makes the rest look deliberate.' },
        { h: 'Choose one piece to be seen', p: 'A textured coat, a scarf with scale, or a knit in a deep colour such as plum. One is enough. It should be the first thing someone would describe about what you wore.' },
        { h: 'Keep everything else matte', p: 'Plain leather, no shine, no second pattern. The quieter the rest, the more expensive the one piece looks.' },
      ],
      pieces: ['A tonal knit and trouser pairing', 'One coat with presence', 'A large plain scarf', 'Polished leather shoes'],
      skip: 'Two statements in one outfit. A checked coat and a bright knit cancel each other out.',
    },
    ko: {
      title: '조용하게, 그러나 눈에 띄게',
      dek: '이번 시즌을 한 줄로: 차분한 바탕은 그대로 두고, 눈에 띄는 한 가지만 더하세요.',
      trend: [
        '올겨울 런웨이는 속삭이기만 하는 옷에서 한 걸음 물러났습니다. 질감, 체크, 깊은 색이 돌아왔고 평가는 둘로 갈렸습니다. 콰이어트 럭셔리의 끝이라는 쪽과, 다시 입을 수 있는 옷으로 돌아왔다는 쪽입니다.',
        '둘 다 맞습니다. 차분한 톤온톤 바탕은 사라지지 않았습니다. 달라진 건 그 위에 한 가지는 눈에 띄어도 된다는 점입니다. 이번 시즌은 그게 전부이고, 그래서 입기 쉽습니다.',
      ],
      wear: [
        { h: '톤온톤 바탕부터', p: '니트와 팬츠를 이웃한 색으로 맞추세요. 오트밀과 아이보리, 차콜과 그레이처럼요. 아무도 눈여겨보지 않는 이 부분이 나머지를 의도한 것처럼 보이게 합니다.' },
        { h: '눈에 띌 한 가지를 고르기', p: '질감 있는 코트, 큼직한 스카프, 플럼처럼 깊은 색의 니트 중 하나면 충분합니다. 누군가 오늘 당신의 옷을 설명할 때 가장 먼저 말할 바로 그 한 가지입니다.' },
        { h: '나머지는 무광으로', p: '민무늬 가죽, 광택 없이, 두 번째 패턴 없이. 나머지가 조용할수록 그 한 가지가 더 고급스러워 보입니다.' },
      ],
      pieces: ['톤온톤 니트와 팬츠', '존재감 있는 코트 한 벌', '큼직한 민무늬 스카프', '잘 닦은 가죽 구두'],
      skip: '한 착장에 포인트 두 개. 체크 코트와 강한 색 니트는 서로를 지웁니다.',
    },
  },
  {
    no: 2, slug: 'the-texture-season', date: '2026-11-16',
    palette: [C.cream, C.camel, C.chocolate, C.stone], images: img('the-texture-season'),
    en: {
      title: 'The texture season',
      dek: 'Shearling, brushed wool and bouclé: this winter, surface does the work colour used to do.',
      trend: [
        'Texture was the loudest thing on this season\'s runways. Shearling collars, fur-look trims, brushed knits and nubby bouclé appeared across outerwear and knitwear alike.',
        'It suits a calm wardrobe well. A textured piece in cream or camel adds depth without adding colour, so the outfit stays quiet while looking far richer in person and in photographs.',
      ],
      wear: [
        { h: 'One textured piece per look', p: 'A shearling-collar coat, a brushed cardigan or a bouclé jacket. Let it be the only surface with pile.' },
        { h: 'Set rough against smooth', p: 'Texture needs a flat neighbour. Pair shearling with fine merino, bouclé with crisp cotton, brushed wool with smooth leather.' },
        { h: 'Keep the shape simple', p: 'Texture adds volume. Choose straight cuts and clean hems so the piece reads as generous, not bulky.' },
      ],
      pieces: ['A shearling-collar coat', 'A brushed wool cardigan', 'A bouclé jacket', 'Suede boots', 'A ribbed scarf'],
      skip: 'Texture from head to toe. Three fuzzy surfaces together stop looking luxurious.',
    },
    ko: {
      title: '질감의 계절',
      dek: '시어링, 브러시드 울, 부클레. 올겨울엔 색이 하던 일을 표면이 대신합니다.',
      trend: [
        '이번 시즌 런웨이에서 가장 두드러진 건 질감이었습니다. 시어링 칼라, 퍼 느낌의 트리밍, 브러시드 니트, 올록볼록한 부클레가 아우터와 니트 전반에 등장했습니다.',
        '차분한 옷장과 잘 맞는 흐름입니다. 크림이나 카멜의 질감 있는 한 벌은 색을 더하지 않고도 깊이를 더합니다. 착장은 조용한 채로, 실제로 보나 사진으로 보나 훨씬 풍성해 보입니다.',
      ],
      wear: [
        { h: '한 착장에 질감은 하나', p: '시어링 칼라 코트, 브러시드 카디건, 부클레 재킷 중 하나만. 털이 있는 표면은 그것 하나로 두세요.' },
        { h: '거친 것 옆엔 매끈한 것', p: '질감은 평평한 이웃이 필요합니다. 시어링엔 얇은 메리노, 부클레엔 빳빳한 코튼, 브러시드 울엔 매끈한 가죽을 붙이세요.' },
        { h: '형태는 단순하게', p: '질감은 부피를 더합니다. 일자 재단과 깔끔한 밑단을 골라야 넉넉해 보이고, 부해 보이지 않습니다.' },
      ],
      pieces: ['시어링 칼라 코트', '브러시드 울 카디건', '부클레 재킷', '스웨이드 부츠', '립 조직 스카프'],
      skip: '머리부터 발끝까지 질감. 보송한 표면 세 개가 모이면 더는 고급스러워 보이지 않습니다.',
    },
  },
  {
    no: 3, slug: 'plum-and-berry', date: '2026-11-23',
    palette: [C.plum, C.berry, C.grey, C.navy, C.camel], images: img('plum-and-berry'),
    en: {
      title: 'Plum and berry',
      dek: 'The deep accent of the season, and how to wear it without giving up your neutrals.',
      trend: [
        'Plum and muted berry are the colours gaining ground this winter. They sit between burgundy and purple: dark enough to behave like a neutral, rich enough to be noticed.',
        'They are forgiving colours. Against grey, navy or camel a single plum piece looks considered rather than bright, which is exactly what a quiet wardrobe needs from an accent.',
      ],
      wear: [
        { h: 'One piece, against neutrals', p: 'A plum knit under a grey coat, or a berry scarf on navy. Let the neutrals carry the outfit and the colour finish it.' },
        { h: 'Near the face, or far from it', p: 'If cool tones flatter you, wear plum as the knit. If warm tones suit you better, move it to a scarf, bag or socks and keep camel by the face.' },
        { h: 'Choose the muted version', p: 'The colour should look dusty in daylight. If it glows, it is too bright for this palette.' },
      ],
      pieces: ['A plum fine-gauge knit', 'A muted berry scarf', 'A burgundy leather belt or bag', 'Plum socks with loafers'],
      skip: 'Bright magenta, and plum with hard black. Grey, navy and camel are kinder partners.',
    },
    ko: {
      title: '플럼과 베리',
      dek: '이번 시즌의 깊은 포인트 컬러, 뉴트럴을 포기하지 않고 입는 법.',
      trend: [
        '올겨울 떠오르는 색은 플럼과 뮤트 베리입니다. 버건디와 퍼플 사이에 있는 색으로, 뉴트럴처럼 쓸 수 있을 만큼 어둡고 눈에 띌 만큼 깊습니다.',
        '다루기 쉬운 색이기도 합니다. 그레이, 네이비, 카멜 위에 플럼 한 가지를 올리면 화려하기보다 잘 고른 것처럼 보입니다. 조용한 옷장이 포인트 컬러에 바라는 바로 그것입니다.',
      ],
      wear: [
        { h: '뉴트럴 위에 한 가지만', p: '그레이 코트 안에 플럼 니트, 네이비 위에 베리 스카프. 착장은 뉴트럴이 끌고 가고 색은 마무리만 합니다.' },
        { h: '얼굴 가까이, 혹은 멀리', p: '쿨톤이 잘 받는다면 플럼을 니트로 입으세요. 웜톤이 더 어울린다면 스카프, 가방, 양말로 옮기고 얼굴 옆엔 카멜을 두세요.' },
        { h: '채도 낮은 쪽으로', p: '햇빛 아래서 살짝 먼지 낀 듯 보여야 합니다. 빛나 보인다면 이 팔레트엔 너무 밝은 색입니다.' },
      ],
      pieces: ['플럼 하이게이지 니트', '뮤트 베리 스카프', '버건디 가죽 벨트나 가방', '로퍼에 플럼 양말'],
      skip: '쨍한 마젠타, 그리고 플럼과 새까만 블랙의 조합. 그레이, 네이비, 카멜이 훨씬 부드러운 짝입니다.',
    },
  },
  {
    no: 4, slug: 'the-scarf-leads', date: '2026-11-30',
    palette: [C.ivory, C.charcoal, C.camel, C.forest], images: img('the-scarf-leads'),
    en: {
      title: 'The scarf leads',
      dek: 'No longer tucked under the collar: this winter the scarf is the piece the outfit is built around.',
      trend: [
        'The scarf moved from accessory to main event this season. It is worn large, outside the coat, and chosen first rather than last.',
        'It is also the cheapest way to change a coat you already own. A different scarf gives the same coat a different week, which is why stylists reach for it before anything else in winter.',
      ],
      wear: [
        { h: 'Wear it over the coat', p: 'Wrap once and let both ends hang, or drape it over one shoulder. A scarf hidden under lapels does nothing.' },
        { h: 'Go bigger than feels natural', p: 'Long and wide reads as intentional. A narrow scarf reads as an afterthought.' },
        { h: 'Borrow one colour from the outfit', p: 'Match the scarf to your knit or trousers so it belongs. Or make it the single contrast: forest green on camel, ivory on charcoal.' },
      ],
      pieces: ['An oversized wool scarf', 'A cashmere-blend triangle scarf', 'A fringed blanket scarf', 'A fine knit snood'],
      skip: 'Thin decorative scarves and busy logos. Scale and fabric should do the talking.',
    },
    ko: {
      title: '스카프가 주인공',
      dek: '칼라 안에 숨기던 시절은 끝. 올겨울 스카프는 착장의 출발점입니다.',
      trend: [
        '이번 시즌 스카프는 액세서리에서 주인공으로 자리를 옮겼습니다. 크게, 코트 밖으로 두르고, 마지막이 아니라 가장 먼저 고릅니다.',
        '이미 가진 코트를 바꾸는 가장 저렴한 방법이기도 합니다. 스카프만 바꿔도 같은 코트로 전혀 다른 한 주를 보낼 수 있어서, 스타일리스트들이 겨울에 가장 먼저 손대는 아이템입니다.',
      ],
      wear: [
        { h: '코트 위로 두르기', p: '한 번 감아 양끝을 늘어뜨리거나 한쪽 어깨에 걸치세요. 라펠 안에 숨긴 스카프는 아무 역할도 하지 못합니다.' },
        { h: '어색할 만큼 크게', p: '길고 넓어야 의도한 것처럼 보입니다. 좁은 스카프는 나중에 덧붙인 것처럼 보여요.' },
        { h: '착장에서 색 하나 빌려오기', p: '니트나 팬츠와 색을 맞추면 한 벌처럼 어울립니다. 아니면 유일한 대비로 쓰세요. 카멜 위 포레스트 그린, 차콜 위 아이보리처럼요.' },
      ],
      pieces: ['오버사이즈 울 스카프', '캐시미어 혼방 트라이앵글 스카프', '프린지 블랭킷 스카프', '얇은 니트 스누드'],
      skip: '가늘고 장식적인 스카프, 요란한 로고. 크기와 소재가 말하게 두세요.',
    },
  },
  {
    no: 5, slug: 'checks-calmly', date: '2026-12-07',
    palette: [C.grey, C.charcoal, C.brown, C.cream, C.oxblood], images: img('checks-calmly'),
    en: {
      title: 'Checks, calmly',
      dek: 'Tartan and checks are everywhere this winter. The quiet way to wear them is tonal and one at a time.',
      trend: [
        'Checks, tartan and plaid were among the most repeated ideas of the season, on coats, suiting and scarves. December is when they feel most at home.',
        'Pattern does not have to be loud. A check woven from two close shades, grey on charcoal or brown on camel, has all the interest of tartan and none of the noise.',
      ],
      wear: [
        { h: 'One checked piece', p: 'Coat, blazer, trousers or scarf. Choose one and keep every other piece plain.' },
        { h: 'Low contrast reads expensive', p: 'The closer the two colours of the check, the more refined it looks. Save the strong red tartan for a scarf.' },
        { h: 'Scale to the garment', p: 'Large checks belong on coats, fine checks on trousers and shirts. A large check on trousers shortens the leg.' },
      ],
      pieces: ['A tonal check wool coat', 'Glen-check trousers', 'A check blazer', 'A tartan scarf'],
      skip: 'Check on check, and matching checked sets unless the pattern is very fine.',
    },
    ko: {
      title: '체크, 차분하게',
      dek: '올겨울 어디에나 있는 타탄과 체크. 조용하게 입는 법은 톤온톤으로, 한 번에 하나씩입니다.',
      trend: [
        '체크, 타탄, 플래드는 이번 시즌 가장 자주 반복된 아이디어 중 하나였습니다. 코트, 수트, 스카프에 두루 쓰였고 12월은 체크가 가장 잘 어울리는 달입니다.',
        '패턴이 꼭 요란할 필요는 없습니다. 차콜 위 그레이, 카멜 위 브라운처럼 가까운 두 색으로 짠 체크는 타탄의 재미는 그대로, 소란스러움은 없습니다.',
      ],
      wear: [
        { h: '체크는 한 가지만', p: '코트, 블레이저, 팬츠, 스카프 중 하나를 고르고 나머지는 모두 민무늬로 두세요.' },
        { h: '대비가 낮을수록 고급스럽게', p: '체크를 이루는 두 색이 가까울수록 세련돼 보입니다. 강한 레드 타탄은 스카프로 아껴두세요.' },
        { h: '옷에 맞는 크기', p: '큰 체크는 코트에, 잔 체크는 팬츠와 셔츠에. 팬츠에 큰 체크를 쓰면 다리가 짧아 보입니다.' },
      ],
      pieces: ['톤온톤 체크 울 코트', '글렌체크 팬츠', '체크 블레이저', '타탄 스카프'],
      skip: '체크 위에 체크. 그리고 패턴이 아주 잘지 않다면 위아래 체크 세트도 피하세요.',
    },
  },
  {
    no: 6, slug: 'the-long-coat-returns', date: '2026-12-14',
    palette: [C.navy, C.charcoal, C.camel, C.ivory], images: img('the-long-coat-returns'),
    en: {
      title: 'The long coat returns',
      dek: 'A tailored coat past the knee and a turtleneck beneath it: the classic pairing is back at the centre of winter.',
      trend: [
        'After several winters of padding, the long tailored coat has returned as the defining outer layer, most often worn with a turtleneck rather than a shirt and tie.',
        'It is the most flattering coat shape for almost everyone. One unbroken line from shoulder to below the knee lengthens the body, and a tonal turtleneck continues that line up to the face.',
      ],
      wear: [
        { h: 'Go below the knee', p: 'The hem should land between the knee and mid-calf. Shorter coats cut the body in half; this length draws one long line.' },
        { h: 'Turtleneck in the same tone', p: 'Charcoal under charcoal, ivory under camel. Matching the knit to the coat makes you look taller.' },
        { h: 'Keep the leg straight', p: 'Straight wool trousers and a sleek boot. Wide or cropped legs fight the coat.' },
      ],
      pieces: ['A long single-breasted wool coat', 'A fine turtleneck', 'Straight wool trousers', 'Leather gloves', 'Chelsea boots'],
      skip: 'A short puffer over tailoring, and a coat so oversized the shoulders collapse.',
    },
    ko: {
      title: '롱코트의 귀환',
      dek: '무릎 아래로 떨어지는 테일러드 코트와 그 안의 터틀넥. 클래식한 조합이 겨울의 중심으로 돌아왔습니다.',
      trend: [
        '패딩의 겨울을 몇 해 보낸 뒤, 길게 떨어지는 테일러드 코트가 다시 겨울의 대표 아우터가 됐습니다. 셔츠와 타이 대신 터틀넥과 함께 입는 경우가 많습니다.',
        '거의 모든 사람에게 가장 잘 어울리는 코트 형태이기도 합니다. 어깨에서 무릎 아래까지 끊기지 않는 선이 몸을 길어 보이게 하고, 같은 톤의 터틀넥이 그 선을 얼굴까지 이어줍니다.',
      ],
      wear: [
        { h: '무릎 아래 길이로', p: '밑단이 무릎과 종아리 중간 사이에 와야 합니다. 짧은 코트는 몸을 반으로 자르고, 이 길이는 하나의 긴 선을 그립니다.' },
        { h: '터틀넥은 같은 톤으로', p: '차콜 안에 차콜, 카멜 안에 아이보리. 니트를 코트와 맞추면 키가 더 커 보입니다.' },
        { h: '다리는 일자로', p: '일자 울 팬츠와 매끈한 부츠. 와이드나 크롭 팬츠는 코트와 부딪칩니다.' },
      ],
      pieces: ['싱글 브레스티드 롱 울 코트', '얇은 터틀넥', '일자 울 팬츠', '가죽 장갑', '첼시 부츠'],
      skip: '테일러링 위에 걸친 숏패딩, 그리고 어깨가 무너질 만큼 큰 코트.',
    },
  },
  {
    no: 7, slug: 'the-suit-softened', date: '2026-12-21',
    palette: [C.flannel, C.chocolate, C.ivory, C.navy], images: img('the-suit-softened'),
    en: {
      title: 'The suit, softened',
      dek: 'Tailoring is back with its edges taken off, which makes it the easiest thing to wear to every end-of-year dinner.',
      trend: [
        'Suiting returned this season in a gentler form: relaxed jackets, fuller trousers, and for women the skirt suit. The cloth is soft, usually flannel, and the fit has room in it.',
        'The shirt and tie are optional now. A fine knit under the jacket keeps the polish and removes the stiffness, so the same suit works for the office and for dinner.',
      ],
      wear: [
        { h: 'Knit instead of shirt', p: 'A fine turtleneck or knitted polo under the jacket. It is warmer, softer and never needs ironing.' },
        { h: 'Break the suit apart', p: 'The jacket with denim, the trousers with a chunky knit. A suit is two good garments, not one outfit.' },
        { h: 'Choose cloth with a soft surface', p: 'Flannel and brushed wool absorb light. Smooth, shiny suiting looks stiff next to them.' },
      ],
      pieces: ['A flannel suit', 'A skirt suit', 'A fine knit polo', 'Loafers', 'A long coat to go over it'],
      skip: 'Tight jackets and shiny cloth. Soft tailoring needs space to hang.',
    },
    ko: {
      title: '부드러워진 수트',
      dek: '각을 덜어낸 테일러링이 돌아왔습니다. 연말 저녁 자리마다 가장 쉽게 입을 수 있는 옷입니다.',
      trend: [
        '이번 시즌 수트는 한결 부드러운 모습으로 돌아왔습니다. 여유 있는 재킷, 넉넉한 팬츠, 그리고 여성복에서는 스커트 수트. 원단은 주로 플란넬처럼 부드럽고 핏에는 여유가 있습니다.',
        '셔츠와 타이는 이제 선택입니다. 재킷 안에 얇은 니트를 입으면 단정함은 남고 딱딱함은 사라집니다. 같은 수트로 사무실과 저녁 자리를 모두 갈 수 있습니다.',
      ],
      wear: [
        { h: '셔츠 대신 니트', p: '재킷 안에 얇은 터틀넥이나 니트 폴로. 더 따뜻하고 부드럽고, 다림질도 필요 없습니다.' },
        { h: '수트를 나눠 입기', p: '재킷은 데님과, 팬츠는 도톰한 니트와. 수트는 한 벌의 착장이 아니라 좋은 옷 두 벌입니다.' },
        { h: '표면이 부드러운 원단으로', p: '플란넬과 브러시드 울은 빛을 머금습니다. 매끈하고 광택 있는 수트 원단은 그 옆에서 뻣뻣해 보입니다.' },
      ],
      pieces: ['플란넬 수트', '스커트 수트', '얇은 니트 폴로', '로퍼', '위에 걸칠 롱코트'],
      skip: '꽉 끼는 재킷과 광택 있는 원단. 부드러운 테일러링은 떨어질 공간이 필요합니다.',
    },
  },
  {
    no: 8, slug: 'knit-over-knit', date: '2026-12-28',
    palette: [C.oatmeal, C.grey, C.navy, C.forest], images: img('knit-over-knit'),
    en: {
      title: 'Knit over knit',
      dek: 'The sweater vest is back and layered knitwear with it. A warm, easy way to start the year.',
      trend: [
        'Knitwear is being worn in layers this winter: a vest over a shirt, a cardigan over a fine crewneck, a scarf in the same yarn on top. The sweater vest in particular has returned.',
        'Layering knits is warmer than one heavy sweater and far easier to adjust indoors. Done in close shades it also looks more considered than any single piece.',
      ],
      wear: [
        { h: 'One fine, one chunky', p: 'A thin merino base with a heavier cardigan or vest over it. Two thick knits together add bulk without adding warmth.' },
        { h: 'Stay in one colour family', p: 'Oatmeal over ivory, navy over grey. Tonal layers look intentional; contrasting ones look like getting dressed in the dark.' },
        { h: 'Keep the rest modern', p: 'The vest can look dated with pleats and brogues. Straight trousers and clean shoes keep it current.' },
      ],
      pieces: ['A sweater vest', 'A fine merino crewneck', 'A chunky cardigan', 'A ribbed scarf'],
      skip: 'Retro from head to toe. One nostalgic piece per outfit is plenty.',
    },
    ko: {
      title: '니트 위에 니트',
      dek: '스웨터 베스트가 돌아왔고, 니트 레이어링도 함께 돌아왔습니다. 새해를 따뜻하고 편하게 시작하는 법.',
      trend: [
        '올겨울 니트는 겹쳐 입습니다. 셔츠 위에 베스트, 얇은 크루넥 위에 카디건, 그 위에 같은 실의 스카프. 특히 스웨터 베스트가 다시 돌아왔습니다.',
        '니트를 겹쳐 입으면 두꺼운 스웨터 한 벌보다 따뜻하고, 실내에서 조절하기도 훨씬 쉽습니다. 가까운 색으로 겹치면 어떤 한 벌보다도 신경 쓴 것처럼 보입니다.',
      ],
      wear: [
        { h: '하나는 얇게, 하나는 도톰하게', p: '얇은 메리노를 바탕에 두고 그 위에 두꺼운 카디건이나 베스트를. 두꺼운 니트 두 벌은 부피만 늘고 따뜻함은 늘지 않습니다.' },
        { h: '한 가지 색 계열 안에서', p: '아이보리 위에 오트밀, 그레이 위에 네이비. 톤온톤 레이어는 의도한 것처럼 보이고, 대비가 큰 조합은 대충 입은 것처럼 보입니다.' },
        { h: '나머지는 현대적으로', p: '베스트는 턱 팬츠와 브로그까지 더하면 예스러워 보일 수 있습니다. 일자 팬츠와 깔끔한 신발이 지금의 옷으로 만들어줍니다.' },
      ],
      pieces: ['스웨터 베스트', '얇은 메리노 크루넥', '도톰한 카디건', '립 조직 스카프'],
      skip: '머리부터 발끝까지 레트로. 한 착장에 향수 어린 아이템은 하나면 충분합니다.',
    },
  },
]

function todayUtc(now: Date): string {
  return now.toISOString().slice(0, 10)
}

/** 발행된 에디션 — 최신순 */
export function publishedEditions(now: Date = new Date()): Edition[] {
  const today = todayUtc(now)
  return EDITIONS.filter(e => e.date <= today).sort((a, b) => b.date.localeCompare(a.date))
}

export function findPublished(slug: string, now: Date = new Date()): Edition | null {
  return publishedEditions(now).find(e => e.slug === slug) || null
}

export function latestEdition(now: Date = new Date()): Edition | null {
  return publishedEditions(now)[0] || null
}
