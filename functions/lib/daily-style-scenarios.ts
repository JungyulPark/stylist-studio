/**
 * Weather-based daily style scenarios for image generation.
 * Informed by Auralee, Hermès, Louis Vuitton 2025-2026 collections.
 *
 * 21 palettes × 10 styling archetypes, rotating on coprime cycles (21 & 10).
 * 210 days before an exact palette+archetype repeat; weather adds more variety.
 */

import type { ImageScenario } from './gemini-image'

interface WeatherInfo {
  temp: number
  condition: string
  wind_speed: number
}

// ─── 21 Color Palettes (curated from real runway palettes) ───────
const maleColorPalettes = [
  // Rich jewel-toned (replaces brown-heavy espresso earth)
  { tone: 'midnight plum', c1: 'dark plum', c2: 'charcoal', c3: 'silver grey', c4: 'deep navy', accent: 'amethyst' },
  // Auralee FW26 inspired
  { tone: 'royal matte', c1: 'royal blue', c2: 'ink black', c3: 'oatmeal', c4: 'slate', accent: 'mint green' },
  // LV Pre-Spring 2026 heritage
  { tone: 'anglomania', c1: 'tweedy brown', c2: 'herringbone grey', c3: 'cream', c4: 'dark olive', accent: 'burgundy' },
  // Hermès SS26 linen mood
  { tone: 'porcelain sand', c1: 'charcoal olive', c2: 'warm sand', c3: 'porcelain white', c4: 'stone mist', accent: 'copper' },
  // Cool winter palette (replaces brown-heavy warm cashmere)
  { tone: 'glacier mist', c1: 'ice blue', c2: 'pearl grey', c3: 'winter white', c4: 'deep slate', accent: 'brushed gold' },
  // Loro Piana quiet luxury
  { tone: 'alpine grey', c1: 'pewter grey', c2: 'cloud white', c3: 'pale stone', c4: 'soft charcoal', accent: 'forest green' },
  // Classic navy
  { tone: 'midnight nav', c1: 'midnight navy', c2: 'chalk white', c3: 'dove grey', c4: 'warm sand', accent: 'old gold' },
  // Auralee boiled wool
  { tone: 'matte wool', c1: 'dark olive', c2: 'tobacco brown', c3: 'ecru', c4: 'moss green', accent: 'brick red' },
  // Deep green luxury (replaces brown-heavy clay earth)
  { tone: 'emerald shadow', c1: 'deep emerald', c2: 'charcoal', c3: 'ivory', c4: 'dark teal', accent: 'copper' },
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
  // Cool neutral (replaces brown-heavy sand dune)
  { tone: 'smoke charcoal', c1: 'dark charcoal', c2: 'medium grey', c3: 'off-white', c4: 'slate blue', accent: 'brushed silver' },
  // Maritime heritage
  { tone: 'maritime', c1: 'dark navy', c2: 'rope beige', c3: 'crisp white', c4: 'faded indigo', accent: 'red' },
  // Deep wine (replaces brown-heavy burnt amber)
  { tone: 'deep burgundy', c1: 'dark burgundy', c2: 'ink black', c3: 'cream', c4: 'deep charcoal', accent: 'old gold' },
  // Soft studio (cool-shifted)
  { tone: 'studio cool', c1: 'cool grey', c2: 'stone blue', c3: 'parchment', c4: 'dark slate', accent: 'bronze' },
  // Vintage workwear (indigo-focused)
  { tone: 'worn indigo', c1: 'faded indigo', c2: 'washed navy', c3: 'raw ecru', c4: 'dark denim', accent: 'antique brass' },
  // Slate cool
  { tone: 'steel blue', c1: 'steel blue', c2: 'slate', c3: 'ice white', c4: 'deep navy', accent: 'teal' },
]

const femaleColorPalettes = [
  // Hermès FW25 "Leather Dandy"
  { tone: 'noir leather', c1: 'ink black', c2: 'deep charcoal', c3: 'warm ivory', c4: 'cognac brown', accent: 'gold' },
  // Midnight luxury (replaces brown-heavy cognac polish)
  { tone: 'midnight silk', c1: 'midnight navy', c2: 'silver', c3: 'pearl white', c4: 'deep charcoal', accent: 'gold chain' },
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
  // Cool lavender (replaces brown-heavy tuscan earth)
  { tone: 'lavender dusk', c1: 'deep lavender', c2: 'charcoal', c3: 'soft white', c4: 'steel grey', accent: 'rose gold' },
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
  // Soft orchid (replaces brown-heavy natural linen)
  { tone: 'orchid mist', c1: 'soft orchid', c2: 'pale grey', c3: 'ivory', c4: 'dusty lavender', accent: 'rose gold' },
  // Botanical
  { tone: 'botanical', c1: 'forest green', c2: 'cream', c3: 'terracotta', c4: 'sage', accent: 'dried rose' },
  // Vintage blue
  { tone: 'vintage blue', c1: 'dusty blue', c2: 'antique rose', c3: 'ivory', c4: 'faded gold', accent: 'copper' },
  // Modern contrast
  { tone: 'modern mono', c1: 'black', c2: 'white', c3: 'camel', c4: 'red', accent: 'gold' },
]

