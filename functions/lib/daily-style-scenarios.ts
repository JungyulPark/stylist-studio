/**
 * Weather-based daily style scenarios for image generation.
 * Informed by Auralee, Hermès, Louis Vuitton 2025-2026 collections.
 *
 * 21 palettes × 5 styling archetypes, rotating on coprime cycles (21 & 13).
 * 273 days before an exact palette+archetype repeat; weather adds more variety.
 */

import type { ImageScenario } from './gemini-image'

interface WeatherInfo {
  temp: number
  condition: string
  wind_speed: number
}

// ─── 21 Color Palettes (curated from real runway palettes) ───────
const maleColorPalettes = [
  // Hermès FW25 inspired
  { tone: 'espresso earth', c1: 'deep espresso brown', c2: 'charcoal grey', c3: 'porcelain cream', c4: 'burnished taupe', accent: 'blood orange' },
  // Auralee FW26 inspired
  { tone: 'royal matte', c1: 'royal blue', c2: 'ink black', c3: 'oatmeal', c4: 'slate', accent: 'mint green' },
  // LV Pre-Spring 2026 heritage
  { tone: 'anglomania', c1: 'tweedy brown', c2: 'herringbone grey', c3: 'cream', c4: 'dark olive', accent: 'burgundy' },
  // Hermès SS26 linen mood
  { tone: 'porcelain sand', c1: 'charcoal olive', c2: 'warm sand', c3: 'porcelain white', c4: 'stone mist', accent: 'copper' },
  // Brunello Cucinelli tonal
  { tone: 'warm cashmere', c1: 'camel', c2: 'oatmeal', c3: 'vanilla cream', c4: 'soft taupe', accent: 'burnt sienna' },
  // Loro Piana quiet luxury
  { tone: 'alpine grey', c1: 'pewter grey', c2: 'cloud white', c3: 'pale stone', c4: 'soft charcoal', accent: 'forest green' },
  // Classic navy
  { tone: 'midnight nav', c1: 'midnight navy', c2: 'chalk white', c3: 'dove grey', c4: 'warm sand', accent: 'old gold' },
  // Auralee boiled wool
  { tone: 'matte wool', c1: 'dark olive', c2: 'tobacco brown', c3: 'ecru', c4: 'moss green', accent: 'brick red' },
  // Earth tones 2026
  { tone: 'clay earth', c1: 'terracotta clay', c2: 'dark sage', c3: 'raw linen', c4: 'walnut brown', accent: 'amber' },
  // Hermès chrome green
  { tone: 'chrome green', c1: 'chrome green', c2: 'pebble grey', c3: 'bone white', c4: 'dark bronze', accent: 'vanilla' },
  // LV Pharrell futurism
  { tone: 'graphite modern', c1: 'graphite black', c2: 'silver grey', c3: 'ivory', c4: 'deep indigo', accent: 'electric blue' },
  // Auralee SS26 fresh
  { tone: 'ocean air', c1: 'faded ocean blue', c2: 'driftwood', c3: 'off-white linen', c4: 'washed sage', accent: 'sunset coral' },
  // Nordic minimalism
  { tone: 'birch white', c1: 'birch white', c2: 'pale grey', c3: 'cream wool', c4: 'pine green', accent: 'copper' },
  // Tuscan warmth
  { tone: 'tuscan sun', c1: 'sun-bleached terracotta', c2: 'olive', c3: 'warm cream', c4: 'dried lavender', accent: 'aged gold' },
  // Urban monochrome
  { tone: 'ink mono', c1: 'jet black', c2: 'medium charcoal', c3: 'heather grey', c4: 'off-white', accent: 'matte silver' },
  // Desert palette
  { tone: 'sand dune', c1: 'coyote tan', c2: 'dusty clay', c3: 'warm sand', c4: 'sage green', accent: 'turquoise' },
  // Maritime heritage
  { tone: 'maritime', c1: 'dark navy', c2: 'rope beige', c3: 'crisp white', c4: 'faded indigo', accent: 'red' },
  // Autumnal richness
  { tone: 'burnt amber', c1: 'burnt amber', c2: 'dark mahogany', c3: 'wheat', c4: 'deep forest', accent: 'old gold' },
  // Soft studio
  { tone: 'studio warm', c1: 'warm grey', c2: 'sandstone', c3: 'parchment', c4: 'espresso', accent: 'bronze' },
  // Vintage workwear
  { tone: 'worn canvas', c1: 'faded indigo', c2: 'worn khaki', c3: 'raw ecru', c4: 'rust brown', accent: 'antique brass' },
  // Slate cool
  { tone: 'steel blue', c1: 'steel blue', c2: 'slate', c3: 'ice white', c4: 'deep navy', accent: 'teal' },
]

