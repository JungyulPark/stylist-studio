/**
 * Weather-based daily style scenarios for image generation
 * Uses color palettes (21) × style moods (5) for 105 unique combinations per weather type.
 * Palettes rotate on a 21-day cycle, moods on a 13-day cycle (coprime → 273 days before exact repeat).
 */

import type { ImageScenario } from './gemini-image'

interface WeatherInfo {
  temp: number
  condition: string // 'Clear', 'Rain', 'Snow', 'Clouds', etc.
  wind_speed: number
}

// ─── 21 Color Palettes ───────────────────────────────────────────
const maleColorPalettes = [
  { tone: 'classic', c1: 'navy', c2: 'charcoal', c3: 'white', c4: 'cream', accent: 'burgundy' },
  { tone: 'warm', c1: 'olive', c2: 'rust', c3: 'camel', c4: 'warm brown', accent: 'burnt orange' },
  { tone: 'cool', c1: 'slate blue', c2: 'sage green', c3: 'stone grey', c4: 'off-white', accent: 'teal' },
  { tone: 'earth', c1: 'terracotta', c2: 'forest green', c3: 'tan', c4: 'chocolate brown', accent: 'mustard' },
  { tone: 'modern', c1: 'black', c2: 'ivory', c3: 'silver grey', c4: 'deep burgundy', accent: 'emerald' },
  { tone: 'coastal', c1: 'sand beige', c2: 'ocean blue', c3: 'white linen', c4: 'light khaki', accent: 'coral' },
  { tone: 'urban', c1: 'graphite', c2: 'steel blue', c3: 'bone white', c4: 'deep indigo', accent: 'amber' },
  { tone: 'nordic', c1: 'pine green', c2: 'cloud grey', c3: 'oatmeal', c4: 'birch white', accent: 'copper' },
  { tone: 'heritage', c1: 'deep brown', c2: 'moss green', c3: 'ecru', c4: 'tobacco', accent: 'brass' },
  { tone: 'minimal', c1: 'pure white', c2: 'light grey', c3: 'pale beige', c4: 'soft black', accent: 'matte silver' },
  { tone: 'autumn', c1: 'burnt sienna', c2: 'dark olive', c3: 'wheat', c4: 'mahogany', accent: 'gold' },
  { tone: 'maritime', c1: 'dark navy', c2: 'sky blue', c3: 'crisp white', c4: 'rope beige', accent: 'red' },
  { tone: 'desert', c1: 'coyote tan', c2: 'dusty clay', c3: 'warm sand', c4: 'sage', accent: 'turquoise' },
  { tone: 'metro', c1: 'midnight blue', c2: 'cement grey', c3: 'chalk white', c4: 'espresso', accent: 'electric blue' },
  { tone: 'vintage', c1: 'faded denim', c2: 'dark khaki', c3: 'ivory', c4: 'worn leather brown', accent: 'antique gold' },
  { tone: 'alpine', c1: 'deep green', c2: 'stone', c3: 'cream wool', c4: 'bark brown', accent: 'burnt red' },
  { tone: 'studio', c1: 'ink black', c2: 'dove grey', c3: 'warm white', c4: 'ash', accent: 'bronze' },
  { tone: 'pacific', c1: 'deep teal', c2: 'sandstone', c3: 'seafoam', c4: 'driftwood', accent: 'sunset orange' },
  { tone: 'ivy', c1: 'hunter green', c2: 'burgundy', c3: 'cream', c4: 'camel', accent: 'gold' },
  { tone: 'monochrome', c1: 'charcoal', c2: 'medium grey', c3: 'light grey', c4: 'off-white', accent: 'black' },
  { tone: 'tuscany', c1: 'terracotta', c2: 'olive', c3: 'warm cream', c4: 'faded blue', accent: 'dried rose' },
]

