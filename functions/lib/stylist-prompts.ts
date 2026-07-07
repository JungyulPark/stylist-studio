/**
 * Expert Stylist Prompt System
 *
 * Directive-based prompts that let the AI analyze each person's unique features
 * (body type, skin tone, proportions) and design the optimal outfit,
 * instead of hardcoding specific garments for everyone.
 *
 * Used by: generate-styles.ts (6 scenarios)
 */

// ─── Types ───────────────────────────────────────────────────────

export interface ScenarioConfig {
  id: string
  labelKo: string
  labelEn: string
  labelJa: string
  labelZh: string
  labelEs: string
  directiveMale: string
  directiveFemale: string
}

// ─── Shared Prompt Constants ─────────────────────────────────────

const INPAINTING_RULES = `INPAINTING RULES - THIS IS AN INPAINTING TASK:
1. ONLY replace the clothing/fabric within the MAIN PERSON's body silhouette
2. DO NOT generate a new person or body - use the EXACT existing body outline
3. The new clothes must fit WITHIN the original body boundaries
4. Body parts (arms, legs, torso) stay in EXACT same position
5. Clothing layers: body underneath, clothes on top - NEVER overlap incorrectly
6. DO NOT extend the image or add new body parts that weren't visible`

const BODY_PRESERVATION = `BODY PROPORTION PRESERVATION (CRITICAL):
- The person's BODY PROPORTIONS must stay EXACTLY the same as the original photo
- LEG LENGTH must be IDENTICAL to the original — do NOT shorten or compress legs
- TORSO-to-LEG ratio must match the original exactly
- Waistline position must stay at the SAME height as in the original photo`

const ABSOLUTE_REQUIREMENTS = `ABSOLUTE REQUIREMENTS - VIOLATION IS FAILURE:
1. FACE IDENTITY: The face must be an EXACT COPY of the input — same person, same features, same expression. If the output face looks like a DIFFERENT PERSON, the result is FAILED. The person MUST be clearly recognizable as the same individual.
2. NEVER CROP OR ZOOM - output must have PIXEL-PERFECT IDENTICAL framing, zoom, and composition as input. The HEAD must be fully visible with SAME space above it.
3. NEVER change aspect ratio or dimensions - output MUST match input exactly
4. Hairstyle, hair color, skin tone base - ZERO changes allowed
5. Keep EXACTLY what is visible in the original - do not extend or add content
6. OTHER PEOPLE in the photo - ZERO changes allowed (background lighting may be subtly enhanced)
7. Output resolution MUST match input resolution exactly
8. Legs must be BEHIND/INSIDE pants or skirt - NEVER on top of clothing
9. Arms must be THROUGH sleeves - NEVER floating above clothes
10. Body proportions (especially leg length) - ZERO distortion allowed`

const BACKGROUND_ENHANCEMENT = `BACKGROUND ENHANCEMENT:
- If the background is dark, dingy, cluttered, or unflattering, SUBTLY brighten and clean it up
- Increase brightness and warmth slightly to create a more editorial, lifestyle-magazine feel
- Keep the background structure the same (same location/setting) — just improve lighting and tone
- Think "professional photo lighting" — soft, even, flattering ambient light
- Do NOT replace the background entirely — only enhance what is already there
- The person themselves must remain IDENTICAL — only the surrounding environment gets improved`

const FOCUS_RULES = `FOCUS ON MAIN SUBJECT ONLY:
- Only edit the MAIN person in the center/foreground of the photo
- If there are OTHER PEOPLE in the background, LEAVE THEM COMPLETELY UNCHANGED
- Do NOT modify, remove, or add any other people`

// ─── Color Palettes (21 runway-curated, c1-c4 structure) ─────────