// ─── 10 Styling Archetypes (brand-informed, 10-day cycle) ────────
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
  // Tom Ford: razor-sharp tailoring
  { name: 'Tom Ford sharp', guide: 'Razor-sharp tailoring with confident ease. Peak-lapel jacket with clean chest, slim straight trousers with perfect break. Rich fabrics: mohair-blend suiting, silk-cotton knit. Polished oxford shoes, bold watch. Monochrome or dark tonal palette.' },
  // Celine: slim modern Parisian
  { name: 'Celine modern', guide: 'Slim sharp Parisian silhouette with youthful edge. Fitted leather jacket or slim blazer, narrow trousers, Chelsea boots. Clean lines, dark palette, no excess. Confidence in restraint.' },
  // Zegna: luxurious Italian softness
  { name: 'Zegna refined', guide: 'Luxurious Italian softness with structure. Unlined cashmere blazer over fine-gauge polo or mock-neck, relaxed tailored trousers with soft pleat. Triple Stitch sneakers or suede loafers. Warm earth and grey tones. Effortless sophistication.' },
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
  // Celine: sharp Parisian minimalism
  { name: 'Celine Parisian', guide: 'Sharp Parisian minimalism with edge. Fitted blazer or leather jacket, silk camisole, slim cigarette trousers or mini skirt with tights. Pointed-toe boots, structured bag. Black and cream palette with one accent. Cool confidence.' },
  // Valentino: modern romantic elegance
  { name: 'Valentino romantic', guide: 'Modern romantic elegance. Flowing midi dress or wide palazzo trousers with draped blouse. Rich jewel tones or soft pastels. Elegant heels or embellished flats. Statement earrings, feminine clutch.' },
  // Dior: architectural French femininity
  { name: 'Dior structured', guide: 'Architectural French femininity. Fitted bar jacket or structured coat-dress with nipped waist. A-line midi skirt or tailored cigarette trousers. Lady-like pumps, structured handbag. Pearl or gold accessories. Polished and poised.' },
]

// ─── Skin Tone Adaptive Directive (appended to all prompts) ──────
const SKIN_TONE_DIRECTIVE = ' Adapt specified colors to this person\'s skin undertone — shift warm if golden/peachy skin, shift cool if pink/rosy skin.'

// ─── Index Helpers ────────────────────────────────────────────────
function getDayIndex(): number {
  return Math.floor(Date.now() / 86400000)
}

function getPaletteIndex(): number {
  return getDayIndex() % 21
}

function getMoodIndex(): number {
  return getDayIndex() % 10
}

// ─── Dressy Cold-Weather Item Pools (7 each, coprime with 21 & 10 for max variety) ──
// Real stylists never recommend the same outfit two days in a row.
// 7 tops × 7 outers × 21 palettes × 10 archetypes = 10,290 unique dressy combinations.

interface ColdKit { top: string; outer: string; bottom: string; shoes: string; acc: string }

const maleFreezingKits: ColdKit[] = [
  { top: 'chunky cable-knit crew sweater', outer: 'long padded down parka with fur-trimmed hood', bottom: 'heavy flannel trousers', shoes: 'waterproof insulated leather derby boots', acc: 'thick wool scarf, cashmere-lined leather gloves, knit beanie' },
  { top: 'cashmere ribbed turtleneck', outer: 'double-breasted heavy wool overcoat with peak lapel', bottom: 'straight-leg wool flannel trousers', shoes: 'insulated leather chelsea boots', acc: 'brushed-wool scarf, shearling gloves' },
  { top: 'heavyweight merino half-zip pullover over thermal base', outer: 'hooded down-filled puffer coat', bottom: 'fleece-lined straight-leg chinos', shoes: 'waterproof suede lace-up boots', acc: 'cashmere neck gaiter, tech-touch gloves, wool cap' },
  { top: 'shawl-collar lambswool cardigan over mock-neck tee', outer: 'ankle-length quilted down coat with stand collar', bottom: 'heavy wool trousers with single pleat', shoes: 'insulated leather derby boots', acc: 'chunky knit scarf, leather gloves, ear warmers' },
  { top: 'Shetland wool crew sweater with textured knit', outer: 'shearling-lined suede coat with belt', bottom: 'pressed heavy wool trousers', shoes: 'shearling-lined leather boots', acc: 'wool scarf, cashmere gloves, knit beanie' },
  { top: 'cashmere zip-through hoodie over fitted thermal', outer: 'technical down parka with concealed hood', bottom: 'fleece-lined wool blend trousers', shoes: 'Gore-Tex lined leather boots', acc: 'merino buff, insulated gloves, wool beanie' },
  { top: 'heavy gauge mock-neck sweater', outer: 'wool duffle coat with toggle closures', bottom: 'straight-leg flannel trousers', shoes: 'waterproof leather ankle boots', acc: 'oversized wool scarf, lined leather gloves' },
]