const femaleColorPalettes = [
  // Hermès FW25 "Leather Dandy"
  { tone: 'noir leather', c1: 'ink black', c2: 'deep charcoal', c3: 'warm ivory', c4: 'cognac brown', accent: 'gold' },
  // Hermès SS26 sporty-chic
  { tone: 'cognac polish', c1: 'polished cognac', c2: 'cream', c3: 'sand', c4: 'dark chocolate', accent: 'gold buckle' },
  // Auralee fabric-first soft
  { tone: 'cashmere blush', c1: 'dusty rose', c2: 'baby cashmere beige', c3: 'pearl white', c4: 'muted lavender', accent: 'rose gold' },
  // LV SS26 domestic comfort
  { tone: 'silk plush', c1: 'champagne silk', c2: 'soft camel', c3: 'powder pink', c4: 'warm grey', accent: 'antique gold' },
  // Deep jewel
  { tone: 'jewel depth', c1: 'emerald', c2: 'deep burgundy', c3: 'ivory', c4: 'midnight blue', accent: 'bronze' },
  // Fresh sage
  { tone: 'garden fresh', c1: 'sage green', c2: 'petal pink', c3: 'cream', c4: 'soft fern', accent: 'coral' },
  // Parisian classic
  { tone: 'parisian', c1: 'navy', c2: 'red', c3: 'cream', c4: 'black', accent: 'gold' },
  // Auralee mint-pop FW26
  { tone: 'mint pop', c1: 'mint green', c2: 'ecru', c3: 'light grey', c4: 'royal blue accent', accent: 'silver' },
  // Romantic evening
  { tone: 'mauve romantic', c1: 'mauve', c2: 'soft peach', c3: 'ivory', c4: 'blush', accent: 'pearl' },
  // Nordic ice
  { tone: 'frost nordic', c1: 'ice white', c2: 'pale blue', c3: 'silver birch', c4: 'frost grey', accent: 'rose gold' },
  // Tuscan earth
  { tone: 'tuscan earth', c1: 'warm clay', c2: 'olive', c3: 'linen white', c4: 'sun gold', accent: 'copper' },
  // Berry winter
  { tone: 'berry rich', c1: 'raspberry', c2: 'plum', c3: 'cream', c4: 'deep wine', accent: 'gold' },
  // Coastal light
  { tone: 'coastal', c1: 'sand', c2: 'ocean blue', c3: 'white', c4: 'driftwood grey', accent: 'turquoise' },
  // Sunset warmth
  { tone: 'sunset glow', c1: 'burnt orange', c2: 'dusty pink', c3: 'warm cream', c4: 'peach', accent: 'bronze' },
  // Ethereal pastel
  { tone: 'ethereal', c1: 'lilac', c2: 'powder blue', c3: 'cloud white', c4: 'pale mint', accent: 'silver' },
  // Rich autumn
  { tone: 'autumn leaf', c1: 'deep rust', c2: 'mustard', c3: 'cream', c4: 'burgundy', accent: 'antique gold' },
  // Minimalist greige
  { tone: 'quiet greige', c1: 'greige', c2: 'soft white', c3: 'pale camel', c4: 'dove grey', accent: 'matte gold' },
  // Natural oatmeal
  { tone: 'natural linen', c1: 'oatmeal', c2: 'olive green', c3: 'sand', c4: 'warm taupe', accent: 'amber' },
  // Botanical
  { tone: 'botanical', c1: 'forest green', c2: 'cream', c3: 'terracotta', c4: 'sage', accent: 'dried rose' },
  // Vintage blue
  { tone: 'vintage blue', c1: 'dusty blue', c2: 'antique rose', c3: 'ivory', c4: 'faded gold', accent: 'copper' },
  // Modern contrast
  { tone: 'modern mono', c1: 'black', c2: 'white', c3: 'camel', c4: 'red', accent: 'gold' },
]