const maleColorPalettes = [
  { tone: 'midnight plum', c1: 'dark plum', c2: 'charcoal', c3: 'silver grey', c4: 'deep navy', accent: 'amethyst' },
  { tone: 'royal matte', c1: 'royal blue', c2: 'ink black', c3: 'oatmeal', c4: 'slate', accent: 'mint green' },
  { tone: 'anglomania', c1: 'tweedy brown', c2: 'herringbone grey', c3: 'cream', c4: 'dark olive', accent: 'burgundy' },
  { tone: 'porcelain sand', c1: 'charcoal olive', c2: 'warm sand', c3: 'porcelain white', c4: 'stone mist', accent: 'copper' },
  { tone: 'glacier mist', c1: 'ice blue', c2: 'pearl grey', c3: 'winter white', c4: 'deep slate', accent: 'brushed gold' },
  { tone: 'alpine grey', c1: 'pewter grey', c2: 'cloud white', c3: 'pale stone', c4: 'soft charcoal', accent: 'forest green' },
  { tone: 'midnight nav', c1: 'midnight navy', c2: 'chalk white', c3: 'dove grey', c4: 'warm sand', accent: 'old gold' },
  { tone: 'matte wool', c1: 'dark olive', c2: 'tobacco brown', c3: 'ecru', c4: 'moss green', accent: 'brick red' },
  { tone: 'emerald shadow', c1: 'deep emerald', c2: 'charcoal', c3: 'ivory', c4: 'dark teal', accent: 'copper' },
  { tone: 'chrome green', c1: 'chrome green', c2: 'pebble grey', c3: 'bone white', c4: 'dark bronze', accent: 'vanilla' },
  { tone: 'graphite modern', c1: 'graphite black', c2: 'silver grey', c3: 'ivory', c4: 'deep indigo', accent: 'electric blue' },
  { tone: 'ocean air', c1: 'faded ocean blue', c2: 'driftwood', c3: 'off-white linen', c4: 'washed sage', accent: 'sunset coral' },
  { tone: 'birch white', c1: 'birch white', c2: 'pale grey', c3: 'cream wool', c4: 'pine green', accent: 'copper' },
  { tone: 'tuscan sun', c1: 'sun-bleached terracotta', c2: 'olive', c3: 'warm cream', c4: 'dried lavender', accent: 'aged gold' },
  { tone: 'ink mono', c1: 'jet black', c2: 'medium charcoal', c3: 'heather grey', c4: 'off-white', accent: 'matte silver' },
  { tone: 'smoke charcoal', c1: 'dark charcoal', c2: 'medium grey', c3: 'off-white', c4: 'slate blue', accent: 'brushed silver' },
  { tone: 'maritime', c1: 'dark navy', c2: 'rope beige', c3: 'crisp white', c4: 'faded indigo', accent: 'red' },
  { tone: 'deep burgundy', c1: 'dark burgundy', c2: 'ink black', c3: 'cream', c4: 'deep charcoal', accent: 'old gold' },
  { tone: 'studio cool', c1: 'cool grey', c2: 'stone blue', c3: 'parchment', c4: 'dark slate', accent: 'bronze' },
  { tone: 'worn indigo', c1: 'faded indigo', c2: 'washed navy', c3: 'raw ecru', c4: 'dark denim', accent: 'antique brass' },
  { tone: 'steel blue', c1: 'steel blue', c2: 'slate', c3: 'ice white', c4: 'deep navy', accent: 'teal' },
]