const maleBitterColdKits: ColdKit[] = [
  { top: 'fine-gauge merino turtleneck', outer: 'single-breasted cashmere-blend overcoat reaching below knee', bottom: 'pressed wool trousers with natural drape', shoes: 'premium suede chelsea boots', acc: 'wool scarf, leather gloves' },
  { top: 'cashmere crewneck sweater layered over oxford shirt', outer: 'double-breasted wool peacoat with notch lapel', bottom: 'straight-leg flannel trousers', shoes: 'polished leather derby boots', acc: 'silk-wool blend scarf, minimal watch' },
  { top: 'half-zip cashmere pullover over cotton tee', outer: 'quilted wool field jacket with stand collar', bottom: 'heavy cotton twill chinos', shoes: 'insulated suede desert boots', acc: 'cashmere scarf, leather gloves, wool cap' },
  { top: 'shawl-collar wool cardigan over fitted shirt', outer: 'camel hair topcoat with minimal buttons', bottom: 'straight-leg wool trousers', shoes: 'burnished leather ankle boots', acc: 'lightweight cashmere scarf, brushed metal watch' },
  { top: 'chunky ribbed mock-neck sweater', outer: 'belted wool trench-style coat', bottom: 'tapered wool blend trousers', shoes: 'leather chelsea boots', acc: 'knit scarf, suede gloves' },
  { top: 'merino wool polo neck', outer: 'padded down blazer-coat hybrid', bottom: 'pressed wool-flannel trousers', shoes: 'premium leather lace-up boots', acc: 'wool-cashmere blend scarf, leather gloves' },
  { top: 'cashmere V-neck sweater over spread-collar shirt', outer: 'long herringbone wool coat', bottom: 'straight-leg pressed trousers', shoes: 'suede chelsea boots', acc: 'silk pocket square, minimal watch, light scarf' },
]

const maleColdKits: ColdKit[] = [
  { top: 'fine-gauge merino turtleneck', outer: 'single-breasted wool peacoat with notch lapel', bottom: 'straight-leg pressed wool trousers', shoes: 'premium brown suede chelsea boots', acc: 'minimal watch, leather gloves' },
  { top: 'cashmere crewneck over crisp oxford shirt', outer: 'unstructured wool blazer-coat', bottom: 'tapered wool blend chinos', shoes: 'polished leather derby shoes', acc: 'woven leather belt, brushed metal watch' },
  { top: 'fine-gauge merino crewneck over spread-collar shirt', outer: 'single-breasted cashmere overcoat with notch lapel', bottom: 'straight-leg pressed wool trousers', shoes: 'polished leather chelsea boots', acc: 'silk pocket square, brushed metal watch' },
  { top: 'mock-neck ribbed knit', outer: 'tailored cashmere-blend topcoat', bottom: 'pressed wool trousers with single pleat', shoes: 'leather ankle boots', acc: 'minimal watch, cashmere-lined gloves' },
  { top: 'cashmere V-neck sweater over crisp white shirt', outer: 'double-breasted wool coat with peak lapel', bottom: 'tapered wool trousers with knife pleat', shoes: 'burnished leather derby shoes', acc: 'leather belt, brushed metal watch' },
  { top: 'fitted merino crew sweater', outer: 'mid-length wool overcoat', bottom: 'tapered flannel trousers', shoes: 'burnished leather chelsea boots', acc: 'silk-knit scarf, brushed watch' },
  { top: 'fine-gauge cashmere polo neck', outer: 'structured wool chesterfield coat', bottom: 'straight-leg wool trousers with clean hem', shoes: 'polished leather oxford shoes', acc: 'minimal watch, leather gloves' },
]

const femaleColdKits: ColdKit[] = [
  { top: 'silk-cashmere V-neck sweater', outer: 'tailored cashmere-blend coat with notch lapel', bottom: 'high-waisted pressed wool trousers with single pleat', shoes: 'pointed-toe leather ankle boots', acc: 'delicate layered necklace' },
  { top: 'fine-gauge merino turtleneck', outer: 'structured double-breasted wool blazer-coat', bottom: 'wide-leg wool trousers', shoes: 'suede ankle boots with block heel', acc: 'gold cuff bracelet, structured leather bag' },
  { top: 'cashmere wrap-front knit top', outer: 'belted wool coat with shawl collar', bottom: 'high-waisted tailored trousers', shoes: 'pointed ballet flats with wool lining', acc: 'delicate pendant necklace, leather gloves' },
  { top: 'ribbed mock-neck fitted sweater', outer: 'oversized wool-cashmere coat', bottom: 'straight-leg pressed trousers', shoes: 'leather knee-high boots', acc: 'minimal gold studs, crossbody bag' },
  { top: 'fitted crewneck cashmere sweater', outer: 'single-breasted camel wool coat with belt', bottom: 'high-waisted wool culottes', shoes: 'polished leather ankle boots', acc: 'silk scarf as accent, structured tote' },
  { top: 'silk blouse with soft bow neck', outer: 'tailored wool trench coat with peak lapel', bottom: 'tapered wool trousers with knife pleat', shoes: 'pointed-toe ankle boots', acc: 'minimal gold bracelet, structured leather bag' },
  { top: 'knit polo collar sweater', outer: 'long wool overcoat with minimal buttons', bottom: 'wide-leg pressed trousers', shoes: 'pointed-toe mules or ankle boots', acc: 'leather belt, delicate earrings' },
]