// ─── 5 Styling Archetypes (brand-informed, 13-day cycle) ─────────
const maleMoods = [
  // Hermès: precision with equestrian ease
  { name: 'Hermès precision', guide: 'Soft unstructured shoulders, sharp vigorous trouser lines. Horn buttons, glove-stitched edges. Cashmere flannel and wool gabardine with visible weight and drape. Polished leather derbies or chelsea boots.' },
  // Auralee: fabric-first Japanese minimalism
  { name: 'Auralee minimal', guide: 'Fabric takes the lead — boiled wool, garment-washed cotton poplin, baby cashmere. Dropped-shoulder seams, relaxed body with clean hems. Matte textures. Proprietary suede shoes or simple leather sneakers.' },
  // Brunello Cucinelli: warm relaxed elegance
  { name: 'Cucinelli ease', guide: 'Warm layered look — fine-gauge knit over spread-collar shirt, collar and cuffs visible. Cashmere-blend sweater or gilet. Straight-leg trousers with single pleat. Suede loafers, no socks. Minimal leather watch.' },
  // Loro Piana: razor-sharp quiet luxury
  { name: 'Loro Piana quiet', guide: 'Pared-down razor-clean silhouette where extraordinary fabric speaks. Tonal dressing, single color family across textures. Storm System cashmere overcoat or zip jacket. Slim straight trousers, clean leather shoes.' },
  // LV heritage-modern: textural pattern play
  { name: 'LV heritage', guide: 'Heritage patterns reimagined — Prince of Wales check, herringbone, houndstooth in updated proportions. Tweed with modern cut. Structured coat over relaxed knitwear. Polished boots, bold watch or ring.' },
  // Bottega Veneta: contemporary edge
  { name: 'Bottega urban', guide: 'Bold contemporary edge — forest green or deep burgundy double-breasted coat, architectural shoulders. Textured leather pieces, woven intrecciato motif. Dark palette with one pop accent. Lug-sole boots, matte black accessories.' },
  // Lemaire: architectural ease
  { name: 'Lemaire ease', guide: 'Sculpted drape with relaxed silhouette — oversized shirt jacket in washed cotton, wide band-collar shirt, tapered wool trousers with volume at hip. Earthy palette: clay, sand, charcoal. Simple leather derbies, canvas tote.' },
]

const femaleMoods = [
  // Hermès FW25 "Leather Dandy": fitted precision
  { name: 'Hermès dandy', guide: 'Incredibly fitted but not constrictive — accentuated waist, defined lines. Contrasting textures: ribbed knits with quilted leather, wool with shearling. Polished equestrian boots. Minimal gold hardware.' },
  // Auralee: quiet fabric luxury
  { name: 'Auralee soft', guide: 'Fabric-first — garment-dyed cashmere poplin, high-twist wool, supple leather in soft forms. Loose silhouette balanced with one fitted piece. Matte surfaces. Simple elegant flats or loafers.' },
  // LV SS26 domestic comfort: plush approachable
  { name: 'LV comfort', guide: 'Plush and approachable — billowing silhouettes, elegant fluidity, flowing draperies evoking comfort and femininity. Silky trousers, knit pieces, loose coats. Flat shoes. Soft and serene.' },
  // Hermès SS26: sporty-chic with polish
  { name: 'Hermès sport', guide: 'Sporty-chic with flirty edge — curve-aware proportions, structured harness or buckle details. Hand-polished cognac leather. Short boots or strappy sandals. Confidence-forward styling.' },
  // Minimalist The Row / Jil Sander
  { name: 'minimal Row', guide: 'Pared-back perfection — every seam intentional. Oversized coat or blazer over slip dress or wide trousers. Tonal monochrome dressing. Pointed flats or block-heel boots. One statement piece of jewelry.' },
  // Bottega Veneta: sculptural femininity
  { name: 'Bottega sculptural', guide: 'Sculptural forms with rich material — structured leather or padded knit pieces. Deep jewel tones: emerald, burgundy, midnight. Architectural handbag as focal point. Knee-high boots or platform sandals. Bold gold jewelry.' },
  // Max Mara: timeless Italian craft
  { name: 'Max Mara timeless', guide: 'Enduring Italian elegance — double-breasted camel coat or structured blazer in cream. Silk blouses with soft bow neck. Pressed wool wide-leg trousers. Pointed-toe pumps, tortoiseshell sunglasses. Structured leather bag. Warm earth tones.' },
]