const femaleColorPalettes = [
  { tone: 'noir leather', c1: 'ink black', c2: 'deep charcoal', c3: 'warm ivory', c4: 'cognac brown', accent: 'gold' },
  { tone: 'midnight silk', c1: 'midnight navy', c2: 'silver', c3: 'pearl white', c4: 'deep charcoal', accent: 'gold chain' },
  { tone: 'cashmere blush', c1: 'dusty rose', c2: 'baby cashmere beige', c3: 'pearl white', c4: 'muted lavender', accent: 'rose gold' },
  { tone: 'silk plush', c1: 'champagne silk', c2: 'soft camel', c3: 'powder pink', c4: 'warm grey', accent: 'antique gold' },
  { tone: 'jewel depth', c1: 'emerald', c2: 'deep burgundy', c3: 'ivory', c4: 'midnight blue', accent: 'bronze' },
  { tone: 'garden fresh', c1: 'sage green', c2: 'petal pink', c3: 'cream', c4: 'soft fern', accent: 'coral' },
  { tone: 'parisian', c1: 'navy', c2: 'red', c3: 'cream', c4: 'black', accent: 'gold' },
  { tone: 'mint pop', c1: 'mint green', c2: 'ecru', c3: 'light grey', c4: 'royal blue accent', accent: 'silver' },
  { tone: 'mauve romantic', c1: 'mauve', c2: 'soft peach', c3: 'ivory', c4: 'blush', accent: 'pearl' },
  { tone: 'frost nordic', c1: 'ice white', c2: 'pale blue', c3: 'silver birch', c4: 'frost grey', accent: 'rose gold' },
  { tone: 'lavender dusk', c1: 'deep lavender', c2: 'charcoal', c3: 'soft white', c4: 'steel grey', accent: 'rose gold' },
  { tone: 'berry rich', c1: 'raspberry', c2: 'plum', c3: 'cream', c4: 'deep wine', accent: 'gold' },
  { tone: 'coastal', c1: 'sand', c2: 'ocean blue', c3: 'white', c4: 'driftwood grey', accent: 'turquoise' },
  { tone: 'sunset glow', c1: 'burnt orange', c2: 'dusty pink', c3: 'warm cream', c4: 'peach', accent: 'bronze' },
  { tone: 'ethereal', c1: 'lilac', c2: 'powder blue', c3: 'cloud white', c4: 'pale mint', accent: 'silver' },
  { tone: 'autumn leaf', c1: 'deep rust', c2: 'mustard', c3: 'cream', c4: 'burgundy', accent: 'antique gold' },
  { tone: 'quiet greige', c1: 'greige', c2: 'soft white', c3: 'pale camel', c4: 'dove grey', accent: 'matte gold' },
  { tone: 'orchid mist', c1: 'soft orchid', c2: 'pale grey', c3: 'ivory', c4: 'dusty lavender', accent: 'rose gold' },
  { tone: 'botanical', c1: 'forest green', c2: 'cream', c3: 'terracotta', c4: 'sage', accent: 'dried rose' },
  { tone: 'vintage blue', c1: 'dusty blue', c2: 'antique rose', c3: 'ivory', c4: 'faded gold', accent: 'copper' },
  { tone: 'modern mono', c1: 'black', c2: 'white', c3: 'camel', c4: 'red', accent: 'gold' },
]

// ─── 6 Scenario Directives ──────────────────────────────────────

