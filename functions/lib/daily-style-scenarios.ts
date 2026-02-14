/**
 * Weather-based daily style scenarios for image generation
 * Returns 3 outfit scenarios: Today's Pick, Casual, Evening
 * Uses color palettes and fashion-forward prompts for high-quality results
 */

import type { ImageScenario } from './gemini-image'

interface WeatherInfo {
  temp: number
  condition: string // 'Clear', 'Rain', 'Snow', 'Clouds', etc.
  wind_speed: number
}

// Color palettes for daily variety — rotated by day of year
const maleColorPalettes = [
  { tone: 'classic', c1: 'navy', c2: 'charcoal', c3: 'white', c4: 'cream', accent: 'burgundy' },
  { tone: 'warm', c1: 'olive', c2: 'rust', c3: 'camel', c4: 'warm brown', accent: 'burnt orange' },
  { tone: 'cool', c1: 'slate blue', c2: 'sage green', c3: 'stone grey', c4: 'off-white', accent: 'teal' },
  { tone: 'earth', c1: 'terracotta', c2: 'forest green', c3: 'tan', c4: 'chocolate brown', accent: 'mustard' },
  { tone: 'modern', c1: 'black', c2: 'ivory', c3: 'silver grey', c4: 'deep burgundy', accent: 'emerald' },
  { tone: 'coastal', c1: 'sand beige', c2: 'ocean blue', c3: 'white linen', c4: 'light khaki', accent: 'coral' },
  { tone: 'urban', c1: 'graphite', c2: 'steel blue', c3: 'bone white', c4: 'deep indigo', accent: 'amber' },
]
const femaleColorPalettes = [
  { tone: 'soft', c1: 'cream', c2: 'dusty rose', c3: 'beige', c4: 'champagne', accent: 'gold' },
  { tone: 'warm', c1: 'terracotta', c2: 'amber', c3: 'warm ivory', c4: 'cinnamon', accent: 'copper' },
  { tone: 'cool', c1: 'lavender', c2: 'ice blue', c3: 'soft grey', c4: 'pearl white', accent: 'silver' },
  { tone: 'rich', c1: 'emerald', c2: 'burgundy', c3: 'deep plum', c4: 'midnight blue', accent: 'bronze' },
  { tone: 'fresh', c1: 'sage green', c2: 'blush pink', c3: 'sky blue', c4: 'lemon cream', accent: 'rose gold' },
  { tone: 'romantic', c1: 'mauve', c2: 'ivory', c3: 'soft peach', c4: 'blush', accent: 'pearl' },
  { tone: 'natural', c1: 'oatmeal', c2: 'olive green', c3: 'sand', c4: 'warm taupe', accent: 'amber' },
]

function getDayPaletteIndex(): number {
  const now = new Date()
  return Math.floor((now.getTime() / 86400000)) % 7
}