// ─── Index Helpers ────────────────────────────────────────────────
function getDayIndex(): number {
  return Math.floor(Date.now() / 86400000)
}

function getPaletteIndex(): number {
  return getDayIndex() % 21
}

function getMoodIndex(): number {
  return getDayIndex() % 13
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
    const arch = `STYLING: ${m.name} — ${m.guide}`

    if (isSnowy) return `luxurious winter outfit (${p.tone}): ankle-length double-face wool coat in ${p.c1}, cashmere ribbed turtleneck in ${p.c4}, high-waisted wool flannel wide-leg trousers in ${p.c3}, insulated leather ankle boots with lug sole, ${p.accent} cashmere scarf tucked into coat, leather gloves. ${arch}`
    if (isRainy) return `polished rainy day outfit (${p.tone}): water-resistant gabardine trench coat in ${p.c3} with belt cinched, fine-gauge merino crewneck in ${p.c2}, cropped tailored trousers in dark ${p.c1}, polished waterproof chelsea boots, compact leather crossbody in ${p.accent}, minimal stud earrings. ${arch}`
    if (isCold) return `refined cold weather outfit (${p.tone}): tailored cashmere-blend coat in ${p.c2} with notch lapel, silk-cashmere V-neck in ${p.c1}, high-waisted pressed wool trousers in ${p.c3} with single pleat, pointed-toe leather ankle boots, delicate ${p.accent} layered necklace. ${arch}`
    if (isCool) return `polished layered outfit (${p.tone}): unstructured soft blazer in ${p.c1} over fine-knit silk camisole in ${p.c4}, high-waisted tailored trousers in ${p.c3} with gentle drape, pointed ballet flats or suede loafers, ${p.accent} minimal bracelet, structured leather tote. ${arch}`
    if (isWarm) return `breezy elegant outfit (${p.tone}): fluid cotton-silk blouse in ${p.c4} with hidden placket, wide-leg linen trousers in ${p.c3} or draped midi skirt, leather espadrille wedges or elegant sandals, ${p.accent} delicate cuff bracelet, woven straw tote. ${arch}`
    if (isHot) return `cool summer outfit (${p.tone}): lightweight silk shirt dress in ${p.c2} with rolled sleeves and waist tie, flat leather sandals in natural tan, ${p.accent} minimalist pendant necklace, premium straw clutch, tortoiseshell sunglasses. ${arch}`
    return `versatile chic outfit (${p.tone}): fine-gauge cashmere crewneck in ${p.c1}, high-waisted ${p.c3} wide-leg trousers with knife pleat, pointed-toe flats in ${p.c4}, delicate ${p.accent} earrings, structured leather bag. ${arch}`
  }

  // Male
  const p = maleColorPalettes[pIdx % maleColorPalettes.length]
  const m = maleMoods[mIdx % maleMoods.length]
  const arch = `STYLING: ${m.name} — ${m.guide}`

  if (isSnowy) return `sharp winter outfit (${p.tone}): double-breasted wool overcoat in ${p.c2} with peak lapel, chunky Shetland cable-knit sweater in ${p.c3}, straight-leg flannel trousers in dark ${p.c1} with half-break hem, waterproof leather derby boots in rich brown, ${p.accent} brushed-wool scarf, leather cashmere-lined gloves. ${arch}`
  if (isRainy) return `sleek rainy day outfit (${p.tone}): water-resistant cotton gabardine mac coat in ${p.c1} with concealed placket, fine merino crewneck in ${p.c3}, straight-leg dark cotton drill chinos with clean hem, polished waterproof chelsea boots, minimal ${p.accent}-dial watch. ${arch}`
  if (isCold) return `refined cold weather outfit (${p.tone}): single-breasted wool peacoat in ${p.c2} with notch lapel, fine-gauge merino turtleneck in ${p.c3}, straight-leg pressed wool trousers in ${p.c1} with natural drape, premium brown suede chelsea boots, minimal ${p.accent} accent watch, leather gloves. ${arch}`
  if (isCool) return `smart modern outfit (${p.tone}): cashmere-cotton crewneck sweater in ${p.c3} layered over oxford shirt with collar visible, straight-leg cotton chinos in ${p.c1} with single pleat, clean suede loafers or polished leather sneakers, ${p.accent} woven leather belt, brushed metal watch. ${arch}`
  if (isWarm) return `refined warm weather outfit (${p.tone}): garment-washed linen spread-collar shirt in ${p.c3} with sleeves rolled to forearm, relaxed cotton-linen trousers in ${p.c4} with drawstring waist, woven leather espadrilles or canvas slip-ons, minimal ${p.accent} watch, tortoiseshell sunglasses. ${arch}`
  if (isHot) return `sharp summer outfit (${p.tone}): lightweight camp-collar linen shirt in ${p.c3} with textured weave, relaxed-fit Bermuda shorts in ${p.c4} or light cotton chinos, premium leather sandals or clean canvas sneakers, ${p.accent} acetate sunglasses. ${arch}`
  return `clean modern outfit (${p.tone}): fine-gauge cashmere crewneck in ${p.c3}, straight-leg cotton chinos in ${p.c1} with natural drape, premium leather belt with brushed buckle, clean white leather sneakers or tan suede derbies, ${p.accent} accent details. ${arch}`
}