const femaleFreezingKits: ColdKit[] = [
  { top: 'cashmere ribbed turtleneck over thermal base', outer: 'ankle-length padded down coat with high collar', bottom: 'high-waisted wool flannel wide-leg trousers lined for warmth', shoes: 'insulated leather ankle boots with lug sole', acc: 'thick cashmere scarf, leather cashmere-lined gloves, knit beanie' },
  { top: 'chunky cable-knit crew sweater', outer: 'long double-face wool coat with fur-trimmed collar', bottom: 'heavy wool straight-leg trousers', shoes: 'shearling-lined leather boots', acc: 'oversized wool scarf, leather gloves, ear warmers' },
  { top: 'heavyweight merino half-zip over thermal', outer: 'hooded down-filled puffer coat reaching below knee', bottom: 'fleece-lined wool blend trousers', shoes: 'waterproof suede ankle boots', acc: 'cashmere neck warmer, tech-touch gloves, wool beret' },
  { top: 'cashmere zip-front hoodie over fitted thermal', outer: 'quilted long down coat with stand collar', bottom: 'heavy wool tapered trousers', shoes: 'insulated chelsea boots', acc: 'chunky knit scarf, shearling gloves, knit headband' },
  { top: 'shawl-collar lambswool cardigan over mock-neck top', outer: 'shearling-trimmed long wool coat', bottom: 'pressed heavy wool wide-leg trousers', shoes: 'insulated leather knee boots', acc: 'wool scarf, cashmere-lined gloves' },
  { top: 'heavyweight mock-neck cashmere sweater', outer: 'long padded parka with concealed hood', bottom: 'fleece-lined straight-leg trousers', shoes: 'waterproof leather ankle boots', acc: 'merino snood, insulated gloves, wool beanie' },
  { top: 'double-layer cashmere turtleneck', outer: 'wool duffle coat with toggle closures reaching below knee', bottom: 'heavy flannel wide-leg trousers', shoes: 'shearling-lined suede boots', acc: 'oversized cashmere wrap scarf, lined leather gloves' },
]

const femaleBitterColdKits: ColdKit[] = [
  { top: 'cashmere turtleneck with thick gauge', outer: 'tailored heavy wool coat with double-breasted closure reaching below knee', bottom: 'high-waisted pressed wool trousers with single pleat', shoes: 'insulated pointed-toe leather ankle boots', acc: 'wool-cashmere blend scarf, leather gloves, structured bag' },
  { top: 'chunky ribbed crewneck sweater', outer: 'long camel wool coat with belt', bottom: 'wide-leg wool flannel trousers', shoes: 'leather ankle boots with block heel', acc: 'cashmere scarf, suede gloves, gold studs' },
  { top: 'merino wool wrap cardigan over silk blouse', outer: 'quilted down jacket with tailored silhouette', bottom: 'straight-leg pressed wool trousers', shoes: 'insulated suede ankle boots', acc: 'lightweight scarf, leather gloves, pendant necklace' },
  { top: 'cashmere half-zip pullover over cotton tee', outer: 'double-breasted wool peacoat', bottom: 'high-waisted tapered wool trousers', shoes: 'leather chelsea boots', acc: 'knit scarf, cashmere gloves, minimal bracelet' },
  { top: 'fitted mock-neck merino sweater', outer: 'long herringbone or houndstooth wool coat', bottom: 'wide-leg wool blend trousers', shoes: 'polished leather knee-high boots', acc: 'silk-wool scarf, leather gloves, structured tote' },
  { top: 'shawl-collar cashmere cardigan over fitted tee', outer: 'padded down vest layered under wool overcoat', bottom: 'pressed wool straight-leg trousers', shoes: 'suede ankle boots', acc: 'cashmere scarf, lined gloves, delicate earrings' },
  { top: 'cashmere V-neck over silk high-neck blouse', outer: 'belted wool trench-style coat', bottom: 'tailored wool trousers with gentle drape', shoes: 'insulated leather boots', acc: 'wool scarf, leather gloves, crossbody bag' },
]

