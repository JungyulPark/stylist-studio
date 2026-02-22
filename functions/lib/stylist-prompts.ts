/**
 * Expert Stylist Prompt System
 *
 * Directive-based prompts that let the AI analyze each person's unique features
 * (body type, skin tone, proportions) and design the optimal outfit,
 * instead of hardcoding specific garments for everyone.
 *
 * Used by: generate-styles.ts (6 scenarios), transform-batch.ts (brand looks)
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
1. NEVER CROP OR ZOOM - output must have IDENTICAL framing as input
2. NEVER change aspect ratio - if input is portrait, output is portrait
3. Face position, size, and features MUST be PIXEL-PERFECT identical
4. Keep EXACTLY what is visible in the original - do not extend or add content
5. Hairstyle, hair color, skin tone base - ZERO changes allowed
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

// ─── Color Palettes (suggestions, not prescriptions) ─────────────

const maleColorPalettes = [
  { tone: 'minimal', colors: 'black, off-white, charcoal, cream', accent: 'silver' },
  { tone: 'coastal', colors: 'navy, white, stone grey, sand', accent: 'tan leather' },
  { tone: 'earth', colors: 'olive, cream, tan, dark brown', accent: 'brass' },
  { tone: 'urban', colors: 'charcoal, white, slate, black', accent: 'gunmetal' },
  { tone: 'warm', colors: 'camel, white, chocolate, cream', accent: 'gold' },
  { tone: 'nordic', colors: 'grey, oatmeal, black, soft white', accent: 'silver' },
  { tone: 'heritage', colors: 'navy, deep burgundy, cream, charcoal', accent: 'gold' },
  { tone: 'natural', colors: 'sage, cream, tan, soft grey', accent: 'brass' },
  { tone: 'dusk', colors: 'deep navy, grey, soft white, stone', accent: 'silver' },
  { tone: 'timber', colors: 'dark brown, cream, olive, charcoal', accent: 'copper' },
]

const femaleColorPalettes = [
  { tone: 'minimal', colors: 'ivory, warm grey, soft black, cream', accent: 'gold' },
  { tone: 'sand', colors: 'warm sand, taupe, soft white, dove grey', accent: 'rose gold' },
  { tone: 'slate', colors: 'cool grey, pale blue, off-white, charcoal', accent: 'silver' },
  { tone: 'sage', colors: 'muted sage, cream, warm beige, soft olive', accent: 'gold' },
  { tone: 'blush', colors: 'dusty pink, cream, light grey, soft taupe', accent: 'pearl' },
  { tone: 'marine', colors: 'navy, crisp white, camel, grey', accent: 'gold' },
  { tone: 'wine', colors: 'deep burgundy, charcoal, cream, stone', accent: 'antique gold' },
  { tone: 'forest', colors: 'deep forest green, cream, tan, charcoal', accent: 'bronze' },
  { tone: 'espresso', colors: 'dark chocolate, cream, camel, soft white', accent: 'gold' },
  { tone: 'cloud', colors: 'soft grey, white, pale taupe, silver grey', accent: 'pearl' },
]

// ─── 6 Scenario Directives ──────────────────────────────────────

export function getScenarios(): ScenarioConfig[] {
  return [
    {
      id: 'best-match',
      labelKo: '베스트 매치', labelEn: 'Best Match', labelJa: 'ベストマッチ', labelZh: '最佳搭配', labelEs: 'Mejor Combinación',
      directiveMale: `Create the MOST FLATTERING versatile outfit for this man — like his personal signature style that makes him look his absolute best.

ANALYZE his body type, skin tone, and proportions, then design the perfect outfit:
- Broad shoulders → lean into structured pieces, clean single-breasted blazer or fitted crewneck
- Slim build → add visual presence with layered textures, structured shoulders, quality knits
- Athletic build → showcase with fitted knits, well-proportioned trousers, clean lines
- Fuller build → elongate with vertical lines, V-necks, dark monochromatic tones

Choose the single most flattering outfit from: smart knit + trousers, casual blazer + tee, clean minimal separates, or elevated basics.
Think COS, Massimo Dutti, or Zara editorial — modern, versatile, his everyday best.`,

      directiveFemale: `Create the MOST FLATTERING versatile outfit for this woman — like her personal signature style that makes her look her absolute best.

ANALYZE her body type, skin tone, and proportions, then design the perfect outfit:
- Long legs → show with a midi skirt, A-line dress, or tailored silhouette
- Defined waist → emphasize with a belt, wrap dress, or fitted knit
- Broad shoulders → balance with V-neckline, A-line skirt, or wide-leg bottoms
- Petite frame → elongate with high waist, monochromatic palette, pointed-toe shoes
- Curvy figure → highlight with an X-silhouette, wrap dress, or fitted-and-flare shapes

Choose the single most flattering option from: wrap dress, midi skirt + knit top, A-line dress, tailored trousers + silk blouse, or a jumpsuit.
Think Reformation, Rouje, or Sezane editorial — effortlessly chic, feminine, her everyday best.`,
    },
    {
      id: 'interview',
      labelKo: '인터뷰룩', labelEn: 'Interview', labelJa: 'インタビュー', labelZh: '面试装', labelEs: 'Entrevista',
      directiveMale: `Create a SHARP, CONFIDENT professional look for this man. Modern creative industry professional — NOT stiff corporate.

ANALYZE his coloring and build to choose the most powerful professional outfit:
- Determine his best power color (navy, charcoal, or warm dark tones) based on skin undertone
- Choose between structured blazer, modern sport coat, or sharp knitwear based on his frame
- Clean tailored trousers with proper drape and break
- Polished leather shoes — derbies, loafers, or clean boots

The outfit should say "I'm the smartest person in the room" without trying too hard.
Think modern tech CEO meets creative director — confident, capable, approachable.`,

      directiveFemale: `Create a SHARP, CONFIDENT professional look for this woman. Modern creative industry professional — NOT stiff corporate.

ANALYZE her coloring and build to choose the most powerful professional outfit:
- Determine her best power color (navy, cream, charcoal, or jewel tones) based on skin undertone
- Choose the most flattering professional silhouette: tailored blazer + skirt, structured dress, or blouse + tailored trousers
- Nipped waist, feminine lines — powerful but not masculine
- Elegant footwear: pointed-toe heels, kitten heels, or sophisticated flats

The outfit should say "I'm the smartest person in the room" without trying too hard.
Think magazine-cover professional woman — confident, sophisticated, memorable.`,
    },
    {
      id: 'date',
      labelKo: '데이트룩', labelEn: 'Date Night', labelJa: 'デートルック', labelZh: '约会装', labelEs: 'Cita',
      directiveMale: `Create an ALLURING, STYLISH date night look for this man. The kind of outfit that gets a second glance.

ANALYZE his features and choose the most attractive evening outfit:
- Highlight his best feature: broad shoulders (fitted jacket), height (monochromatic elongation), strong jaw (open collar)
- Choose from: soft blazer + knit polo, mock-neck + tailored trousers, fitted leather jacket + knit
- Relaxed confidence — NOT overdressed, NOT underdressed
- Suede loafers, clean boots, or polished leather shoes

The outfit should make his date think "wow, he has great style."
Think refined evening aesthetic — effortlessly stylish, subtly magnetic.`,

      directiveFemale: `Create an ALLURING, ROMANTIC date night look for this woman. Something that highlights her best features and gets a second glance.

ANALYZE her body and choose the most stunning date outfit:
- Highlight her best features: legs (midi with slit or above-knee), waist (cinched or fitted), decolletage (V-neck or off-shoulder), back (elegant straps)
- Choose the most flattering option from: satin slip dress, body-skimming knit dress, off-shoulder midi, fitted top + satin skirt, or elegant jumpsuit
- Sensual yet tasteful — alluring, not overly revealing
- Strappy heels, pointed-toe mules, or elegant sandals

The outfit should make heads turn at a candlelit restaurant.
Think romantic, feminine, the kind of look that sparks compliments all night.`,
    },
    {
      id: 'luxury',
      labelKo: '럭셔리', labelEn: 'Luxury', labelJa: 'ラグジュアリー', labelZh: '奢华', labelEs: 'Lujo',
      directiveMale: `Create a HEAD-TURNING quiet luxury look for this man. Think front row at fashion week — extraordinary fabrics, impeccable fit.

ANALYZE his build and coloring to create the ultimate luxury outfit:
- Choose his most elevated silhouette: cashmere overcoat, fine-gauge turtleneck, or double-breasted blazer
- Select fabric-forward pieces: cashmere, fine merino, wool gabardine, supple leather
- Monochromatic or tonal color scheme that looks effortlessly expensive
- Premium footwear: leather Chelsea boots, polished derbies, or suede ankle boots

Every piece should look like it costs more than it is. Zero logos, pure quality.
Think The Row, Loro Piana, Brunello Cucinelli — understated opulence.`,

      directiveFemale: `Create a HEAD-TURNING quiet luxury look for this woman. Think front row at fashion week — extraordinary fabrics, impeccable tailoring.

ANALYZE her body and coloring to create the ultimate luxury outfit:
- Choose her most elevated silhouette: cashmere coat, silk midi dress, or tailored ensemble
- Select fabric-forward pieces: cashmere, silk, fine wool crepe, supple leather
- Monochromatic or tonal palette that whispers wealth
- Choose from: long cashmere coat + knit dress, silk blouse + wool-crepe skirt, structured coat-dress, or tonal separates
- Premium footwear: pointed-toe boots, elegant pumps, or refined flats
- One statement piece of delicate jewelry — less is more

Every piece should radiate quality. Zero logos, pure craftsmanship.
Think Toteme, The Row, Max Mara — understated opulence, head-turning elegance.`,
    },
    {
      id: 'casual',
      labelKo: '캐주얼', labelEn: 'Casual', labelJa: 'カジュアル', labelZh: '休闲', labelEs: 'Casual',
      directiveMale: `Create an EFFORTLESSLY CHIC weekend look for this man. NOT boring basics — styled, intentional, the kind of casual that looks like it took no effort but actually looks amazing.

ANALYZE his style potential and choose the perfect weekend outfit:
- Don't default to boring jeans + tee — elevate with unexpected combinations
- Choose from: premium sweatshirt + tailored joggers, oversized shirt + relaxed chinos, casual knit + comfortable jeans, bomber jacket + relaxed separates
- Comfortable but intentional — every piece has a reason
- Clean sneakers, suede desert boots, or canvas slip-ons

The outfit should get a "you always look so put-together" even on a Saturday.
Think off-duty model meets creative professional — effortless cool.`,

      directiveFemale: `Create an EFFORTLESSLY CHIC weekend look for this woman. NOT boring basics — styled, intentional, the kind of casual that looks like it took no effort but actually looks amazing.

ANALYZE her body and style potential:
- Don't default to jeans + sweater — elevate with feminine combinations
- Choose the most flattering from: belted shirt dress, oversized knit + midi skirt, fitted striped top + relaxed linen skirt, cardigan + flowing dress, or casual co-ord set
- Comfortable but beautiful — every piece contributes to the look
- Clean sneakers, woven sandals, ballet flats, or casual mules

The outfit should get "where did you get that?" at a weekend brunch.
Think French-girl weekend — relaxed, feminine, never frumpy, never boring.`,
    },
    {
      id: 'daily',
      labelKo: '데일리', labelEn: 'Daily', labelJa: 'デイリー', labelZh: '日常', labelEs: 'Diario',
      directiveMale: `Create a POLISHED everyday outfit for this man. The kind of look that gets compliments at the coffee shop — simple but noticeably well-dressed.

ANALYZE his proportions and choose a flattering daily outfit:
- Simple but intentional — a clean knit, well-fitted trousers, quality accessories
- Choose from: crewneck + chinos, lightweight knit + relaxed trousers, polo + tailored pants, or simple tee + structured trousers
- One quality accessory: leather watch, woven belt, or clean sneakers
- Clothes that fit perfectly — not too tight, not too loose

Think everyday editorial — the best-dressed regular guy in any room.`,

      directiveFemale: `Create a POLISHED everyday outfit for this woman. The kind of look that gets compliments at the coffee shop — simple but noticeably well-dressed.

ANALYZE her body and choose the most flattering daily outfit:
- Simple but intentional — effortless elegance for any day
- Choose the most flattering from: knit cardigan + camisole + midi skirt, simple wrap dress, fitted top + flowing trousers, knit dress with belt, or blouse + tailored pants
- One delicate piece of jewelry: pendant necklace, simple studs, or thin bracelet
- Ballet flats, low block-heel mules, or clean sneakers

Think everyday elegance — the woman who always looks polished without visible effort.`,
    },
  ]
}

// ─── Color Inspiration ──────────────────────────────────────────

export function getColorInspiration(gender: string, seed: number): string {
  const palettes = gender === 'female' ? femaleColorPalettes : maleColorPalettes
  const p = palettes[seed % palettes.length]
  return `Color inspiration (starting point — adapt to this person's skin undertone): ${p.colors}, with ${p.accent} accent.
This is a SUGGESTION — deviate freely if their coloring demands different tones. Warm-undertone skin pairs better with warm colors; cool-undertone skin pairs better with cool colors.`
}

// ─── Silhouette Guide (BMI-based) ───────────────────────────────

export function getSilhouetteGuide(gender: string, height?: string, weight?: string): string {
  const h = parseInt(height || '0')
  const w = parseInt(weight || '0')
  if (!h || !w) return ''

  const bmi = w / ((h / 100) ** 2)

  if (gender === 'female') {
    if (bmi < 18.5) return '\nSILHOUETTE: Slim build — add visual volume with layered textures, soft ruffles, and A-line shapes. Warm colors add presence.'
    if (bmi < 23) return '\nSILHOUETTE: Balanced build — most silhouettes work well. Highlight waist with belts or fitted mid-sections for defined proportions.'
    if (bmi < 27) return '\nSILHOUETTE: Curvy build — emphasize slim areas (wrists, ankles, collarbone). X-silhouette with defined waist. Vertical lines and monochromatic tones for a streamlined look.'
    return '\nSILHOUETTE: Fuller build — show slim areas (wrists, ankles, collarbone). Vertical lines and monochromatic tones for streamlined look. X-design with defined waist. Avoid overly tight or baggy.'
  }

  if (bmi < 18.5) return '\nSILHOUETTE: Slim build — add structure with layered pieces, textured fabrics, and structured shoulders to build visual volume.'
  if (bmi < 24) return '\nSILHOUETTE: Balanced build — most fits work well. Clean proportions with well-fitted pieces that follow the body naturally.'
  if (bmi < 28) return '\nSILHOUETTE: Stocky build — vertical lines, monochromatic color flow, and structured fabrics for a lean look. V-shaped layering draws eyes upward.'
  return '\nSILHOUETTE: Fuller build — dark vertical lines and structured fabrics for a streamlined silhouette. V-neck and open collars elongate. Avoid overly tight or boxy cuts.'
}

// ─── Beauty Retouch ─────────────────────────────────────────────

function getBeautyRetouch(gender: string): string {
  if (gender === 'female') {
    return `BEAUTY ENHANCEMENT for the face:
- Apply soft, natural skin smoothing (reduce wrinkles and blemishes subtly)
- Add gentle soft-focus glow effect on the face
- Even out skin tone with warm, healthy glow
- Enhance with soft studio lighting effect
- Keep the face looking NATURAL - not overly edited`
  }
  return `SUBTLE BEAUTY ENHANCEMENT for the face:
- Apply light natural skin smoothing (reduce blemishes subtly)
- Add subtle soft-focus glow effect on the face
- Even out skin tone slightly for a clean, fresh look
- Keep the face looking NATURAL and masculine - not overly edited`
}

// ─── Gender-Specific Style Rules ─────────────────────────────────

function getGenderStyleRules(gender: string): string {
  if (gender === 'female') {
    return `- STRONGLY prefer dresses, skirts, and feminine silhouettes over pants
- Use wrap dresses, midi skirts, pleated skirts, A-line skirts, slip dresses, knit dresses
- Emphasize waist definition, flowing fabrics, elegant draping
- Think Reformation, Rouje, Sezane, Realisation Par — modern feminine, NOT corporate
- Avoid basic jeans+sweater combos — every outfit should feel special and put-together
- Include heels, mules, or strappy sandals when appropriate (not just sneakers and loafers)`
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

YOUR TASK: ANALYZE this person's photo — their body type, skin tone, face shape, and proportions — then dress them in the PERFECT outfit.

SCENARIO DIRECTIVE:
${directive}

${colorInspiration}

CRITICAL: This is a ${genderWord}. The outfit MUST be appropriate for a ${genderWord}.

STYLING APPROACH — PERSONAL COLOR ANALYSIS:
- Examine skin undertone from the photo:
  * WARM (golden, peachy, yellow): Best in terracotta, olive, camel, mustard, coral, cream. Avoid stark cool tones.
  * COOL (pink, rosy, bluish): Best in navy, lavender, ice blue, emerald, burgundy, pearl white. Avoid warm yellows/oranges.
- Dark skin + warm tones = striking harmony; light skin + cool tones = refined elegance
- Quality fabrics with natural texture and drape, not stiff or costume-like
- Avoid overly theatrical, costume-like, neon, or overly saturated outfits — keep it realistic, modern, and tasteful
- Think modern minimalist brands: COS, Zara, Uniqlo, Massimo Dutti — NOT costume or runway-only styles
- Colors should be muted and wearable — NO bright red, pumpkin orange, hot pink, or neon tones
- Prioritize neutral-based outfits with ONE subtle color accent at most
${getGenderStyleRules(gender)}${silhouetteGuide}

${getBeautyRetouch(gender)}

${FOCUS_RULES}

${BACKGROUND_ENHANCEMENT}

${INPAINTING_RULES}

${BODY_PRESERVATION}

${ABSOLUTE_REQUIREMENTS}

This is a clothing REPLACEMENT task for the MAIN PERSON only.
Keep the person's HEAD and FACE at the EXACT same position.
The clothes should naturally fit the existing body shape.
DO NOT generate full body if original only shows partial body.

Generate the edited photo with IDENTICAL composition to the input.`
}

/**
 * Build the complete edit prompt for brand-inspired fashion looks.
 * Used by transform-batch.ts for fashion type.
 */