export function getScenarios(): ScenarioConfig[] {
  return [
    {
      id: 'best-match',
      labelKo: '베스트 매치', labelEn: 'Best Match', labelJa: 'ベストマッチ', labelZh: '最佳搭配', labelEs: 'Mejor Combinación',
      directiveMale: `Create this man's SIGNATURE LOOK — his single best outfit.

STYLING: Auralee minimal — Fabric takes the lead — boiled wool, garment-washed cotton poplin, baby cashmere. Dropped-shoulder seams, relaxed body with clean hems. Matte textures. Proprietary suede shoes or simple leather sneakers.

FIRST, ANALYZE his body type, skin tone, face shape, and proportions from the photo.
Then choose the SINGLE most flattering combination from these options, and ADAPT it to his specific body:
- Fine-gauge merino crewneck in tonal shade + straight-leg pressed wool trousers with natural drape + polished leather derby shoes + brushed metal watch (Auralee minimal)
- Unstructured cotton-linen blazer (soft shoulder, no padding) + garment-washed band-collar shirt + relaxed chinos with single pleat + clean suede loafers (Lemaire ease)
- Cashmere-cotton crewneck layered over oxford shirt (collar visible) + tapered wool-blend trousers + premium leather sneakers + woven leather belt (Cucinelli smart-casual)
- Mock-neck fine-gauge knit + straight-leg dark denim with clean hem + suede desert boots + minimal watch (Massimo Dutti refined)

The fabric should have visible WEIGHT and TEXTURE — not flat, not cheap-looking.
Think the best-dressed man at a gallery opening — quiet confidence, zero effort.`,

      directiveFemale: `Create this woman's SIGNATURE LOOK — her single most head-turning outfit.

STYLING: 2026 It-Girl meets quiet luxury. Clean lines, intentional proportions, one unexpected detail. Think Hailey Bieber meets old Celine — polished but never boring.

FIRST, ANALYZE her body type, skin tone, face shape, and proportions from the photo.
Then choose the SINGLE most flattering combination and ADAPT it to her specific body:
- Oversized structured blazer (slightly oversized, padded shoulders) + fitted ribbed tank + straight-leg tailored trousers + pointed-toe slingback heels + chunky gold hoops (Frankie Shop power)
- Cashmere-blend knit polo + high-waisted pleated wide-leg trousers + leather loafers + delicate layered gold chains (Toteme effortless)
- Butter-soft leather jacket + silk camisole + dark straight-leg jeans + pointed-toe ankle boots + minimal gold pendant (cool girl edge)
- Fitted mock-neck knit + draped midi skirt with slit + strappy heeled mules + statement earrings (modern feminine)

Mix trousers and skirts — wide-leg trousers are equally feminine and trendy in 2026.
The outfit should make her look like the most stylish person in any room — fashion-forward but wearable.`,
    },
    {
      id: 'date',
      labelKo: '데이트룩', labelEn: 'Date Night', labelJa: 'デートルック', labelZh: '约会装', labelEs: 'Cita',
      directiveMale: `Create a RELAXED, MAGNETIC date night look. NOT a suit — think Saturday night at a candlelit wine bar. Effortless cool.

STYLING: Weekend evening — Relaxed textures, open collar, leather and denim. Every piece touchable, nothing stiff. Butter-soft leather jacket or garment-washed overshirt. Dark denim or relaxed chinos. Clean sneakers or suede boots. The confidence comes from not trying.

FIRST, ANALYZE his features, build, and skin tone from the photo.
Then choose the SINGLE most attractive combination from these options, and ADAPT it to his specific body:
- Butter-soft leather jacket (moto or café racer) + fitted crew-neck tee in dark tone + slim dark jeans with clean hem + clean white leather sneakers or suede chelsea boots (cool confident)
- Relaxed knit polo in rich tone + straight-leg dark chinos + premium suede loafers (no socks) + simple leather strap watch (Italian ease)
- Garment-washed cotton overshirt (unbuttoned) + fitted mock-neck knit + dark straight-leg trousers + polished leather boots (layered texture)
- Open-collar linen-cotton shirt (top 2 buttons undone) + well-fitted dark jeans + clean suede desert boots + rolled sleeves showing forearms (casual magnetism)

KEY DIFFERENCE FROM LUXURY: Date Night is RELAXED — no blazers, no formal trousers, no dress shoes.
The vibe is "he didn't try but he looks incredible." Leather, denim, open collar, rolled sleeves.
Think Ryan Gosling off-duty — confident without being overdressed.`,

      directiveFemale: `Create a STUNNING date night look — the outfit that makes everyone in the restaurant look twice.

STYLING: 2026 evening chic — sensual but sophisticated. Think Zendaya at a dinner party. Luxe fabrics, strategic skin-showing, effortless confidence.

FIRST, ANALYZE her body, features, and skin tone from the photo.
Then choose the SINGLE most stunning combination and ADAPT it to her specific body:
- Silk satin slip dress (midi length, subtle cowl neck) + strappy heeled sandals + delicate gold layered necklaces + small structured clutch (understated sexy)
- Off-shoulder fitted knit top + high-waisted satin wide-leg trousers + pointed-toe mules + statement gold earrings (modern allure)
- Body-skimming ribbed midi dress with side slit + leather ankle boots + chunky gold bracelet + mini bag (effortless hot)
- Sheer-panel blouse (subtle, not revealing) + tailored cigarette trousers + strappy heels + delicate pendant (date confidence)

The vibe is "she didn't try too hard but she's the most beautiful person here."
Skin-showing details: V-neck, off-shoulder, or subtle slit — but never vulgar.`,
    },
    {
      id: 'daily',
      labelKo: '데일리', labelEn: 'Daily', labelJa: 'デイリー', labelZh: '日常', labelEs: 'Diario',
      directiveMale: `Create a POLISHED everyday outfit — the best-dressed regular person in any room.

STYLING: Cucinelli ease — Warm layered look — fine-gauge knit over spread-collar shirt, collar and cuffs visible. Cashmere-blend sweater or gilet. Straight-leg trousers with single pleat. Suede loafers, no socks. Minimal leather watch. The warmth of quality materials radiates.

FIRST, ANALYZE his proportions, skin tone, and build from the photo.
Then choose the SINGLE most flattering combination from these options, and ADAPT it to his specific body:
- Fine-gauge merino crewneck over crisp oxford shirt (collar and cuffs visible) + straight-leg pressed chinos + polished leather sneakers + woven leather belt (elevated smart-casual)
- Clean cotton polo in rich tone + tapered wool-blend trousers + suede loafers + minimal watch (Italian everyday)
- Lightweight cashmere crewneck + straight-leg dark denim with clean hem + clean white sneakers + simple leather strap watch (quiet refinement)
- Band-collar cotton-linen shirt + relaxed cotton trousers + leather desert boots + brushed metal watch (modern ease)

The fit must be PERFECT — not too tight (uncomfortable), not too loose (sloppy). Natural body skimming with room to move.
Every piece should look one tier above what's expected. The KIND of crewneck that makes people ask "where is that from?"
Think the man who makes basics look expensive — quiet quality in every detail.`,

      directiveFemale: `Create the PERFECT everyday outfit — the kind strangers compliment on the street.

STYLING: 2026 elevated basics — clean, modern, Instagram-worthy. Think the girl every fashion blog photographs. Quality basics styled perfectly — nothing forced, everything intentional.

FIRST, ANALYZE her body type, skin tone, and proportions from the photo.
Then choose the SINGLE most flattering combination and ADAPT it to her specific body:
- Oversized cashmere cardigan (dropped shoulder) + fitted ribbed tank + straight-leg jeans + clean white sneakers + simple gold hoops (Parisian off-duty)
- Cropped boxy blazer + high-waisted wide-leg linen trousers + leather slide sandals + delicate pendant + canvas tote (modern minimal)
- Fitted ribbed knit top + high-waisted pleated midi skirt + suede loafers + layered gold necklaces (feminine chic)
- Premium cotton crew sweatshirt + tailored wide-leg chinos + clean leather sneakers + simple studs + crossbody bag (cool casual)

Mix trousers, jeans, and skirts — the outfit should look effortless but considered.
Think the girl who makes basics look expensive — "where did you get that?"`,
    },
  ]
}