// ─── Dressy Prompt ────────────────────────────────────────────────
function getTodaysPickPrompt(weather: WeatherInfo, gender: string): string {
  const pIdx = getPaletteIndex()
  const mIdx = getMoodIndex()
  const kitIdx = getDayIndex() % 7   // 7 outfit kits, coprime with 21 palettes & 10 moods
  // Granular temperature ranges — 1°C and 9°C need very different outfits
  const isFreezing = weather.temp < 0
  const isBitterCold = weather.temp >= 0 && weather.temp < 5
  const isCold = weather.temp >= 5 && weather.temp < 10
  const isCool = weather.temp >= 10 && weather.temp < 20
  const isWarm = weather.temp >= 20 && weather.temp < 28
  const isHot = weather.temp >= 28
  const isRainy = ['Rain', 'Drizzle', 'Thunderstorm'].includes(weather.condition)
  const isSnowy = weather.condition === 'Snow'

  if (gender === 'female') {
    const p = femaleColorPalettes[pIdx % femaleColorPalettes.length]
    const m = femaleMoods[mIdx % femaleMoods.length]
    const arch = `STYLING: ${m.name} — ${m.guide}${SKIN_TONE_DIRECTIVE}`

    if (isSnowy || isFreezing) {
      const k = femaleFreezingKits[kitIdx]
      return `luxurious extreme winter outfit (${p.tone}): ${k.outer} in ${p.c1}, ${k.top} in ${p.c4}, ${k.bottom} in ${p.c3}, ${k.shoes}, ${p.accent} ${k.acc}. IMPORTANT: temperature is ${weather.temp}°C — full winter protection required. ${arch}`
    }
    if (isBitterCold) {
      const k = femaleBitterColdKits[kitIdx]
      return `warm elegant winter outfit (${p.tone}): ${k.outer} in ${p.c2}, ${k.top} in ${p.c1}, ${k.bottom} in ${p.c3}, ${k.shoes}, ${p.accent} ${k.acc}. IMPORTANT: temperature is ${weather.temp}°C — warm coat and scarf essential. ${arch}`
    }
    if (isRainy) return `polished rainy day outfit (${p.tone}): water-resistant gabardine trench coat in ${p.c3} with belt cinched, fine-gauge merino crewneck in ${p.c2}, cropped tailored trousers in dark ${p.c1}, polished waterproof chelsea boots, compact leather crossbody in ${p.accent}, minimal stud earrings. ${arch}`
    if (isCold) {
      const k = femaleColdKits[kitIdx]
      return `refined cold weather outfit (${p.tone}): ${k.outer} in ${p.c2}, ${k.top} in ${p.c1}, ${k.bottom} in ${p.c3}, ${k.shoes}, ${p.accent} ${k.acc}. ${arch}`
    }
    if (isCool) return `polished layered outfit (${p.tone}): unstructured soft blazer in ${p.c1} over fine-knit silk camisole in ${p.c4}, high-waisted tailored trousers in ${p.c3} with gentle drape, pointed ballet flats or suede loafers, ${p.accent} minimal bracelet, structured leather tote. ${arch}`
    if (isWarm) return `breezy elegant outfit (${p.tone}): fluid cotton-silk blouse in ${p.c4} with hidden placket, wide-leg linen trousers in ${p.c3} or draped midi skirt, leather espadrille wedges or elegant sandals, ${p.accent} delicate cuff bracelet, woven straw tote. ${arch}`
    if (isHot) return `cool summer outfit (${p.tone}): lightweight silk shirt dress in ${p.c2} with rolled sleeves and waist tie, flat leather sandals in natural tan, ${p.accent} minimalist pendant necklace, premium straw clutch, tortoiseshell sunglasses. ${arch}`
    return `versatile chic outfit (${p.tone}): fine-gauge cashmere crewneck in ${p.c1}, high-waisted ${p.c3} wide-leg trousers with knife pleat, pointed-toe flats in ${p.c4}, delicate ${p.accent} earrings, structured leather bag. ${arch}`
  }

  // Male
  const p = maleColorPalettes[pIdx % maleColorPalettes.length]
  const m = maleMoods[mIdx % maleMoods.length]
  const arch = `STYLING: ${m.name} — ${m.guide}${SKIN_TONE_DIRECTIVE}`

  if (isSnowy || isFreezing) {
    const k = maleFreezingKits[kitIdx]
    return `sharp extreme winter outfit (${p.tone}): ${k.outer} in ${p.c2}, ${k.top} in ${p.c3} over thermal base layer, ${k.bottom} in dark ${p.c1}, ${k.shoes}, ${p.accent} ${k.acc}. IMPORTANT: temperature is ${weather.temp}°C — full winter protection required. ${arch}`
  }
  if (isBitterCold) {
    const k = maleBitterColdKits[kitIdx]
    return `warm refined winter outfit (${p.tone}): ${k.outer} in ${p.c2}, ${k.top} in ${p.c3}, ${k.bottom} in ${p.c1}, ${k.shoes}, ${p.accent} ${k.acc}. IMPORTANT: temperature is ${weather.temp}°C — warm coat and scarf essential. ${arch}`
  }
  if (isRainy) return `sleek rainy day outfit (${p.tone}): water-resistant cotton gabardine mac coat in ${p.c1} with concealed placket, fine merino crewneck in ${p.c3}, straight-leg dark cotton drill chinos with clean hem, polished waterproof chelsea boots, minimal ${p.accent}-dial watch. ${arch}`
  if (isCold) {
    const k = maleColdKits[kitIdx]
    return `refined cold weather outfit (${p.tone}): ${k.outer} in ${p.c2}, ${k.top} in ${p.c3}, ${k.bottom} in ${p.c1}, ${k.shoes}, ${p.accent} ${k.acc}. ${arch}`
  }
  if (isCool) return `smart modern outfit (${p.tone}): cashmere-cotton crewneck sweater in ${p.c3} layered over oxford shirt with collar visible, straight-leg cotton chinos in ${p.c1} with single pleat, clean suede loafers or polished leather sneakers, ${p.accent} woven leather belt, brushed metal watch. ${arch}`
  if (isWarm) return `refined warm weather outfit (${p.tone}): garment-washed linen spread-collar shirt in ${p.c3} with sleeves rolled to forearm, relaxed cotton-linen trousers in ${p.c4} with drawstring waist, woven leather espadrilles or canvas slip-ons, minimal ${p.accent} watch, tortoiseshell sunglasses. ${arch}`
  if (isHot) return `sharp summer outfit (${p.tone}): lightweight camp-collar linen shirt in ${p.c3} with textured weave, relaxed-fit Bermuda shorts in ${p.c4} or light cotton chinos, premium leather sandals or clean canvas sneakers, ${p.accent} acetate sunglasses. ${arch}`
  return `clean modern outfit (${p.tone}): fine-gauge cashmere crewneck in ${p.c3}, straight-leg cotton chinos in ${p.c1} with natural drape, premium leather belt with brushed buckle, clean white leather sneakers or tan suede derbies, ${p.accent} accent details. ${arch}`
}