export function buildBrandEditPrompt(opts: {
  brandDirective: string
  gender: string
}): string {
  const { brandDirective, gender } = opts
  const genderWord = gender === 'female' ? 'woman' : 'man'

  const genderGuideFashion = gender === 'female'
    ? 'This is a WOMAN. The outfit MUST be soft and feminine - use dresses, blouses, cardigans, skirts in soft/pastel colors. NO masculine suits, NO blazers, NO formal business wear.'
    : 'This is a MAN. The outfit MUST be masculine and designed for men. Use suits, shirts, masculine jackets, pants - NOT women\'s clothing.'

  return `You are the world's top personal stylist. Your job is to dress this person in the PERFECT outfit that complements their unique skin tone, face shape, and body proportions.

BRAND MOOD DIRECTIVE:
${brandDirective}

STYLING APPROACH — PERSONAL COLOR ANALYSIS:
- Examine skin undertone from the photo:
  * WARM (golden, peachy, yellow): Best in terracotta, olive, camel, mustard, coral, cream. Avoid stark cool tones.
  * COOL (pink, rosy, bluish): Best in navy, lavender, ice blue, emerald, burgundy, pearl white. Avoid warm yellows/oranges.
- Dark skin + warm tones = striking harmony; light skin + cool tones = refined elegance
- The specified color palette is a SUGGESTION — shift shades warmer or cooler to suit this person's undertone
- Quality fabrics with natural texture and drape, not stiff or costume-like
- Avoid overly theatrical, costume-like, or neon outfits — keep it realistic and tasteful
${gender === 'male' ? '- Relaxed, comfortable silhouette — NOT tight, NOT skinny fit\n- Trousers with comfortable straight-leg or slightly wide drape, jackets with soft natural shoulders\n- Mix of relaxed tailored fit and easy casual fit — modern men prefer comfort over constriction' : '- STRONGLY prefer dresses, skirts, and feminine silhouettes over pants\n- Use wrap dresses, midi skirts, pleated skirts, A-line skirts, slip dresses, knit dresses\n- Emphasize waist definition, flowing fabrics, elegant draping\n- Think Reformation, Rouje, Sezane — modern feminine, NOT corporate or frumpy\n- Include heels, mules, or strappy sandals when appropriate'}

BODY PROPORTION STYLING:
- ANALYZE this person's body type and proportions from the photo
- Observe body proportions and select silhouettes that FLATTER this specific build
- For shorter torsos: visual waistline higher for longer leg line
- Use vertical lines and monochromatic color flow for elongation

CRITICAL: ${genderGuideFashion}

${getBeautyRetouch(gender)}

${FOCUS_RULES}

${BACKGROUND_ENHANCEMENT}

${INPAINTING_RULES}

${BODY_PRESERVATION}

${ABSOLUTE_REQUIREMENTS}

This is a clothing REPLACEMENT task for the MAIN ${genderWord} only.
Keep the person's HEAD and FACE at the EXACT same position.
The ${genderWord}'s clothes should naturally fit the existing body shape.
DO NOT generate full body if original only shows partial body.

Generate the edited photo with IDENTICAL composition to the input.`
}