function getTodaysPickPrompt(weather: WeatherInfo, gender: string): string {
  const idx = getDayPaletteIndex()
  const isCold = weather.temp < 10
  const isCool = weather.temp >= 10 && weather.temp < 20
  const isWarm = weather.temp >= 20 && weather.temp < 28
  const isHot = weather.temp >= 28
  const isRainy = ['Rain', 'Drizzle', 'Thunderstorm'].includes(weather.condition)
  const isSnowy = weather.condition === 'Snow'

  if (gender === 'female') {
    const p = femaleColorPalettes[idx % femaleColorPalettes.length]
    if (isSnowy) return `luxurious winter outfit in ${p.tone} palette: stunning long wool coat in ${p.c1} with elegant draping, cozy cashmere turtleneck in ${p.c4}, tailored high-waisted wool trousers in ${p.c3}, premium insulated leather ankle boots, ${p.accent} cashmere scarf and leather gloves, delicate ${p.accent} jewelry - sophisticated winter elegance worthy of a fashion editorial`
    if (isRainy) return `chic rainy day outfit in ${p.tone} palette: structured waterproof trench coat in ${p.c3} with sleek silhouette, fine-knit sweater in ${p.c2}, tailored dark pants with slight crop, polished waterproof chelsea boots, compact ${p.accent} crossbody bag, minimalist earrings - effortlessly stylish rain or shine`
    if (isCold) return `elegant cold weather outfit in ${p.tone} palette: beautifully tailored wool coat in ${p.c2} with clean lines, soft cashmere V-neck in ${p.c1}, high-waisted wide-leg trousers in ${p.c3}, premium leather ankle boots, delicate ${p.accent} layered necklace - refined warmth with editorial sophistication`
    if (isCool) return `polished layered outfit in ${p.tone} palette: soft cashmere cardigan in ${p.c1} draped over silk camisole in ${p.c4}, high-waisted tailored trousers in ${p.c3}, clean pointed-toe flats or loafers, minimalist ${p.accent} jewelry, structured tote bag - effortless Parisian chic`
    if (isWarm) return `breezy elegant outfit in ${p.tone} palette: flowing linen blouse in ${p.c4} with feminine details, wide-leg linen pants or midi skirt in ${p.c3}, leather espadrilles or elegant sandals, ${p.accent} delicate bracelet, woven tote - refined summer sophistication`
    if (isHot) return `cool summer outfit in ${p.tone} palette: lightweight silk or cotton dress in ${p.c2} with flattering cut, elegant flat sandals in natural leather, ${p.accent} minimalist jewelry, premium straw bag, chic sunglasses - fresh feminine elegance`
    return `versatile chic outfit in ${p.tone} palette: premium cashmere sweater in ${p.c1}, high-waisted ${p.c3} wide-leg trousers, elegant pointed flats, delicate ${p.accent} jewelry - timeless refined style`
  }

  // Male — Loro Piana/Brunello Cucinelli aesthetic: naturally draped tailored silhouette
  const p = maleColorPalettes[idx % maleColorPalettes.length]
  if (isSnowy) return `sharp winter outfit in ${p.tone} palette: premium insulated wool overcoat in ${p.c2} with structured shoulders, chunky cable-knit sweater in ${p.c3}, relaxed-fit dark wool trousers with natural drape, waterproof leather boots in rich brown, ${p.accent} wool scarf, leather gloves — luxury editorial quality, naturally draped tailored silhouette`
  if (isRainy) return `sleek rainy day outfit in ${p.tone} palette: modern waterproof mac coat in ${p.c1}, fine merino crew-neck in ${p.c3}, relaxed-fit dark chinos with comfortable drape, polished waterproof chelsea boots, minimal ${p.accent} accent watch — luxury editorial quality, naturally draped silhouette`
  if (isCold) return `distinguished cold weather outfit in ${p.tone} palette: tailored wool peacoat in ${p.c2}, fine merino turtleneck in ${p.c3}, straight-leg dark trousers with natural drape, premium brown leather boots, minimal ${p.accent} accent watch — luxury editorial quality, naturally draped tailored silhouette`
  if (isCool) return `smart modern outfit in ${p.tone} palette: premium cotton crew-neck sweater in ${p.c3} layered over crisp oxford shirt collar showing, relaxed straight-leg chinos in ${p.c1} with comfortable fit, clean leather sneakers or suede loafers, ${p.accent} accent leather belt — luxury editorial quality, naturally draped silhouette`
  if (isWarm) return `refined warm weather outfit in ${p.tone} palette: breathable premium linen shirt in ${p.c3} with perfect drape, relaxed-fit cotton trousers in ${p.c4} with natural comfortable drape, leather sandals or canvas sneakers, minimal ${p.accent} watch — luxury editorial quality, naturally draped silhouette`
  if (isHot) return `sharp summer outfit in ${p.tone} palette: lightweight camp-collar linen shirt in ${p.c3}, relaxed-fit cotton shorts or comfortable light chinos in ${p.c4}, premium leather sandals, ${p.accent} accent sunglasses — luxury editorial quality, naturally draped silhouette`
  return `clean modern outfit in ${p.tone} palette: fine-knit cashmere sweater in ${p.c3}, relaxed straight-leg chinos in ${p.c1} with natural drape, premium leather belt, clean sneakers or suede loafers, ${p.accent} accent details — luxury editorial quality, naturally draped silhouette`
}