// ─── Casual Prompt ────────────────────────────────────────────────
// 10 casual moods with mood-specific bottoms for real outfit variety
const maleCasualMoods = [
  // Everyday accessible — genuinely casual, not luxury-coded
  { name: 'clean minimal', guide: 'Simple well-cut basics. Relaxed cotton tee or clean sweatshirt. White sneakers, simple tote. No logos, no fuss.', bottom: 'relaxed chinos', warmBottom: 'cotton shorts' },
  { name: 'relaxed fit', guide: 'Relaxed silhouette. Oversized cotton shirt or band-collar pullover. Simple sneakers or sandals. Unhurried, effortless.', bottom: 'wide straight-leg cotton trousers', warmBottom: 'wide linen shorts' },
  { name: 'soft texture', guide: 'Comfort-first. Garment-washed cotton or brushed jersey in muted tones. Dropped shoulders, relaxed body. Canvas shoes or simple sneakers.', bottom: 'tapered cotton pants', warmBottom: 'relaxed linen shorts' },
  { name: 'sweat setup', guide: 'Clean coordinated sweatshirt-and-jogger set in cotton fleece. Relaxed but not sloppy — fitted enough through the body. Clean sneakers. Simple cap or watch.', bottom: 'matching jogger pants', warmBottom: 'matching jersey shorts' },
  { name: 'French casual', guide: 'French casual ease. Plain crew-neck tee or breton stripe. Cotton jacket or harrington if cool. Clean white sneakers. Minimal, timeless.', bottom: 'straight-leg dark jeans', warmBottom: 'light cotton chinos with rolled hem' },
  { name: 'Nordic practical', guide: 'Functional minimalism. Midweight cotton sweatshirt or zip-up fleece. Simple sneakers, crossbody bag. Clean, practical.', bottom: 'tapered utility trousers', warmBottom: 'nylon-cotton shorts' },
  { name: 'outdoor-city', guide: 'City-meets-outdoor utility. Cotton overshirt or light shell jacket. Trail sneakers or simple boots. Functional but clean.', bottom: 'relaxed cargo pants', warmBottom: 'light climbing shorts' },
  // Slightly elevated everyday
  { name: 'easy smart', guide: 'Clean and put-together without trying hard. Crewneck knit or zip hoodie. Clean sneakers. Soft and comfortable, not overdressed.', bottom: 'cotton jogger pants', warmBottom: 'cotton drawstring shorts' },
  { name: 'weekend ease', guide: 'Weekend off-duty. Cotton polo or crewneck sweater. Simple loafers or clean sneakers. Comfortable, not trying too hard.', bottom: 'soft cotton chinos', warmBottom: 'linen drawstring trousers' },
  { name: 'warm layers', guide: 'Warm relaxed layering. Knit sweater over simple tee. Desert boots or clean sneakers. Comfortable, approachable.', bottom: 'relaxed straight-leg cotton pants', warmBottom: 'light cotton trousers' },
]

const femaleCasualMoods = [
  // Everyday accessible — genuinely casual, not luxury-coded
  { name: 'modern minimal', guide: 'Clean everyday simplicity. Oversized cotton shirt or structured tee. White sneakers or simple flats. Canvas tote. No accessories needed.', bottom: 'wide cotton trousers', warmBottom: 'cotton midi skirt' },
  { name: 'soft drape', guide: 'Soft oversized knits or washed cotton, gentle drape. One fitted piece for balance. Simple flats or clean sneakers. Muted natural palette. Cozy and understated.', bottom: 'relaxed cotton trousers', warmBottom: 'light linen wide-leg pants' },
  { name: 'neat everyday', guide: 'Neat everyday look. Cotton knit or simple blouse. Clean sneakers or simple flats. Simple studs, crossbody bag.', bottom: 'relaxed cotton trousers', warmBottom: 'cotton bermuda shorts' },
  { name: 'athleisure', guide: 'Coordinated sweatshirt-and-jogger set or hoodie with fitted joggers. Cotton fleece, clean lines. White sneakers or simple slides. Minimal jewelry.', bottom: 'matching jogger pants', warmBottom: 'matching cotton shorts' },
  { name: 'Scandinavian clean', guide: 'Clean Nordic lines. Fitted ribbed knit or simple turtleneck. Ankle boots or clean sneakers. Simple jewelry, structured bag.', bottom: 'straight-leg dark jeans', warmBottom: 'cotton tailored shorts' },
  { name: 'French off-duty', guide: 'Parisian everyday. Breton stripe or plain cotton tee. Ballet flats or white sneakers. Simple crossbody, no fuss. Effortlessly chic.', bottom: 'straight-leg cotton pants', warmBottom: 'cotton skirt' },
  { name: 'understated craft', guide: 'Understated craft. Cotton oxford shirt or simple knit. Simple brogues or trainers. Natural fabrics, muted tones.', bottom: 'relaxed chinos', warmBottom: 'cotton canvas trousers' },
  // Slightly elevated everyday
  { name: 'cozy weekend', guide: 'Cozy weekend ease. Soft cardigan or knit polo. Simple loafers, delicate jewelry. Comfortable and put-together.', bottom: 'cotton wide trousers', warmBottom: 'linen wide-leg pants' },
  { name: 'warm layers', guide: 'Warm layered comfort. Soft knit over fitted tee. Ankle boots or clean sneakers. Earth tones, approachable.', bottom: 'soft joggers or relaxed trousers', warmBottom: 'light cotton wide-leg pants' },
  { name: 'easy comfort', guide: 'Easy modern comfort. Cotton hoodie or zip knit. Clean sneakers, simple bracelet. Relaxed and comfortable.', bottom: 'wide-leg jogger trousers', warmBottom: 'jersey shorts or cotton skirt' },
]