const femaleColorPalettes = [
  { tone: 'soft', c1: 'cream', c2: 'dusty rose', c3: 'beige', c4: 'champagne', accent: 'gold' },
  { tone: 'warm', c1: 'terracotta', c2: 'amber', c3: 'warm ivory', c4: 'cinnamon', accent: 'copper' },
  { tone: 'cool', c1: 'lavender', c2: 'ice blue', c3: 'soft grey', c4: 'pearl white', accent: 'silver' },
  { tone: 'rich', c1: 'emerald', c2: 'burgundy', c3: 'deep plum', c4: 'midnight blue', accent: 'bronze' },
  { tone: 'fresh', c1: 'sage green', c2: 'blush pink', c3: 'sky blue', c4: 'lemon cream', accent: 'rose gold' },
  { tone: 'romantic', c1: 'mauve', c2: 'ivory', c3: 'soft peach', c4: 'blush', accent: 'pearl' },
  { tone: 'natural', c1: 'oatmeal', c2: 'olive green', c3: 'sand', c4: 'warm taupe', accent: 'amber' },
  { tone: 'nordic', c1: 'ice white', c2: 'pale blue', c3: 'silver birch', c4: 'frost grey', accent: 'rose gold' },
  { tone: 'berry', c1: 'raspberry', c2: 'plum', c3: 'cream', c4: 'deep wine', accent: 'gold' },
  { tone: 'garden', c1: 'moss green', c2: 'petal pink', c3: 'cream', c4: 'fern', accent: 'coral' },
  { tone: 'coastal', c1: 'sand', c2: 'ocean blue', c3: 'white', c4: 'driftwood', accent: 'turquoise' },
  { tone: 'vintage', c1: 'dusty blue', c2: 'antique rose', c3: 'ivory', c4: 'faded gold', accent: 'copper' },
  { tone: 'modern', c1: 'black', c2: 'white', c3: 'camel', c4: 'red', accent: 'gold' },
  { tone: 'sunset', c1: 'burnt orange', c2: 'dusty pink', c3: 'warm cream', c4: 'peach', accent: 'bronze' },
  { tone: 'parisian', c1: 'navy', c2: 'red', c3: 'cream', c4: 'black', accent: 'gold' },
  { tone: 'botanical', c1: 'forest green', c2: 'cream', c3: 'terracotta', c4: 'sage', accent: 'dried rose' },
  { tone: 'ethereal', c1: 'lilac', c2: 'powder blue', c3: 'cloud white', c4: 'pale mint', accent: 'silver' },
  { tone: 'autumn', c1: 'deep rust', c2: 'mustard', c3: 'cream', c4: 'burgundy', accent: 'antique gold' },
  { tone: 'minimalist', c1: 'greige', c2: 'soft white', c3: 'pale camel', c4: 'dove grey', accent: 'matte gold' },
  { tone: 'jewel', c1: 'sapphire blue', c2: 'ruby red', c3: 'ivory', c4: 'amethyst', accent: 'gold' },
  { tone: 'tuscan', c1: 'warm clay', c2: 'olive', c3: 'linen white', c4: 'sun gold', accent: 'copper' },
]

// ─── 5 Style Moods (rotate on 13-day cycle, coprime with 21) ────
const maleMoods = [
  { name: 'structured', desc: 'clean sharp lines and tailored precision', fabric: 'crisp wool and pressed cotton', silhouette: 'defined shoulders and slim-straight fit' },
  { name: 'relaxed', desc: 'effortless ease and soft drape', fabric: 'washed cotton and brushed cashmere', silhouette: 'relaxed natural shoulders and easy straight-leg' },
  { name: 'layered', desc: 'dimensional layering and texture contrast', fabric: 'mixed knits, cotton, and lightweight wool', silhouette: 'layered proportions with visible depth' },
  { name: 'textured', desc: 'rich tactile fabrics and surface interest', fabric: 'bouclé, corduroy, tweed, or ribbed knit', silhouette: 'naturally draped with fabric weight visible' },
  { name: 'monochrome', desc: 'tonal dressing in a single color family', fabric: 'varied textures in matching tones', silhouette: 'streamlined elongated proportions' },
]

const femaleMoods = [
  { name: 'structured', desc: 'architectural elegance with clean lines', fabric: 'tailored wool and structured silk', silhouette: 'defined waist with sharp proportions' },
  { name: 'flowing', desc: 'graceful movement and soft romanticism', fabric: 'silk chiffon, soft modal, and draped jersey', silhouette: 'fluid lines that move with the body' },
  { name: 'layered', desc: 'chic dimensional layering', fabric: 'mixed knits, silk, and lightweight outerwear', silhouette: 'proportion play with visible layers' },
  { name: 'textured', desc: 'luxurious tactile surfaces', fabric: 'bouclé, cashmere, velvet, or ribbed knit', silhouette: 'cocooning shapes with fabric richness' },
  { name: 'minimalist', desc: 'pared-back modern simplicity', fabric: 'premium basics in clean fabrics', silhouette: 'clean lines and effortless proportions' },
]

// ─── Index Helpers ────────────────────────────────────────────────
function getDayIndex(): number {
  return Math.floor(Date.now() / 86400000)
}

function getPaletteIndex(): number {
  return getDayIndex() % 21
}

function getMoodIndex(): number {
  return getDayIndex() % 13 // 13 is coprime with 21 → 273-day full cycle
}