function getCasualPrompt(gender: string, temp: number): string {
  const idx = getDayPaletteIndex()
  const isWarm = temp >= 22

  if (gender === 'female') {
    const p = femaleColorPalettes[(idx + 2) % femaleColorPalettes.length]
    if (isWarm) return `relaxed yet chic casual outfit in ${p.tone} palette: premium oversized cotton tee in ${p.c4} loosely tucked into high-waisted ${p.c3} straight-leg jeans, clean white leather sneakers, ${p.accent} minimalist crossbody bag, simple hoop earrings — luxury editorial quality, naturally draped elegant silhouette`
    return `cozy chic casual outfit in ${p.tone} palette: luxurious oversized ${p.c1} cashmere cardigan over fitted white tee, high-waisted light wash straight-leg jeans, clean ${p.c3} sneakers or tan suede loafers, delicate ${p.accent} necklace — luxury editorial quality, naturally draped elegant silhouette`
  }

  const p = maleColorPalettes[(idx + 2) % maleColorPalettes.length]
  if (isWarm) return `relaxed modern casual outfit in ${p.tone} palette: premium soft cotton crew-neck tee in ${p.c3}, comfortable relaxed-fit chino shorts in ${p.c4} with natural drape, clean canvas sneakers or leather slides, minimal ${p.accent} watch — luxury editorial quality, naturally draped silhouette`
  return `elevated casual outfit in ${p.tone} palette: premium cotton ${p.c3} sweatshirt or half-zip pullover, straight-leg dark indigo jeans with comfortable relaxed fit, clean white leather sneakers, minimal ${p.accent} watch — luxury editorial quality, naturally draped silhouette`
}

function getEveningPrompt(gender: string, temp: number): string {
  const idx = getDayPaletteIndex()
  const needsOuterwear = temp < 18

  if (gender === 'female') {
    const p = femaleColorPalettes[(idx + 4) % femaleColorPalettes.length]
    if (needsOuterwear) return `glamorous evening outfit in ${p.tone} palette: stunning midi dress in ${p.c2} with elegant draping and flattering silhouette, structured ${p.c1} blazer or elegant coat draped over shoulders, strappy heeled sandals, ${p.accent} statement earrings, premium clutch bag — luxury editorial quality, naturally draped elegant silhouette`
    return `captivating evening outfit in ${p.tone} palette: sleek silk slip dress in ${p.c2} or form-fitting knit dress in ${p.c4}, strappy heeled sandals, ${p.accent} layered necklaces, elegant clutch, subtle smoky eye look — luxury editorial quality, naturally draped elegant silhouette`
  }

  const p = maleColorPalettes[(idx + 4) % maleColorPalettes.length]
  if (needsOuterwear) return `sharp evening outfit in ${p.tone} palette: unstructured soft blazer in ${p.c1} with natural shoulders over ${p.c2} turtleneck or relaxed dark dress shirt, straight-leg dark trousers with comfortable drape, sleek leather dress shoes, minimal ${p.accent} watch — luxury editorial quality, naturally draped tailored silhouette`
  return `refined evening outfit in ${p.tone} palette: premium ${p.c1} button-up shirt with sleeves slightly rolled revealing ${p.accent} watch, relaxed-fit dark trousers with natural drape, polished leather loafers or dress shoes — luxury editorial quality, naturally draped tailored silhouette`
}

export function getDailyScenarios(weather: WeatherInfo, gender: string): ImageScenario[] {
  // 2 scenarios: Dressy (formal/smart) and Casual
  return [
    {
      id: 'dressy',
      prompt: getTodaysPickPrompt(weather, gender),
    },
    {
      id: 'casual',
      prompt: getCasualPrompt(gender, weather.temp),
    },
  ]
}

/** Label translations for daily scenarios */
export const dailyScenarioLabels: Record<string, Record<string, string>> = {
  'dressy': {
    ko: '격식 스타일',
    en: 'Dressy',
    ja: 'ドレッシー',
    zh: '正式穿搭',
    es: 'Elegante',
  },
  'casual': {
    ko: '캐주얼',
    en: 'Casual',
    ja: 'カジュアル',
    zh: '休闲',
    es: 'Casual',
  },
}