// ─── Casual Cold-Weather Outerwear Pools (rotate daily for variety) ──
const maleCasualOuter = [
  'padded down parka', 'quilted puffer jacket', 'fleece-lined hooded anorak',
  'down bomber jacket', 'insulated mountain parka', 'long puffer coat', 'padded coat',
]
const maleCasualColdOuter = [
  'quilted lightweight jacket', 'fleece-lined zip-up hoodie jacket', 'padded field jacket',
  'cotton parka', 'fleece-lined denim jacket', 'quilted bomber', 'cotton canvas chore jacket',
]
const femaleCasualOuter = [
  'long padded down coat', 'hooded puffer jacket', 'fleece-lined down parka',
  'oversized puffer coat', 'fleece-lined hooded coat', 'insulated anorak', 'padded cocoon coat',
]
const femaleCasualColdOuter = [
  'quilted lightweight jacket', 'fleece-lined zip-up hoodie jacket', 'padded vest over hoodie',
  'cotton field jacket', 'fleece-lined parka', 'oversized shirt-jacket', 'quilted collarless jacket',
]
const casualColdTops = [
  'chunky knit sweater', 'heavyweight hoodie', 'fleece half-zip pullover',
  'crew sweatshirt', 'sherpa-lined sweatshirt', 'waffle-knit henley', 'cotton crewneck sweater',
]

function getCasualPrompt(gender: string, temp: number): string {
  const pIdx = (getPaletteIndex() + 7) % 21
  const mIdx = (getMoodIndex() + 5) % 10
  const kitIdx = getDayIndex() % 7
  const topIdx = (getDayIndex() + 3) % casualColdTops.length  // offset for variety
  const isFreezing = temp < 0
  const isBitterCold = temp >= 0 && temp < 5
  const isCold = temp >= 5 && temp < 10
  const isWarm = temp >= 22

  if (gender === 'female') {
    const p = femaleColorPalettes[pIdx % femaleColorPalettes.length]
    const m = femaleCasualMoods[mIdx % femaleCasualMoods.length]
    const arch = `STYLING: ${m.name} — ${m.guide}${SKIN_TONE_DIRECTIVE}`

    if (isWarm) return `relaxed casual outfit (${p.tone}): oversized cotton tee in ${p.c4}, ${m.warmBottom} in ${p.c3}, clean sneakers or simple sandals, ${p.accent} minimal accessory. ${arch}`
    if (isFreezing) return `warm cozy winter casual outfit (${p.tone}): ${femaleCasualOuter[kitIdx]} in ${p.c1} over ${casualColdTops[topIdx]} in ${p.c3} and thermal base layer, ${m.bottom} in ${p.c1} (fleece-lined or heavy weight), insulated boots or warm lined sneakers, thick ${p.accent} knit scarf, warm gloves, knit beanie. IMPORTANT: temperature is ${temp}°C — heavy winter outerwear mandatory. ${arch}`
    if (isBitterCold) return `warm casual layered outfit (${p.tone}): ${femaleCasualOuter[(kitIdx + 2) % femaleCasualOuter.length]} in ${p.c1} over ${casualColdTops[topIdx]} in ${p.c3}, ${m.bottom} in ${p.c1}, warm ankle boots or fleece-lined sneakers, ${p.accent} wool scarf, gloves. IMPORTANT: temperature is ${temp}°C — proper coat and warm layers essential. ${arch}`
    if (isCold) return `cozy casual outfit (${p.tone}): ${femaleCasualColdOuter[kitIdx]} in ${p.c1} over ${casualColdTops[(topIdx + 1) % casualColdTops.length]} in ${p.c3}, ${m.bottom} in ${p.c3}, ankle boots or clean sneakers, ${p.accent} simple accessory. ${arch}`
    return `easy chic casual outfit (${p.tone}): soft cardigan in ${p.c1} over fitted tee, ${m.bottom} in ${p.c3}, clean sneakers or simple loafers, delicate ${p.accent} pendant. ${arch}`
  }

  const p = maleColorPalettes[pIdx % maleColorPalettes.length]
  const m = maleCasualMoods[mIdx % maleCasualMoods.length]
  const arch = `STYLING: ${m.name} — ${m.guide}${SKIN_TONE_DIRECTIVE}`

  if (isWarm) return `relaxed casual outfit (${p.tone}): cotton crewneck tee in ${p.c3}, ${m.warmBottom} in ${p.c4}, clean sneakers or leather slides, simple ${p.accent} watch. ${arch}`
  if (isFreezing) return `warm cozy winter casual outfit (${p.tone}): ${maleCasualOuter[kitIdx]} in ${p.c1} over ${casualColdTops[topIdx]} in ${p.c3} and thermal base layer, ${m.bottom} in ${p.c1} (fleece-lined or heavy weight), insulated boots or warm lined sneakers, thick ${p.accent} knit scarf, warm gloves, knit beanie. IMPORTANT: temperature is ${temp}°C — heavy winter outerwear mandatory. ${arch}`
  if (isBitterCold) return `warm casual layered outfit (${p.tone}): ${maleCasualOuter[(kitIdx + 2) % maleCasualOuter.length]} in ${p.c1} over ${casualColdTops[topIdx]} in ${p.c3}, ${m.bottom} in ${p.c1}, warm boots or lined sneakers, ${p.accent} wool scarf, gloves. IMPORTANT: temperature is ${temp}°C — proper coat and warm layers essential. ${arch}`
  if (isCold) return `cozy casual outfit (${p.tone}): ${maleCasualColdOuter[kitIdx]} in ${p.c1} over ${casualColdTops[(topIdx + 1) % casualColdTops.length]} in ${p.c3}, ${m.bottom} in ${p.c1}, warm sneakers or simple boots, ${p.accent} simple accessory. ${arch}`
  return `clean everyday casual outfit (${p.tone}): ${p.c3} cotton sweatshirt or crewneck knit, ${m.bottom} in ${p.c1}, clean sneakers, simple ${p.accent} watch. ${arch}`
}