// ─── Dressy Prompt ────────────────────────────────────────────────
function getTodaysPickPrompt(weather: WeatherInfo, gender: string): string {
  const pIdx = getPaletteIndex()
  const mIdx = getMoodIndex()
  const isCold = weather.temp < 10
  const isCool = weather.temp >= 10 && weather.temp < 20
  const isWarm = weather.temp >= 20 && weather.temp < 28
  const isHot = weather.temp >= 28
  const isRainy = ['Rain', 'Drizzle', 'Thunderstorm'].includes(weather.condition)
  const isSnowy = weather.condition === 'Snow'

  if (gender === 'female') {
    const p = femaleColorPalettes[pIdx % femaleColorPalettes.length]
    const m = femaleMoods[mIdx % femaleMoods.length]

    const moodSuffix = `Style mood: ${m.name} — ${m.desc}. Fabrics: ${m.fabric}. Silhouette: ${m.silhouette}. Luxury editorial quality.`

    if (isSnowy) return `luxurious winter outfit in ${p.tone} palette: stunning long wool coat in ${p.c1} with elegant draping, cozy cashmere turtleneck in ${p.c4}, tailored high-waisted wool trousers in ${p.c3}, premium insulated leather ankle boots, ${p.accent} cashmere scarf and leather gloves, delicate ${p.accent} jewelry. ${moodSuffix}`
    if (isRainy) return `chic rainy day outfit in ${p.tone} palette: structured waterproof trench coat in ${p.c3} with sleek silhouette, fine-knit sweater in ${p.c2}, tailored dark pants with slight crop, polished waterproof chelsea boots, compact ${p.accent} crossbody bag, minimalist earrings. ${moodSuffix}`
    if (isCold) return `elegant cold weather outfit in ${p.tone} palette: beautifully tailored wool coat in ${p.c2} with clean lines, soft cashmere V-neck in ${p.c1}, high-waisted wide-leg trousers in ${p.c3}, premium leather ankle boots, delicate ${p.accent} layered necklace. ${moodSuffix}`
    if (isCool) return `polished layered outfit in ${p.tone} palette: soft cashmere cardigan in ${p.c1} draped over silk camisole in ${p.c4}, high-waisted tailored trousers in ${p.c3}, clean pointed-toe flats or loafers, minimalist ${p.accent} jewelry, structured tote bag. ${moodSuffix}`
    if (isWarm) return `breezy elegant outfit in ${p.tone} palette: flowing linen blouse in ${p.c4} with feminine details, wide-leg linen pants or midi skirt in ${p.c3}, leather espadrilles or elegant sandals, ${p.accent} delicate bracelet, woven tote. ${moodSuffix}`
    if (isHot) return `cool summer outfit in ${p.tone} palette: lightweight silk or cotton dress in ${p.c2} with flattering cut, elegant flat sandals in natural leather, ${p.accent} minimalist jewelry, premium straw bag, chic sunglasses. ${moodSuffix}`
    return `versatile chic outfit in ${p.tone} palette: premium cashmere sweater in ${p.c1}, high-waisted ${p.c3} wide-leg trousers, elegant pointed flats, delicate ${p.accent} jewelry. ${moodSuffix}`
  }

  // Male
  const p = maleColorPalettes[pIdx % maleColorPalettes.length]
  const m = maleMoods[mIdx % maleMoods.length]

  const moodSuffix = `Style mood: ${m.name} — ${m.desc}. Fabrics: ${m.fabric}. Silhouette: ${m.silhouette}. Luxury editorial quality, naturally draped tailored silhouette.`

  if (isSnowy) return `sharp winter outfit in ${p.tone} palette: premium insulated wool overcoat in ${p.c2} with structured shoulders, chunky cable-knit sweater in ${p.c3}, relaxed-fit dark wool trousers with natural drape, waterproof leather boots in rich brown, ${p.accent} wool scarf, leather gloves. ${moodSuffix}`
  if (isRainy) return `sleek rainy day outfit in ${p.tone} palette: modern waterproof mac coat in ${p.c1}, fine merino crew-neck in ${p.c3}, relaxed-fit dark chinos with comfortable drape, polished waterproof chelsea boots, minimal ${p.accent} accent watch. ${moodSuffix}`
  if (isCold) return `distinguished cold weather outfit in ${p.tone} palette: tailored wool peacoat in ${p.c2}, fine merino turtleneck in ${p.c3}, straight-leg dark trousers with natural drape, premium brown leather boots, minimal ${p.accent} accent watch. ${moodSuffix}`
  if (isCool) return `smart modern outfit in ${p.tone} palette: premium cotton crew-neck sweater in ${p.c3} layered over crisp oxford shirt collar showing, relaxed straight-leg chinos in ${p.c1} with comfortable fit, clean leather sneakers or suede loafers, ${p.accent} accent leather belt. ${moodSuffix}`
  if (isWarm) return `refined warm weather outfit in ${p.tone} palette: breathable premium linen shirt in ${p.c3} with perfect drape, relaxed-fit cotton trousers in ${p.c4} with natural comfortable drape, leather sandals or canvas sneakers, minimal ${p.accent} watch. ${moodSuffix}`
  if (isHot) return `sharp summer outfit in ${p.tone} palette: lightweight camp-collar linen shirt in ${p.c3}, relaxed-fit cotton shorts or comfortable light chinos in ${p.c4}, premium leather sandals, ${p.accent} accent sunglasses. ${moodSuffix}`
  return `clean modern outfit in ${p.tone} palette: fine-knit cashmere sweater in ${p.c3}, relaxed straight-leg chinos in ${p.c1} with natural drape, premium leather belt, clean sneakers or suede loafers, ${p.accent} accent details. ${moodSuffix}`
}