// ─── Casual Prompt ────────────────────────────────────────────────
function getCasualPrompt(gender: string, temp: number): string {
  const pIdx = (getPaletteIndex() + 7) % 21
  const mIdx = (getMoodIndex() + 2) % 7
  const isCold = temp < 10
  const isWarm = temp >= 22

  if (gender === 'female') {
    const p = femaleColorPalettes[pIdx % femaleColorPalettes.length]
    const m = femaleMoods[mIdx % femaleMoods.length]
    const arch = `STYLING: ${m.name} — ${m.guide}`

    if (isWarm) return `relaxed chic casual outfit (${p.tone}): premium oversized cotton tee in ${p.c4} with dropped shoulders, loosely half-tucked into high-waisted ${p.c3} straight-leg jeans, clean white leather sneakers, ${p.accent} minimalist leather crossbody bag, simple gold hoop earrings. ${arch}`
    if (isCold) return `cozy weekend outfit (${p.tone}): chunky ribbed-knit cardigan in ${p.c1} over fitted white cotton tee, high-waisted dark straight-leg jeans, ${p.c3} suede ankle boots or clean sneakers, ${p.accent} knit beanie, leather tote bag. ${arch}`
    return `cozy chic casual outfit (${p.tone}): oversized baby-cashmere cardigan in ${p.c1} draped open over fitted white tee, high-waisted light-wash straight-leg jeans, clean ${p.c3} canvas sneakers or tan suede loafers, delicate ${p.accent} pendant necklace. ${arch}`
  }

  const p = maleColorPalettes[pIdx % maleColorPalettes.length]
  const m = maleMoods[mIdx % maleMoods.length]
  const arch = `STYLING: ${m.name} — ${m.guide}`

  if (isWarm) return `relaxed modern casual outfit (${p.tone}): garment-dyed cotton crewneck tee in ${p.c3}, comfortable relaxed-fit cotton chino shorts in ${p.c4} with flat front, clean canvas sneakers or leather slides, minimal ${p.accent} watch with NATO strap. ${arch}`
  if (isCold) return `elevated weekend outfit (${p.tone}): brushed-fleece ${p.c3} zip hoodie or quarter-zip pullover layered under ${p.c1} wool overshirt jacket, straight-leg dark indigo selvedge jeans, ${p.c4} suede desert boots or clean leather sneakers, ${p.accent} knit scarf. ${arch}`
  return `elevated casual outfit (${p.tone}): premium cotton ${p.c3} French-terry sweatshirt or half-zip pullover, straight-leg dark indigo jeans with comfortable relaxed fit, clean white leather sneakers, minimal ${p.accent} watch. ${arch}`
}

export function getDailyScenarios(weather: WeatherInfo, gender: string): ImageScenario[] {
  return [
    { id: 'dressy', prompt: getTodaysPickPrompt(weather, gender) },
    { id: 'casual', prompt: getCasualPrompt(gender, weather.temp) },
  ]
}

/** Label translations for daily scenarios */
export const dailyScenarioLabels: Record<string, Record<string, string>> = {
  'dressy': { ko: '격식 스타일', en: 'Dressy', ja: 'ドレッシー', zh: '正式穿搭', es: 'Elegante' },
  'casual': { ko: '캐주얼', en: 'Casual', ja: 'カジュアル', zh: '休闲', es: 'Casual' },
}