// ─── Color Inspiration ──────────────────────────────────────────

export function getColorInspiration(gender: string, seed: number): string {
  const palettes = gender === 'female' ? femaleColorPalettes : maleColorPalettes
  const p = palettes[seed % palettes.length]
  return `Color palette (${p.tone}): Primary ${p.c1}, Secondary ${p.c2}, Light ${p.c3}, Accent base ${p.c4}, Pop accent ${p.accent}.
These are SUGGESTIONS — diagnose this person's seasonal color type and adapt:
SPRING WARM (golden/peachy glow) → shift toward coral, warm peach, cream, light camel.
SUMMER COOL (pink/delicate) → shift toward lavender, dusty rose, powder blue, mauve.
AUTUMN WARM (deep golden/olive) → shift toward terracotta, olive, mustard, burgundy.
WINTER COOL (high contrast, clear) → shift toward cobalt, emerald, true red, black/white.
Adapt to this person's skin undertone — shift warm if golden/peachy skin, shift cool if pink/rosy skin.`
}

// ─── Silhouette Guide (BMI-based) ───────────────────────────────

export function getSilhouetteGuide(gender: string, height?: string, weight?: string): string {
  const h = parseInt(height || '0')
  const w = parseInt(weight || '0')
  if (!h || !w) return ''

  const bmi = w / ((h / 100) ** 2)

  if (gender === 'female') {
    if (bmi < 18.5) return '\nSILHOUETTE: Slim build — add visual volume with layered textures, structured shoulders, A-line shapes. Warm rich colors add presence. Belted waist creates curves.'
    if (bmi < 23) return '\nSILHOUETTE: Balanced build — most silhouettes work beautifully. Highlight waist with belts or fitted mid-sections. High waist elongates legs. Both fitted and relaxed proportions suit well.'
    if (bmi < 27) return '\nSILHOUETTE: Curvy build — X-silhouette with defined waist is most flattering. Show slim areas (wrists, ankles, collarbone). Vertical monochromatic flow streamlines. Wrap dresses and V-necks are powerful.'
    return '\nSILHOUETTE: Fuller build — vertical lines and monochromatic tones for streamlined elegance. Show slim wrists, ankles, collarbone. X-silhouette with defined waist. Structured fabrics that hold shape, not cling.'
  }

  if (bmi < 18.5) return '\nSILHOUETTE: Slim build — add structure with layered pieces, textured fabrics, structured shoulders. Relaxed fits with quality drape add visual presence without bulk.'
  if (bmi < 24) return '\nSILHOUETTE: Balanced build — clean proportions with well-fitted pieces. Both relaxed and tailored work well. Straight-leg or slightly wide trousers with natural drape.'
  if (bmi < 28) return '\nSILHOUETTE: Athletic/stocky build — vertical lines, monochromatic color flow, V-shaped layering draws eyes upward. Relaxed straight-leg trousers, not tight or skinny.'
  return '\nSILHOUETTE: Fuller build — dark vertical flow and structured fabrics for streamlined silhouette. V-neck and open collars elongate. Relaxed straight-leg trousers, never tight. Show structure through shoulders.'
}