// ─── Expert Stylist ANALYZE Directive ────────────────────────────
// Wraps weather-based outfit prompts with body analysis directives
// for dramatically better personalization (matching generate-styles quality)
function wrapWithExpertDirective(basePrompt: string, gender: string, scenarioType: 'dressy' | 'casual'): string {
  const analyzeBlock = gender === 'female'
    ? `FIRST, ANALYZE this woman's body type, skin tone, face shape, and proportions from the photo.
Then ADAPT the outfit below to be MOST FLATTERING for HER specific body:
- Long legs → show with the right hemline and silhouette
- Defined waist → emphasize with belts, fitted mid-sections, or wrap elements
- Broad shoulders → balance with V-necklines, A-line shapes, or wide-leg bottoms
- Petite frame → elongate with high waist, monochromatic palette, pointed-toe shoes
- Curvy figure → highlight with X-silhouette, defined waist, vertical lines
STRONGLY prefer dresses, skirts, and feminine silhouettes when possible.
Emphasize waist definition, flowing fabrics, elegant draping.`
    : `FIRST, ANALYZE this man's body type, skin tone, face shape, and proportions from the photo.
Then ADAPT the outfit below to be MOST FLATTERING for HIS specific body:
- Broad shoulders → lean into structured pieces, clean lines
- Slim build → add visual presence with layered textures, structured shoulders
- Athletic build → showcase with fitted knits, well-proportioned trousers
- Fuller build → elongate with vertical lines, V-necks, dark monochromatic tones
Relaxed comfortable silhouette — NOT tight, NOT skinny fit.
Trousers with straight-leg or slightly wide drape, soft natural shoulders.`

  const emotionBlock = scenarioType === 'dressy'
    ? 'This should be their BEST polished look — think editorial magazine cover.'
    : 'This should feel comfortable and natural — a good everyday outfit, not overdressed.'

  return `${analyzeBlock}

OUTFIT DIRECTION (adapt colors/fabrics to this person's skin undertone):
${basePrompt}

${emotionBlock}
STYLING VARIETY: A great stylist never recommends the same look twice. Vary the bottoms — sometimes dark navy trousers, sometimes medium-wash denim jeans, sometimes charcoal wool pants, sometimes olive chinos, sometimes black slim trousers. Match the bottom style to the overall mood. Denim is perfectly appropriate for smart casual and casual looks. Avoid repeating the same brown/tan/khaki bottoms — explore the full spectrum.
The specified colors are SUGGESTIONS — shift warmer or cooler to match this person's undertone.
WARM skin (golden, peachy) → terracotta, camel, olive, cream work best.
COOL skin (pink, rosy) → navy, lavender, emerald, pearl white work best.`
}

export function getDailyScenarios(weather: WeatherInfo, gender: string): ImageScenario[] {
  return [
    { id: 'dressy', prompt: wrapWithExpertDirective(getTodaysPickPrompt(weather, gender), gender, 'dressy') },
    { id: 'casual', prompt: wrapWithExpertDirective(getCasualPrompt(gender, weather.temp), gender, 'casual') },
  ]
}

/** Label translations for daily scenarios */
export const dailyScenarioLabels: Record<string, Record<string, string>> = {
  'dressy': { ko: '격식 스타일', en: 'Dressy', ja: 'ドレッシー', zh: '正式穿搭', es: 'Elegante' },
  'casual': { ko: '캐주얼', en: 'Casual', ja: 'カジュアル', zh: '休闲', es: 'Casual' },
}