// ─── Casual Prompt ────────────────────────────────────────────────
function getCasualPrompt(gender: string, temp: number): string {
  const pIdx = (getPaletteIndex() + 7) % 21 // offset from dressy palette
  const mIdx = (getMoodIndex() + 2) % 5     // offset from dressy mood
  const isWarm = temp >= 22

  if (gender === 'female') {
    const p = femaleColorPalettes[pIdx % femaleColorPalettes.length]
    const m = femaleMoods[mIdx % femaleMoods.length]
    const moodSuffix = `Style mood: ${m.name} — ${m.desc}. Fabrics: ${m.fabric}. Luxury editorial quality, naturally draped elegant silhouette.`

    if (isWarm) return `relaxed yet chic casual outfit in ${p.tone} palette: premium oversized cotton tee in ${p.c4} loosely tucked into high-waisted ${p.c3} straight-leg jeans, clean white leather sneakers, ${p.accent} minimalist crossbody bag, simple hoop earrings. ${moodSuffix}`
    return `cozy chic casual outfit in ${p.tone} palette: luxurious oversized ${p.c1} cashmere cardigan over fitted white tee, high-waisted light wash straight-leg jeans, clean ${p.c3} sneakers or tan suede loafers, delicate ${p.accent} necklace. ${moodSuffix}`
  }

  const p = maleColorPalettes[pIdx % maleColorPalettes.length]
  const m = maleMoods[mIdx % maleMoods.length]
  const moodSuffix = `Style mood: ${m.name} — ${m.desc}. Fabrics: ${m.fabric}. Luxury editorial quality, naturally draped silhouette.`

  if (isWarm) return `relaxed modern casual outfit in ${p.tone} palette: premium soft cotton crew-neck tee in ${p.c3}, comfortable relaxed-fit chino shorts in ${p.c4} with natural drape, clean canvas sneakers or leather slides, minimal ${p.accent} watch. ${moodSuffix}`
  return `elevated casual outfit in ${p.tone} palette: premium cotton ${p.c3} sweatshirt or half-zip pullover, straight-leg dark indigo jeans with comfortable relaxed fit, clean white leather sneakers, minimal ${p.accent} watch. ${moodSuffix}`
}

// ─── Unused but kept for future use ──────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _getEveningPrompt(gender: string, temp: number): string {
  const pIdx = (getPaletteIndex() + 14) % 21
  const mIdx = (getMoodIndex() + 4) % 5
  const needsOuterwear = temp < 18

  if (gender === 'female') {
    const p = femaleColorPalettes[pIdx % femaleColorPalettes.length]
    const m = femaleMoods[mIdx % femaleMoods.length]
    const moodSuffix = `Style mood: ${m.name} — ${m.desc}. Luxury editorial quality, naturally draped elegant silhouette.`
    if (needsOuterwear) return `glamorous evening outfit in ${p.tone} palette: stunning midi dress in ${p.c2} with elegant draping, structured ${p.c1} blazer draped over shoulders, strappy heeled sandals, ${p.accent} statement earrings, premium clutch bag. ${moodSuffix}`
    return `captivating evening outfit in ${p.tone} palette: sleek silk slip dress in ${p.c2} or form-fitting knit dress in ${p.c4}, strappy heeled sandals, ${p.accent} layered necklaces, elegant clutch. ${moodSuffix}`
  }

  const p = maleColorPalettes[pIdx % maleColorPalettes.length]
  const m = maleMoods[mIdx % maleMoods.length]
  const moodSuffix = `Style mood: ${m.name} — ${m.desc}. Luxury editorial quality, naturally draped tailored silhouette.`
  if (needsOuterwear) return `sharp evening outfit in ${p.tone} palette: unstructured soft blazer in ${p.c1} over ${p.c2} turtleneck, straight-leg dark trousers with comfortable drape, sleek leather dress shoes, minimal ${p.accent} watch. ${moodSuffix}`
  return `refined evening outfit in ${p.tone} palette: premium ${p.c1} button-up shirt with sleeves slightly rolled revealing ${p.accent} watch, relaxed-fit dark trousers with natural drape, polished leather loafers. ${moodSuffix}`
}

export function getDailyScenarios(weather: WeatherInfo, gender: string): ImageScenario[] {
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