// ─── Beauty Retouch ─────────────────────────────────────────────

function getBeautyRetouch(gender: string): string {
  if (gender === 'female') {
    return `BEAUTY ENHANCEMENT — make this person look their BEST:
- Smooth skin naturally (reduce wrinkles, blemishes, pores)
- Brighten and even out skin tone with warm healthy glow
- Subtle face slimming and jawline refinement
- Brighter, clearer eyes with soft catchlight
- Soft studio lighting effect — like a professional portrait
- The person should look like the BEST version of themselves
- Keep it NATURAL — enhanced beauty, not plastic surgery`
  }
  return `BEAUTY ENHANCEMENT — make this person look their BEST:
- Smooth skin naturally (reduce blemishes, pores, redness)
- Even out skin tone for a clean, fresh, healthy look
- Subtle jawline definition and cleaner facial contours
- Brighter, clearer eyes
- Soft studio lighting effect — like a professional portrait
- The person should look like the BEST version of themselves
- Keep it NATURAL and masculine — enhanced, not artificial`
}

// ─── Gender-Specific Style Rules ─────────────────────────────────

function getGenderStyleRules(gender: string): string {
  if (gender === 'female') {
    return `- Mix of trousers AND skirts/dresses — do NOT default to only skirts. Trousers are equally feminine and stylish.
- Trousers options: wide-leg wool, tailored straight-leg, relaxed chinos, pressed pants, slim cigarette trousers
- Dress/skirt options: wrap dress, midi skirt, A-line skirt, knit dress — when appropriate for the scenario
- Emphasize waist definition, quality fabrics, elegant proportions
- Think Reformation, Rouje, Sezane, The Row — modern feminine with variety
- Every outfit should feel special and put-together
- Include heels, mules, flats, or clean sneakers depending on the look`
  }
  return `- Relaxed, comfortable silhouette — NOT tight, NOT skinny fit
- Trousers with comfortable straight-leg or slightly wide drape, jackets with soft natural shoulders
- Mix of relaxed tailored fit and easy casual fit — modern men prefer comfort over constriction`
}

// ─── Main Prompt Builders ────────────────────────────────────────

/**
 * Build the complete edit prompt for the 6-scenario fashion generation.
 * Used by generate-styles.ts.
 */
export function buildFashionEditPrompt(opts: {
  directive: string
  gender: string
  colorInspiration: string
  silhouetteGuide: string
}): string {
  const { directive, gender, colorInspiration, silhouetteGuide } = opts
  const genderWord = gender === 'female' ? 'woman' : 'man'

  return `You are the world's top personal stylist with 20 years of experience dressing celebrities, executives, and everyday people. Your superpower: you can look at ANY person and instantly see their most flattering silhouette, colors, and style.

RULE #1 — DO NOT CROP OR ZOOM. Output MUST have IDENTICAL framing as input. Same head position, same body position, same space above head. If input is full-body, output is full-body.

⚠️ FACE IDENTITY LOCK:
This is a CLOTHING SWAP. The FACE must remain IDENTICAL — same eyes, nose, mouth, expression. Do NOT regenerate the face.

YOUR TASK: ONLY change the CLOTHING. Analyze body type, skin tone, proportions, then dress them perfectly.

SCENARIO DIRECTIVE:
${directive}

${colorInspiration}

CRITICAL: This is a ${genderWord}. The outfit MUST be appropriate for a ${genderWord}.

PERSONAL COLOR: Diagnose skin undertone (SPRING WARM/SUMMER COOL/AUTUMN WARM/WINTER COOL) and adapt all colors to make this person's skin GLOW.

STYLING RULES:
- Each outfit MUST be VISUALLY DISTINCT — different silhouette, different color scheme
- Outfit must be WEARABLE in real life — NOT theatrical or costume-like
- Quality fabrics: cashmere, silk, fine wool, supple leather
- Think Bottega Veneta, Celine, The Row, Auralee, Lemaire — adapted for REAL LIFE
${getGenderStyleRules(gender)}${silhouetteGuide}

${getBeautyRetouch(gender)}

${FOCUS_RULES}

${BACKGROUND_ENHANCEMENT}

${INPAINTING_RULES}

${BODY_PRESERVATION}

${ABSOLUTE_REQUIREMENTS}

REMINDER: DO NOT CROP OR ZOOM. Keep IDENTICAL framing as input. Head must be fully visible.

Generate the edited photo.`
}

