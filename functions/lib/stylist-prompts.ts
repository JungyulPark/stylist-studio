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

// ─── Work Style Job Types ────────────────────────────────────────

export interface WorkJobType {
  id: string
  labelKo: string
  labelEn: string
  labelJa: string
  labelZh: string
  labelEs: string
  icon: string
}

export const workJobTypes: WorkJobType[] = [
  { id: 'doctor', labelKo: '의사', labelEn: 'Doctor', labelJa: '医師', labelZh: '医生', labelEs: 'Médico', icon: '🩺' },
  { id: 'dentist', labelKo: '치과의사', labelEn: 'Dentist', labelJa: '歯科医', labelZh: '牙医', labelEs: 'Dentista', icon: '🦷' },
  { id: 'nurse', labelKo: '간호사', labelEn: 'Nurse', labelJa: '看護師', labelZh: '护士', labelEs: 'Enfermero/a', icon: '💉' },
  { id: 'vet', labelKo: '수의사', labelEn: 'Veterinarian', labelJa: '獣医', labelZh: '兽医', labelEs: 'Veterinario/a', icon: '🐾' },
  { id: 'chef', labelKo: '셰프', labelEn: 'Chef', labelJa: 'シェフ', labelZh: '厨师', labelEs: 'Chef', icon: '👨‍🍳' },
  { id: 'lawyer', labelKo: '변호사', labelEn: 'Lawyer', labelJa: '弁護士', labelZh: '律师', labelEs: 'Abogado/a', icon: '⚖️' },
]

// ─── Work Style Scenario Directives ──────────────────────────────

const workDirectives: Record<string, { male: string; female: string }> = {
  doctor: {
    male: `STYLING BRIEF — MALE DOCTOR, PREMIUM MEDICAL SCRUBS
You are styling a doctor in realistic, high-quality medical scrubs — the kind from FIGS, Jaanuu, or Grey's Anatomy brand. NOT pajamas, NOT loungewear, NOT a tracksuit. These are REAL medical scrubs.

OUTFIT SPEC:
- TOP: Classic V-neck short-sleeve scrub top — the V-neck is distinctive (NOT crew neck, NOT mandarin collar). It must look like an actual medical scrub top. Slightly relaxed fit that shows a good physique without being tight. LEFT CHEST POCKET with visible pen clip and name embroidery area. The fabric is structured medical-grade polyester-rayon blend — it holds its shape, NOT soft/drapey like a T-shirt.
- BOTTOM: Straight-leg scrub pants with a comfortable but NOT baggy fit — tapered slightly toward the ankle. Drawstring waist (can be partially visible). Side cargo pocket on the thigh. The pants should look like medical scrub pants, NOT dress trousers and NOT joggers.
- SHOES: Clean white or grey athletic nursing shoes (like New Balance, Hoka, or Dansko clogs). Practical, clean, medical-appropriate.
- ACCESSORIES: Stethoscope draped around the neck. Hospital ID badge clipped to the pocket. Simple watch.

COLOR MUST BE CHOSEN based on this person's skin tone and undertone from the photo. Warm → deep teal, hunter green, burgundy, warm grey. Cool → ceil blue (classic hospital blue), navy, slate, pewter. The color should be a REAL scrub color — matte, solid, no patterns.

CRITICAL: The fabric must look like MEDICAL SCRUBS FABRIC — structured, slightly stiff, matte finish. NOT like cotton jersey, NOT like silk, NOT like knitwear. Think of what you see in a hospital.`,
    female: `STYLING BRIEF — FEMALE DOCTOR, PREMIUM MEDICAL SCRUBS
You are styling a female doctor in realistic, high-quality medical scrubs — like FIGS Zamora jogger set or Jaanuu scrubs. NOT pajamas, NOT loungewear.

OUTFIT SPEC:
- TOP: Fitted V-neck short-sleeve scrub top — the classic medical V-neck shape. Fitted through the waist (not boxy) to show a flattering silhouette, but professional. LEFT CHEST POCKET with pen clip area. Optional: one additional pocket at the hip. Structured medical fabric — holds its shape, not drapey.
- BOTTOM: Slim straight or slightly tapered scrub pants — NOT skin-tight, but shaped and modern. Mid-rise with drawstring waist. Side cargo pocket on the thigh. The silhouette is clean and professional. NOT jogger cuffs — clean straight hem at the ankle.
- SHOES: Clean white athletic nursing shoes or white clogs. Medical-appropriate, practical.
- ACCESSORIES: Stethoscope around neck. Hospital ID badge. Small stud earrings only.

COLOR MUST BE CHOSEN based on this person's skin tone and undertone from the photo. Warm → deep teal, sage green, burgundy, dusty rose. Cool → ceil blue, navy, lavender, cool grey. Classic medical scrub colors — matte, solid.

CRITICAL: Must look like ACTUAL medical scrubs, not fashion knitwear. The fabric is structured polyester-blend with a matte finish. A doctor would actually wear this to work.`
  },
  dentist: {
    male: `STYLING BRIEF — MALE DENTIST, PREMIUM DENTAL SCRUBS
You are styling a dentist in clean, modern dental clinic scrubs. NOT pajamas, NOT loungewear.

OUTFIT SPEC:
- TOP: Short-sleeve scrub top — clean V-neck or mock-neck (dental professionals often prefer mock-neck to prevent debris). Slim but comfortable fit. LEFT CHEST POCKET with pen. Structured medical fabric, matte finish. Can be slightly more fitted than standard scrubs for a modern clinic aesthetic.
- BOTTOM: Straight-leg scrub pants — comfortable, not baggy, with drawstring waist. Clean straight hem. Side pocket. Professional medical pants silhouette.
- SHOES: Clean white nursing shoes or white clogs. Pristine and practical.
- OPTIONAL: Dental loupes pushed up on forehead or hanging around neck.

COLOR MUST BE CHOSEN based on this person's skin tone. Warm → charcoal, deep olive, warm taupe. Cool → steel blue, slate grey, cool white. All-white is classic for dental clinics. Colors should be solid, matte — real scrub colors.

CRITICAL: Fabric must look like structured medical scrubs — NOT soft knitwear, NOT silk, NOT cotton jersey.`,
    female: `STYLING BRIEF — FEMALE DENTIST, PREMIUM DENTAL SCRUBS
You are styling a female dentist in modern dental clinic scrubs.

OUTFIT SPEC:
- TOP: Fitted short-sleeve scrub top — mock-neck or clean V-neck. Fitted at the waist for a flattering but professional shape. LEFT CHEST POCKET. Structured medical fabric, matte.
- BOTTOM: Slim straight scrub pants — mid-rise, drawstring waist, clean straight hem at ankle. Not tight but shaped. Professional.
- SHOES: White nursing shoes or white clogs. Clean and practical.

COLOR MUST BE CHOSEN based on skin tone. Warm → soft sage, warm sand, muted blush. Cool → powder blue, cool white, lavender-grey. Dental clinic colors — clean, bright, professional.

CRITICAL: Must look like actual dental scrubs, not fashion wear.`
  },
  nurse: {
    male: `STYLING BRIEF — MALE NURSE, PREMIUM MEDICAL SCRUBS
You are styling a male nurse in professional hospital scrubs. NOT pajamas, NOT athletic wear.

OUTFIT SPEC:
- TOP: V-neck short-sleeve scrub top — classic medical V-neck shape. Comfortable fit through the shoulders and torso, not tight but showing a clean silhouette. LEFT CHEST POCKET with pen. Optional second pocket at the hip. Structured medical polyester-blend fabric with matte finish.
- BOTTOM: Straight-leg scrub pants — comfortable fit, not baggy, with drawstring waist. Cargo pocket on the side thigh. Clean straight hem. These are standard medical scrub pants — functional and professional.
- SHOES: Clean white athletic nursing shoes or white Crocs/Dansko clogs. Hospital-appropriate.
- ACCESSORIES: Stethoscope around neck. Hospital ID badge on pocket. Simple digital or analog watch.

COLOR MUST BE CHOSEN based on skin tone. Warm → hunter green, warm grey, deep wine, teal. Cool → ceil blue, navy, cool steel, pewter. Standard hospital scrub colors — solid, matte.

CRITICAL: These must look like REAL hospital scrubs — structured fabric, medical-grade appearance. NOT soft cotton T-shirts, NOT athleisure.`,
    female: `STYLING BRIEF — FEMALE NURSE, PREMIUM MEDICAL SCRUBS
You are styling a female nurse in professional hospital scrubs.

OUTFIT SPEC:
- TOP: V-neck or mock-wrap short-sleeve scrub top — fitted at the waist for a feminine but professional silhouette. LEFT CHEST POCKET. The fabric is structured medical-grade polyester blend, matte finish — holds its shape.
- BOTTOM: Slim straight scrub pants — comfortable through the hip, clean straight leg to the ankle. Drawstring waist. Side cargo pocket. Professional medical pants.
- SHOES: Clean white nursing shoes, white clogs, or white athletic shoes. Practical and clean.
- ACCESSORIES: Stethoscope. ID badge. Small stud earrings only.

COLOR MUST BE CHOSEN based on skin tone. Warm → wine, warm teal, sage. Cool → ceil blue, lavender, silver-grey. Real hospital scrub colors — solid, matte.

CRITICAL: Must look like actual nursing scrubs. Structured fabric, professional fit. Not loungewear.`
  },
  vet: {
    male: `STYLING BRIEF — MALE VETERINARIAN, PRACTICAL VET SCRUBS
You are styling a veterinarian in practical, durable vet clinic scrubs. NOT pajamas.

OUTFIT SPEC:
- TOP: V-neck short-sleeve scrub top — relaxed but not baggy. Chest pocket with pen. Durable cotton-polyester blend fabric, thicker than hospital scrubs for durability. Practical for animal handling.
- BOTTOM: Straight-leg scrub pants or cargo-style work pants — roomy enough for movement, with cargo pockets for tools. Drawstring waist. Durable, stain-resistant fabric. NOT dress pants.
- SHOES: Clean leather Chelsea boots in brown/tan, or sturdy white athletic shoes. Practical for standing all day.
- ACCESSORIES: Stethoscope around neck. Rolled sleeves showing forearms. ID badge optional.

COLOR MUST BE CHOSEN based on skin tone. Earth tones work best — warm skin → forest green, olive, warm sand, tobacco. Cool skin → teal, cool moss, slate blue, stone grey. Darker colors practical for vet work.

CRITICAL: Must look like actual veterinary scrubs — durable, practical, workwear feel. NOT luxury knitwear.`,
    female: `STYLING BRIEF — FEMALE VETERINARIAN, PRACTICAL VET SCRUBS
You are styling a female vet in practical vet clinic scrubs.

OUTFIT SPEC:
- TOP: V-neck short-sleeve scrub top — fitted at waist, practical for movement. Chest pocket with pen. Durable cotton-poly blend fabric.
- BOTTOM: Straight-leg scrub pants — comfortable, with cargo pockets. Drawstring waist. Practical and durable.
- SHOES: White athletic shoes or clean ankle boots. Practical for all-day standing.
- ACCESSORIES: Stethoscope around neck.

COLOR MUST BE CHOSEN based on skin tone. Warm → sage, olive, dusty clay, sand. Cool → teal, cool moss, ocean grey, blue-stone. Earth and nature tones — practical for vet work.

CRITICAL: Must look like actual vet scrubs — durable, practical, not fashion wear.`
  },
  chef: {
    male: `STYLING BRIEF — MALE CHEF, LUXURY EDITION
You are styling a head chef for a W Magazine culinary feature. This is where Michelin stars meet personal style.

OUTFIT SPEC:
- TOP: Modern chef jacket — single-breasted, mandarin collar, short sleeves. The fit is SLIM through the torso — tailored, not baggy. Premium heavyweight Japanese cotton with a subtle texture. Hidden snap buttons, flat-felled seams. This jacket was made by a tailor, not a uniform company.
- APRON: Signature crossback apron in heavy raw selvedge denim OR washed heavyweight linen. The fabric shows wear and character. The straps cross at the back cleanly. NOT leather — this is a working kitchen, not a steakhouse.
- BOTTOM: Slim straight black trousers — clean modern cut, no pattern, no checkering. Like Saint Laurent black jeans in a chef-appropriate fabric. Clean break at the ankle.
- SHOES: Black leather Birkenstock Boston clogs (oiled leather) or clean black Chelsea boots. Worn-in but cared for.
- OPTIONAL: Black merino beanie. Sleeves pushed to forearms.

COLOR: Bright white jacket (the classic — nothing is more powerful) or charcoal grey for moodier look. The apron in raw indigo denim, natural linen, or black provides the contrast.

MOOD: This chef has two Michelin stars and a Netflix series. The jacket fits like Hedi Slimane cut it. The apron tells a story. He moves through the kitchen like a conductor. Every detail — the knife roll, the towel placement, the way the apron is tied — is a deliberate act of style.`,
    female: `STYLING BRIEF — FEMALE CHEF, LUXURY EDITION
You are styling a head chef for a W Magazine culinary feature.

OUTFIT SPEC:
- TOP: Modern chef jacket — feminine tailored cut, mandarin collar, short sleeves. Darted at the waist for shape. Premium Japanese cotton, crisp but with beautiful drape. The collar stands perfectly.
- APRON: Crossback apron in washed heavyweight linen or raw selvedge denim — elegant, defining the waist. Tied simply. NOT leather.
- BOTTOM: Slim straight black trousers — clean, modern, tailored. Like The Row trousers but kitchen-ready. Ankle-length.
- SHOES: Black leather clogs or clean minimal black ankle boots. Timeless.
- OPTIONAL: Hair in a sleek low bun. One thin gold chain.

COLOR: White jacket (power, purity, authority) or off-white/cream for warmth. Charcoal for edge. The apron in natural linen, indigo denim, or black adds depth.

MOOD: She got the James Beard AND the Vogue Italia feature in the same year. The kitchen whites are couture-level. She plates food like she composes art. The apron has stories in its creases. This is a woman who turned craft into elegance.`
  },
  lawyer: {
    male: `STYLING BRIEF — MALE LAWYER, LUXURY EDITION
You are styling a senior attorney for a portrait in The Rake or Monocle. This is power dressing elevated to an art form.

OUTFIT SPEC:
- SUIT: Two-piece in super 150s Italian wool — the fabric has a buttery hand and subtle luster that photographs beautifully. Single-breasted, two-button, natural shoulder. The lapels are perfectly proportioned to his frame. Full-canvas construction. The suit MOVES with him.
- SHIRT: Crisp Egyptian cotton poplin in white or palest blue. Spread collar. Perfectly pressed. French cuffs with understated cufflinks.
- TIE: Italian silk — subtle diagonal stripe, grenadine texture, or rich solid. Deep tones that complement the suit. Tied in a perfect four-in-hand.
- SHOES: Mirror-polished cap-toe oxford or sleek penny loafer. The leather is museum-quality.
- ACCESSORIES: Dress watch — Jaeger-LeCoultre or Cartier Tank level of taste. Slim leather portfolio.

COLOR: Warm skin → midnight navy, rich chocolate, warm charcoal with brown undertones. Cool skin → cool charcoal, blue-grey, steel navy. The suit color makes his face the masterpiece.

MOOD: The attorney who makes opposing counsel nervous before opening statements. The suit is Brioni-level but worn like it's nothing. He looks like old money even if he isn't. Every crease is intentional. Every button is considered. He doesn't wear the suit — the suit is part of him.`,
    female: `STYLING BRIEF — FEMALE LAWYER, LUXURY EDITION
You are styling a senior attorney for a portrait in Harper's Bazaar.

OUTFIT SPEC:
- SUIT: Power suit — fitted single-breasted blazer with defined waist, clean shoulder, and modern proportion. Premium wool gabardine or silk-wool blend that photographs like liquid. Slightly cropped blazer with high-waist wide trousers, OR longer blazer with a midi pencil skirt with back slit, OR a sheath dress under a structured blazer.
- TOP (IMPORTANT — VARY THE INNER PIECE): Choose ONE from this list — do NOT always default to a silk V-neck blouse:
  • Fine-gauge cashmere crewneck or turtleneck (structured, polished)
  • Draped jersey mock-neck top
  • Silk charmeuse blouse with bow-tie or pussy-bow neckline
  • Structured silk camisole layered under the blazer
  • Crisp cotton poplin shirt with French cuffs
  • Ribbed knit fitted top in a tonal shade
  Randomly select ONE of these — variety is essential across different generations.
- BOTTOM (IMPORTANT — VARY BETWEEN THESE):
  • Wide-leg trousers with clean pressed crease (50% probability)
  • Midi pencil skirt with back slit (30% probability)
  • Straight-leg tailored trousers, ankle-length (20% probability)
  Do NOT always choose pants — skirts are equally powerful.
- SHOES: Pointed-toe pumps in polished leather (80mm), elegant slingbacks, or refined suede loafers.
- ACCESSORIES: Quality timepiece or thin gold bangle. Structured leather document bag. Small gold earrings — studs or delicate hoops.

COLOR: Warm skin → rich navy, deep camel, chocolate, warm tobacco. Cool skin → charcoal, cool navy, blue-grey, deep wine. The right color makes black look lazy.

MOOD: She walks into the courtroom and the temperature changes. Not loud — devastating. The suit fits like it was built on her body. The fabric catches the light when she gestures. The shoes click with authority. She argues constitutional law in the morning and attends gallery openings at night. This is a woman for whom power is not performed — it's inherent.`
  },
}

// ─── Job-Specific Off-Duty Commute Looks ─────────────────────────
// Season-aware layering guide for off-duty looks
function getSeasonGuide(): string {
  const month = new Date().getMonth() // 0=Jan
  if (month >= 5 && month <= 8) {
    // Summer (Jun-Sep)
    return `\n\nSEASON: It is SUMMER. NO jackets, NO coats, NO heavy layers. Use lightweight breathable fabrics only: linen, cotton, silk, chambray. Short sleeves and sleeveless are preferred. Think resort-wear elegance — light, breezy, effortless. NO leather jackets, NO wool, NO cashmere coats.`
  }
  if (month >= 2 && month <= 4) {
    // Spring (Mar-May)
    return `\n\nSEASON: It is SPRING. Use LIGHT layers only: thin cotton jackets, unlined blazers, light cardigans, trench coats. NO heavy overcoats, NO thick wool, NO puffer jackets. Fabrics should be airy — cotton, light linen blends, silk. Think transitional weather: a light layer you can take off.`
  }
  if (month === 9 || month === 10) {
    // Autumn (Oct-Nov)
    return `\n\nSEASON: It is AUTUMN. Medium layers are ideal: suede jackets, unstructured blazers, light knit sweaters, cotton overcoats. Rich autumn tones welcome. NOT heavy winter coats yet.`
  }
  // Winter (Dec-Feb)
  return `\n\nSEASON: It is WINTER. Warm layers are appropriate: cashmere overcoats, wool blazers, knit sweaters, leather jackets. Cozy but styled — quality fabrics that insulate elegantly.`
}

const offDutyDirectives: Record<string, { male: string; female: string }> = {
  _default: {
    male: `Create the MOST STYLISH off-duty commute look for this man. NOT boring basics — this should be the outfit that makes coworkers say "you look different outside of work."

FIRST, ANALYZE this man's body type, skin tone, and proportions from the photo.
Then choose the SINGLE most flattering combination from:
- Cashmere overcoat + merino crewneck + tailored trousers + suede Chelsea boots (Loro Piana weekend)
- Suede bomber jacket + fitted oxford shirt (collar open) + dark pressed chinos + polished loafers (Italian ease)
- Premium knit zip-through + band-collar shirt + relaxed wool trousers + clean leather sneakers (Scandinavian minimal)
- Washed cotton blazer (unstructured) + cashmere polo + straight-leg jeans + suede desert boots (French casual)

⚠️ REMOVE ALL work items: NO uniform, NO badge, NO work tools. ZERO connection to any workplace.
⚠️ Do NOT default to jeans + hoodie or jeans + T-shirt — that is NOT styling, that is giving up.
One quality accessory only: a watch OR sunglasses. NOT both.

Think Zegna or Auralee weekend editorial — relaxed but every piece is considered.
The outfit should make people wonder what he does for a living. Quiet confidence, visible quality.`,
    female: `Create the MOST STYLISH off-duty commute look for this woman. NOT boring basics — this should be the outfit that gets "where did you get that?" at a café.

FIRST, ANALYZE this woman's body type, skin tone, face shape, and proportions from the photo.
Then choose the SINGLE most flattering combination from:
- Cashmere coat + silk mock-neck + wide-leg wool trousers + pointed-toe ankle boots (quiet luxury)
- Oversized blazer (worn open) + cashmere camisole + midi silk skirt with movement + elegant loafers (Parisian weekend)
- Premium leather jacket (butter-soft) + fine-knit turtleneck + tailored culottes + suede mules (editorial cool)
- Knit cardigan (draped) + silk blouse + high-waisted pressed trousers + ballet flats (Sezane effortless)

⚠️ REMOVE ALL work items: NO uniform, NO badge, NO work tools. ZERO connection to any workplace.
⚠️ Do NOT default to jeans + sweater — elevate with feminine, intentional combinations.
⚠️ Use a MIX of trousers and skirts/dresses — do NOT default to skirts only. Tailored trousers are equally feminine.
One delicate gold piece: pendant necklace OR small hoops. Structured leather bag.

Think Reformation or Rouje editorial — relaxed, feminine, never frumpy, never boring.
The outfit should make other women screenshot it for inspiration.`,
  },
  lawyer: {
    male: `Create the MOST STYLISH off-duty look for this man — a man who wears suits all week and knows exactly how to dress without one. NOT corporate, NOT stiff — this is Saturday morning.

FIRST, ANALYZE this man's body type, skin tone, and proportions from the photo.
Then choose the SINGLE most flattering combination from:
- Cashmere overcoat + fine-gauge V-neck sweater + wool flannel trousers (relaxed fit) + suede Chelsea boots (Loro Piana weekend in Gangnam)
- Italian leather jacket (butter-soft) + merino polo + dark selvedge denim + polished penny loafers sockless (Celine off-duty)
- Suede bomber + cashmere half-zip + pressed chinos + premium leather sneakers (Cucinelli at a gallery opening)
- Unstructured linen-wool blazer + band-collar shirt + relaxed tailored trousers + woven leather loafers (Zegna resort)

⚠️ NOT a suit, NOT suit trousers, NOT dress shoes. ZERO connection to a courtroom.
⚠️ Do NOT default to jeans + basic sweater — this man's casual is better than most people's formal.
Quality automatic watch (sporty, not dress). Tortoiseshell sunglasses. Nothing else.

MOOD: Saturday morning in Cheongdam or SoHo. Walking to a specialty coffee shop, then a gallery opening. The sweater cost more than most people's suits. His off-duty style is better than most people's best-dressed day.`,
    female: `Create the MOST STYLISH off-duty look for this woman — a woman who commands boardrooms all week and her weekend style is equally deliberate. NOT corporate, NOT stiff — this is Saturday morning editorial.

FIRST, ANALYZE this woman's body type, skin tone, face shape, and proportions from the photo.
Then choose the SINGLE most flattering combination from:
- Structured cashmere coat (camel or cream) + silk camisole + wide-leg wool trousers + pointed-toe mules (Max Mara weekend)
- Premium leather biker jacket (butter-soft) + cashmere turtleneck + midi silk skirt with movement + suede ankle boots (Celine off-duty)
- Oversized luxury blazer (worn open) + draped jersey top + high-waisted culottes + The Row ballet flats (quiet power)
- Cashmere wrap cardigan + silk blouse + tailored wide-leg jeans (Japanese denim) + elegant loafers (Sezane brunch)

⚠️ NOT a pencil skirt, NOT a blazer-as-suit. ZERO connection to a courtroom.
⚠️ Do NOT default to jeans + sweater — elevate with silk, cashmere, and intentional proportions.
⚠️ Mix feminine silhouettes: wrap tops with tailored trousers, or midi skirts with knits — variety is key.
Delicate layered gold necklaces, one statement ring. Structured leather tote (Celine or Loewe level).

MOOD: Saturday morning in Cheongdam or the West Village. Walking to brunch at an impossible-to-book restaurant. Her weekend look makes other women screenshot her outfit. The casual is studied but never stiff.`,
  },
  doctor: {
    male: `Create the MOST STYLISH off-duty look for this man. He saves lives in scrubs all week — his weekend style should be just as impressive. NOT medical, NOT clinical — pure personal style.

FIRST, ANALYZE this man's body type, skin tone, and proportions from the photo.
Then choose the SINGLE most flattering combination from:
- Cashmere-wool overcoat + fine-gauge crewneck sweater + relaxed wool trousers + suede Chelsea boots (Loro Piana quiet wealth)
- Suede trucker jacket + merino polo + pressed dark chinos + polished leather sneakers (Italian weekend ease)
- Premium knit bomber + cashmere half-zip + tailored jogger-style trousers + clean premium sneakers (Zegna modern comfort)
- Unstructured wool blazer + oxford shirt (collar open) + straight-leg selvedge denim + penny loafers sockless (Brunello Cucinelli Saturday)

⚠️ NO scrubs, NO white coat, NO stethoscope, NO ID badge. ZERO connection to medicine.
⚠️ Do NOT default to basic jeans + hoodie — this man's casual should signal taste and quiet confidence.
One quality watch (sporty automatic, not dress). Quality sunglasses. Nothing more.

MOOD: Saturday morning walking through Garosugil or Greenwich Village. He could be a venture capitalist, an architect, or an art collector. Nothing loud — everything considered. The kind of off-duty that makes people wonder what he does for a living.`,
    female: `Create the MOST STYLISH off-duty look for this woman. She wears scrubs all week — her weekend style should be a revelation. NOT medical, NOT clinical — pure personal fashion.

FIRST, ANALYZE this woman's body type, skin tone, face shape, and proportions from the photo.
Then choose the SINGLE most flattering combination from:
- Structured cashmere coat + cashmere turtleneck + wide-leg wool trousers + pointed-toe ankle boots (Max Mara timeless)
- Butter-soft leather moto jacket + silk mock-neck + flowing midi skirt + suede mules (Celine off-duty chic)
- Premium oversized wool blazer + draped jersey wrap top + tailored culottes + The Row ballet flats (quiet luxury)
- Cashmere cardigan (draped) + silk camisole + high-waisted pressed trousers + elegant loafers + delicate pendant (Rouje everyday)

⚠️ NO scrubs, NO white coat, NO stethoscope, NO ID badge. ZERO connection to medicine.
⚠️ Do NOT default to jeans + sweater — elevate with silk, cashmere, and feminine proportions.
⚠️ Use a MIX of trousers and skirts/dresses — do NOT default to skirts only. Wide-leg trousers, tailored pants, and denim are equally feminine and stylish.
Delicate gold jewelry: thin chain necklace OR small hoops. Structured leather tote (Celine or Polene level).

MOOD: Weekend morning in Cheongdam or SoHo. She could be a gallerist, creative director, or fashion editor. Her weekend style is better than most people's best-dressed day. Nothing trendy — timeless. The kind of woman other women screenshot for outfit inspiration.`,
  },
  chef: {
    male: `Create the MOST STYLISH off-duty look for this man. He runs a kitchen all week — his weekend style should show the same creative eye. NOT a chef, NOT a cook — a man with taste in every sense.

FIRST, ANALYZE this man's body type, skin tone, and proportions from the photo.
Then choose the SINGLE most flattering combination from:
- Washed cotton chore coat + linen band-collar shirt + relaxed selvedge denim + woven leather loafers (artisan weekend in Itaewon)
- Cashmere crewneck + suede trucker jacket + cotton-linen chinos + clean white sneakers (Auralee effortless)
- Unstructured linen blazer + Breton stripe tee + relaxed wool trousers + suede desert boots (French Riviera casual)
- Premium knit zip-through + washed oxford shirt + straight-leg dark denim + polished leather sneakers (Nordic creative)

⚠️ NO chef jacket, NO apron, NO kitchen gear. ZERO connection to cooking.
⚠️ Do NOT default to basic T-shirt + jeans — this man's casual has creative intentionality.
Simple watch with canvas or leather strap. Quality sunglasses. One piece, nothing more.

MOOD: Saturday morning at a farmers market or a natural wine bar. He looks like he could own a ceramics studio or curate a design shop. Creative energy — comfortable, unhurried, the kind of man who makes simple things look considered.`,
    female: `Create the MOST STYLISH off-duty look for this woman. She runs a kitchen all week — her weekend style should show the same creative eye and love of beauty. NOT a chef — an artist with taste.

FIRST, ANALYZE this woman's body type, skin tone, face shape, and proportions from the photo.
Then choose the SINGLE most flattering combination from:
- Relaxed linen blazer + silk camisole + wide-leg linen trousers + woven leather sandals (French Riviera editorial)
- Premium cotton-cashmere cardigan + fitted Breton stripe tee + cotton midi skirt with drape + suede ballet flats (Sezane market morning)
- Washed cotton field jacket + linen button-down (sleeves rolled) + high-waisted straight-leg jeans + clean white sneakers (Auralee effortless)
- Draped knit wrap top + flowing midi skirt + delicate sandals + straw tote (Rouje coastal weekend)

⚠️ NO chef jacket, NO apron, NO kitchen gear. ZERO connection to cooking.
⚠️ Do NOT default to jeans + T-shirt — elevate with feminine textures and intentional combinations.
⚠️ Use a MIX of trousers and skirts/dresses — do NOT default to skirts only. Wide-leg trousers, tailored pants, and denim are equally feminine and stylish.
Delicate gold chain necklace, small hoops. Quality sunglasses. Straw basket tote or soft leather crossbody.

MOOD: Sunday morning at a coastal café or farmers market. She looks like she runs a food magazine or curates pop-up supper clubs. Effortlessly chic, creative, the kind of woman who makes simple things beautiful. Her Instagram is all natural light and impeccable taste.`,
  },
}

export function getWorkScenarios(_jobType: string): ScenarioConfig[] {
  // DEPRECATED: Work scenarios disabled as part of pivot to personal color platform
  return []
}

// ─── Trend Style Types ───────────────────────────────────────────

const trendDirectives: Record<string, { male: string; female: string }> = {
  street: {
    male: `STYLING BRIEF — MALE STREET FASHION, 2026
You are styling this man for a street-snap by a Dazed or i-D photographer. He should look like the most screenshotted person on Instagram today.

OUTFIT BUILD:
- LAYER 1: Heavyweight oversized washed cotton tee in faded tone OR boxy cut-and-sewn hoodie with raw seams. If printed, the graphic is vintage-feel, sun-bleached, NOT corporate. Drops past the hip. The cotton has WEIGHT — not flimsy.
- LAYER 2: Open workwear chore coat in washed canvas, unzipped nylon coach jacket, OR oversized flannel in faded plaid. Creates depth and shoulder width.
- BOTTOM: Wide-leg carpenter jeans (raw indigo or sun-bleached wash) OR military-surplus cargo pants with faded patches. The leg is WIDE — 22"+ opening. NOT skinny, NOT tapered.
- SHOES: Nike Dunk Low (vintage colorway), New Balance 550 (white/green), Asics Gel-Kayano 14, or Jordan 1 Low. Laced loosely, worn-in but clean.
- ACCESSORIES: Nylon crossbody micro bag, layered thin silver chains, washed 5-panel cap worn backwards. Nothing precious.

COLOR: Washed, sun-faded tones — stone grey, olive drab, cream, faded burgundy, washed-out navy. NEVER neon, never all-black. The palette looks like thrift-store gold.

MOOD: Harajuku meets Williamsburg meets Hongdae. He didn't "style" this — he grabbed it from a pile of perfectly curated pieces and it fell together. The proportions are the flex: huge top, wide leg, clean shoe. People cross the street to ask where he got the jacket.`,
    female: `STYLING BRIEF — FEMALE STREET FASHION, 2026
You are styling this woman for a street-snap by a Dazed or i-D photographer.

OUTFIT BUILD:
- LAYER 1: Cropped baby tee (tight, worn, vintage band logo) OR boxy graphic hoodie as a dress with bike shorts underneath. The top is either TINY or HUGE — no in-between.
- LAYER 2: Oversized washed denim trucker jacket (worn off one shoulder) OR cropped MA-1 bomber OR utility vest over the tee.
- BOTTOM: Super-wide cargo pants with zip pockets and belt detail OR baggy boyfriend jeans with raw hem rolled once OR pleated mini skirt + chunky knee-high socks.
- SHOES: Nike Dunk Low, New Balance 530 in silver, platform Dr. Martens, or Converse Chuck 70 hi-tops. Scuffed or pristine — both work.
- ACCESSORIES: Tiny crossbody bag or shoulder pouch, layered mismatched necklaces, baseball cap or bucket hat, small hoop earrings.

COLOR: Lived-in tones — faded indigo, dusty pink, cream, olive, washed black, sun-bleached white. One unexpected pop through a hat or bag.

MOOD: The girl every fashion blog wants to shoot. She makes $20 thrift finds look like runway. The proportions are everything: oversized top + tiny bottom, or fitted tee + massive pants. She doesn't care what you think — and that's why you can't stop looking.`,
  },
  hype: {
    male: `STYLING BRIEF — MALE HYPE / QUIET LUXURY STREETWEAR, 2026
You are styling this man for a Highsnobiety "Taste" editorial. 2026 hype is post-logo: the flex is in fabric weight, proportion, and knowing. No one can name the brand from across the room — but up close, everything costs $500+.

OUTFIT BUILD:
- TOP: Heavyweight boxy hoodie in garment-dyed earth tone — the cotton is 450gsm, the seams are flatlock, the drape is architectural. OR double-layered oversized tee with raw-cut hem. Zero logos. Tone-on-tone embroidery at most.
- BOTTOM: Wide-leg pleated wool trousers with deep drape (Lemaire or Auralee proportion) OR heavy French terry wide sweatpants with clean flat seaming. The fabric FALLS — with weight, with intention.
- SHOES: Bottega Veneta orbit sneaker, Sacai x Nike Cortez, Fear of God California, or Maison Margiela replica GAT in cream. Designer DNA, zero screaming.
- OUTER (optional): Oversized unlined cashmere topcoat thrown over shoulders OR quilted nylon vest.
- ACCESSORIES: Bottega-green intrecciato crossbody OR matte black sling, single silver ring, cashmere beanie.

COLOR: Rich muted tones — cement, washed espresso, bone white, fog grey, deep moss. STRICTLY monochromatic or tonal. The richness comes from fabric weight contrast: heavy cotton against light wool against smooth leather.

MOOD: Quiet wealth. He buys Rick Owens at retail and wears it like it's nothing. Every piece is "$400 basics" — the kind where you can feel the money in the hand-feel. He's not trying to impress anyone. That's what makes it devastating.`,
    female: `STYLING BRIEF — FEMALE HYPE / QUIET LUXURY STREETWEAR, 2026
You are styling this woman for a Highsnobiety editorial. The 2026 flex: no logos, immaculate fabric, devastating proportion.

OUTFIT BUILD:
- TOP: Oversized cashmere-blend hoodie in cream or charcoal (the kind you can feel across the room) OR fitted ribbed mock-neck in heavy-gauge knit. Zero branding. The quality speaks.
- BOTTOM: Wide-leg tailored wool trousers with center crease (Toteme proportion) OR straight-leg leather pants with matte finish OR structured midi cargo skirt in technical fabric.
- SHOES: Bottega Veneta lug-sole boots, Sacai platform hybrid, or Maison Margiela Replica in cream. Architectural but not costume.
- OUTER (optional): Oversized shearling in reversed lamb, oversized leather blazer, or long quilted coat.
- ACCESSORIES: Structured soft-leather mini bag (Bottega or Row), thin gold chain, slim sunglasses (Gentle Monster or Celine).

COLOR: All-cream, all-charcoal, all-black, or espresso-to-sand gradient. One texture story — suede next to cashmere next to leather. Never more than two tones.

MOOD: She looks like she owns the gallery, not visits it. Every piece costs more than most people's rent — and she wears it like pajamas. Quiet devastation. The Dover Street Market staff knows her by name.`,
  },
  'minimal-mz': {
    male: `STYLING BRIEF — MALE MINIMAL MZ / CLEAN GEN-Z, 2026
You are styling this man for a COS or Lemaire campaign. The concept: when you remove everything unnecessary, what remains is perfect.

OUTFIT BUILD:
- TOP: Oversized crew-neck in boiled wool or heavy cotton jersey — the shoulder seam drops 4cm past the natural shoulder. Clean, no detail, no logo. OR ribbed half-zip mock-neck in fine merino. The fabric is matte, dense, beautiful.
- BOTTOM: Wide straight-leg trousers — pressed center crease, full length, clean break at the shoe. Premium wool-blend or heavy cotton drill. The leg opening is wide enough to create a column silhouette.
- SHOES: Maison Margiela German Army Trainer (white), Common Projects Original Achilles, suede Lemaire loafers, or square-toe Chelsea boots. Clean, architectural.
- OUTER (optional): Unstructured wool overcoat (below knee, no padding, collarless or minimal lapel) OR oversized single-button blazer in matching tone. Always open, never buttoned.
- ACCESSORIES: Nothing. Maybe a leather tote. Maximum one thin ring. The outfit IS the accessory.

COLOR: HEAD-TO-TOE TONAL. Oatmeal + cream + warm white. OR charcoal + black + slate. OR camel + sand + biscuit. NEVER more than one color family. Zero prints, zero patterns. Texture difference is the only variation: knit vs woven, matte vs subtle sheen.

MOOD: A Tadao Ando building in human form. He owns 25 pieces of clothing and each one was selected over six months. The silhouette is a single unbroken line from shoulder to shoe. Architects stop him on the street. This is minimalism practiced as a religion.`,
    female: `STYLING BRIEF — FEMALE MINIMAL MZ / CLEAN GEN-Z, 2026
You are styling this woman for a Toteme or The Row lookbook. Silence is the loudest statement.

OUTFIT BUILD:
- TOP: Oversized blazer in premium wool (sleeves pushed up to show wrists) OR fine-gauge fitted turtleneck that traces the collarbones. OR structured square-shoulder crop top in dense cotton. Every edge is clean, every seam vanishes.
- BOTTOM: Ultra-wide high-waist trousers — pressed crease, full length, dramatic drape. The width is bold but the fabric controls it — heavy wool or stiff cotton that holds its shape. OR tailored midi skirt with a single back slit.
- SHOES: Square-toe kitten-heel mules, white leather sneakers, or minimal ankle boots in smooth leather.
- OUTER (optional): Floor-length tailored coat in camel, pale grey, or cream. Worn draped over shoulders like a cape.
- ACCESSORIES: One structured leather bag (The Row Margaux style). Delicate gold chain, barely visible. Small gold hoops. That's all.

COLOR: MONOCHROME TONAL. Cream + ivory + white in different textures. Black + charcoal + slate in different weights. Camel + sand + oat. One color, three textures: knit against woven against leather. The sophistication is in what you DON'T add.

MOOD: She is a Copenhagen apartment in human form — light, space, intention. People stare because the proportions are so quiet they're loud. The blazer oversized, the trouser wide, the shoe pointed — three clean lines that form a perfect composition. She doesn't follow trends. She makes them feel unnecessary.`,
  },
  sporty: {
    male: `STYLING BRIEF — MALE SPORTY / GORPCORE LUXE, 2026
You are styling this man for an Arc'teryx x Zegna collaboration lookbook. The concept: technical performance elevated to luxury. He summits AND brunches.

OUTFIT BUILD:
- TOP: Technical half-zip mock-neck in bonded performance fabric with a visible water-repellent sheen — the kind with heat-sealed seams and laser-cut ventilation. OR a clean tech-wool hoodie with flatlock stitching. The fabric screams engineering.
- BOTTOM: Slim tapered technical pants with hidden zip pockets, articulated knees, and DWR coating. NOT joggers — these are hiking-inspired trousers with a clean silhouette. Think Veilance or Acronym.
- SHOES: Salomon XT-6 Expanse (earth tone), On Cloudventure Peak, Nike ACG Mountain Fly, or New Balance XRCT. The shoe is the centerpiece — technical, sculptural, current.
- OUTER (optional): Ultralight packable down vest, Gore-Tex shell in matte finish, or fleece-lined softshell.
- ACCESSORIES: Garmin or Suunto sport watch, merino running buff around neck, minimal technical sling pack.

COLOR: Earth-tech palette — stone + olive + sand (gorpcore) OR black + charcoal + one reflective accent (urban tech) OR navy + burnt orange detail (trail running). The palette belongs in both the mountains and the city.

MOOD: He runs trail races on weekends and closes deals on Monday. The half-zip cost more than some suits. The shoes have never seen a gym — they've seen summits, city streets, and the best coffee shop in the neighborhood. Performance is his aesthetic, not his costume.`,
    female: `STYLING BRIEF — FEMALE SPORTY / ATHLEISURE LUXE, 2026
You are styling this woman for an On Running x Loewe collaboration editorial. Premium athleisure that belongs in a gallery.

OUTFIT BUILD:
- TOP: Cropped performance zip-through jacket in sculpted stretch fabric (clean, not shiny) OR a fitted long-sleeve mock-neck in technical merino. Premium details: bonded seams, hidden thumb holes, invisible zip.
- BOTTOM: High-waist sculpt leggings in matte dark tone with minimal seaming (NOT glossy, not see-through) OR wide-leg technical track pants with a pressed crease and side-snap detail.
- SHOES: On Cloudmonster (current color), Nike V2K Run in cream/silver, Hoka Bondi 8 in tonal neutral, or New Balance 9060 in earth tone. FRESH — box-new energy.
- OUTER (optional): Oversized cropped puffer in matte nylon, lightweight shell jacket rolled at sleeves, or cashmere zip vest.
- ACCESSORIES: Slim sport watch with interchangeable band, titanium sunglasses, micro belt bag in tech fabric, hair in effortless high bun or slicked pony.

COLOR: Elevated sport — all-black with one sage accent, cream + tan monochrome, charcoal + soft blush detail, or navy + white. NEVER loud gym colors. The palette is fashion, not fitness.

MOOD: She just finished a 5AM Pilates reformer class and she's heading to a branding meeting without changing. The leggings cost $180 and look like $180. The jacket is an object of desire. She moves through the city like she owns the sidewalk — because in those shoes, she does.`,
  },
  retro: {
    male: `STYLING BRIEF — MALE RETRO / NEO-VINTAGE, 2026
You are styling this man for a "Golden Era Redux" editorial. NOT costume — this is 70s soul, 80s swagger, and 90s nonchalance filtered through the eye of a 2026 stylist who studied at Central Saint Martins.

OUTFIT BUILD:
- TOP: Sun-faded vintage tee (retro sports logo, old-school band, or 70s typeface) tucked lazily into high-waist pants. OR a fitted knit polo with contrast tipping. OR a washed corduroy overshirt, unbuttoned, sleeves rolled, over a ribbed tank.
- BOTTOM: High-waist straight-leg jeans in vintage wash with slight flare at the ankle (70s) OR pressed wide-leg pleated chinos in tobacco or cream (80s) OR relaxed corduroy trousers (90s). The rise is HIGH — belly button, not hip.
- SHOES: Adidas Samba OG (gum sole), New Balance 574 (classic grey), Onitsuka Tiger Mexico 66, or polished penny loafers. Worn-in but loved.
- OUTER (optional): Cropped wool varsity jacket with leather sleeves, washed suede trucker, or oversized vintage leather bomber.
- ACCESSORIES: Aviator sunglasses with amber lenses, woven leather belt, analog dive watch on NATO strap, vintage-look canvas tote.

COLOR: Kodachrome warmth — burnt sienna, mustard gold, tobacco brown, faded burgundy, cream, washed indigo. Everything looks like it's been loved for 30 years. No sharp colors — everything soft, warm, golden.

MOOD: He's the guy your favorite director would cast as "the cool one." Part Paul Newman, part young Tarantino, part indie record store owner. Every piece tells a story. Nothing is new — but everything is chosen. He drinks coffee from a ceramic mug and doesn't own a smartwatch.`,
    female: `STYLING BRIEF — FEMALE RETRO / NEO-VINTAGE, 2026
You are styling this woman for a "Golden Era Redux" editorial — Jane Birkin's ease, 90s Kate Moss edge, Y2K Chloe Sevigny fun.

OUTFIT BUILD:
- TOP: Cropped vintage band tee knotted at the ribs OR 70s wrap blouse in muted floral/paisley OR fitted ribbed cardigan buttoned all the way up as a top (the Audrey Hepburn move).
- BOTTOM: High-waist flared jeans in warm vintage wash with raw hem (70s icon) OR pressed wide-leg pleated trousers in cream or tobacco (80s power) OR micro mini skirt + knee-high suede boots (Y2K revival).
- SHOES: Platform leather sandals, Adidas Samba, Converse Chuck 70 hi-tops, or knee-high tan suede boots. Each shoe references a specific decade.
- OUTER (optional): Oversized vintage leather moto jacket (broken in), cropped faux-shearling, or a 70s-cut suede fringe jacket.
- ACCESSORIES: Cat-eye tortoiseshell sunglasses, silk scarf tied in hair or at neck, chunky gold hoops, vintage chain belt, small structured bag (YSL sac de jour energy).

COLOR: Golden nostalgia — terracotta, mustard, vintage rose, faded chocolate, warm cream, washed indigo. The palette should feel like afternoon sunlight through a Polaroid. Warm, golden, never cool.

MOOD: She's the muse that fashion photographers chase across continents. Part Bardot, part PJ Harvey, part the girl at the record fair who knows more about Bowie than you do. Every piece could be genuine 1978 deadstock or a perfect 2026 remake. The magic is you can't tell.`,
  },
  'avant-garde': {
    male: `STYLING BRIEF — MALE AVANT-GARDE / DARK ARCHITECTURE, 2026
You are styling this man for an AnOther Magazine editorial. The brief: Rick Owens, Yohji Yamamoto, and Ann Demeulemeester had a child, and he dresses himself.

OUTFIT BUILD:
- TOP: Asymmetric draped jersey top with one seam that spirals around the torso. OR deconstructed oversized shirt — one placket removed, raw edges, buttons half-undone. OR structured high-neck base layer in ribbed black wool under a looser sheer outer layer. Fabric is HEAVY — boiled wool, waxed cotton, or thick jersey that holds a shape.
- BOTTOM: Ultra-wide trousers that pool at the shoe — Yohji-width, 30"+ leg opening, in heavy black wool or stiff cotton drill. OR drop-crotch trousers in coated denim. The fabric has BODY — it doesn't cling, it DRAPES.
- SHOES: Rick Owens Geobasket boots, Margiela Tabi boots (split toe), or angular platform combat boots. The shoe is a sculpture. Black leather, aggressive sole.
- OUTER: Floor-length deconstructed overcoat — asymmetric closure, no buttons, wraps like a robe. OR oversized biker jacket with exposed hardware. OR draped blanket-cape in heavy wool.
- ACCESSORIES: One silver ring with geometric form. A leather wrist cuff. Nothing else. The silhouette IS the accessory.

COLOR: BLACK — but seven different blacks. Matte charcoal-black wool against high-shine leather against washed faded-black cotton against sheer black mesh. If not all-black: black + bone white for violent contrast, or black + ash grey for depth. NEVER color.

MOOD: He walks into a gallery and people think he's the installation. The silhouette is inhuman — wide, flowing, dark, moving. Fabric catches air when he turns corners. Every proportion challenges what "clothing" means. This isn't dressing — it's architecture worn on the body. He doesn't follow fashion. Fashion observes him and takes notes.`,
    female: `STYLING BRIEF — FEMALE AVANT-GARDE / DARK ARCHITECTURE, 2026
You are styling this woman for an AnOther Magazine editorial. Rei Kawakubo's discipline, Yohji's romance, Rick Owens' aggression.

OUTFIT BUILD:
- TOP: Sculptural asymmetric top with one exaggerated shoulder or a wrapped construction that defies gravity. OR a fitted second-skin base layer under an oversized deconstructed piece. The fabric is dramatic — heavy crepe, boiled wool, stiff organza, or crinkled taffeta.
- BOTTOM: Floor-sweeping wide palazzo trousers in heavy black wool OR a sculptural pleated skirt with dramatic volume that moves independently of the body OR layered asymmetric panels — skirt over trousers.
- SHOES: Rick Owens wedge platforms, Margiela Tabi boot (the heel version), or sculptural ankle boots with an architectural heel. The shoe is the foundation of the silhouette.
- OUTER: Cocoon-shaped coat with no visible closure OR deconstructed trench with raw-cut edges and missing collar OR a cape-like draped piece that could be a blanket or a coat — you genuinely can't tell.
- ACCESSORIES: One single statement — an oversized oxidized silver cuff, or one dramatic earring on one ear. Asymmetry in everything, including accessories.

COLOR: Seven blacks. Crushed velvet black, matte wool black, high-shine patent black, sheer organza black, washed cotton black, coated denim black. If not black: bone white as a slash of contrast, or blood-red as a single liner visible only when she moves. NEVER prints. NEVER patterns.

MOOD: She doesn't enter rooms — she alters them. People study her the way they study Brutalist buildings: with awe and slight unease. Every fold is a thesis statement. Every asymmetric hem is a philosophical position. When she walks, the fabric catches air and creates shapes that didn't exist a moment ago. This is Comme des Garcons made flesh. She doesn't follow trends — trends file restraining orders against her.`,
  },
}

export function getTrendScenarios(_trendType: string): ScenarioConfig[] {
  // DEPRECATED: Trend scenarios disabled as part of pivot to personal color platform
  return []
  /* Original implementation kept for reference
  const trend = trendDirectives[_trendType]
  if (!trend) return getTrendScenarios('street')

  return [
    {
      id: 'trend-signature',
      labelKo: '시그니처 룩', labelEn: 'Signature Look', labelJa: 'シグネチャー', labelZh: '标志性造型', labelEs: 'Look Signature',
      directiveMale: `${trend.male}\n\nSTYLE: SIGNATURE — The definitive version of this trend. The most recognizable, iconic look that captures the essence of this style.`,
      directiveFemale: `${trend.female}\n\nSTYLE: SIGNATURE — The definitive version of this trend. The most recognizable, iconic look that captures the essence of this style.`,
    },
    {
      id: 'trend-elevated',
      labelKo: '엘리베이티드', labelEn: 'Elevated', labelJa: 'エレベーテッド', labelZh: '高级版', labelEs: 'Elevado',
      directiveMale: `${trend.male}\n\nSTYLE: ELEVATED — The premium, grown-up version. Higher quality pieces, more refined proportions, subtle luxury touches while keeping the trend DNA.`,
      directiveFemale: `${trend.female}\n\nSTYLE: ELEVATED — The premium, grown-up version. Higher quality pieces, more refined proportions, subtle luxury touches while keeping the trend DNA.`,
    },
    {
      id: 'trend-everyday',
      labelKo: '데일리 버전', labelEn: 'Everyday', labelJa: 'エブリデイ', labelZh: '日常版', labelEs: 'Cotidiano',
      directiveMale: `${trend.male}\n\nSTYLE: EVERYDAY WEARABLE — The toned-down daily version. Accessible and comfortable, keeping the spirit of the trend without going all-in. Something you'd actually wear to work or school.`,
      directiveFemale: `${trend.female}\n\nSTYLE: EVERYDAY WEARABLE — The toned-down daily version. Accessible and comfortable, keeping the spirit of the trend without going all-in. Something you'd actually wear to work or school.`,
    },
    {
      id: 'trend-bold',
      labelKo: '볼드 에디션', labelEn: 'Bold Edition', labelJa: 'ボールド', labelZh: '大胆版', labelEs: 'Edición Audaz',
      directiveMale: `${trend.male}\n\nSTYLE: BOLD STATEMENT — The maximum expression. Push the boundaries of this trend. More daring combinations, statement pieces, head-turning proportions. For someone who wants to stand out.`,
      directiveFemale: `${trend.female}\n\nSTYLE: BOLD STATEMENT — The maximum expression. Push the boundaries of this trend. More daring combinations, statement pieces, head-turning proportions. For someone who wants to stand out.`,
    },
  ]
  */
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

/**
 * Build edit prompt specifically for work uniform/scrub generation.
 * Stripped of fashion-brand rules and color restrictions that don't apply to uniforms.
 * Used by generate-work-styles.ts.
 */
export function buildWorkEditPrompt(opts: {
  directive: string
  gender: string
  silhouetteGuide: string
}): string {
  const { directive, gender, silhouetteGuide } = opts
  const genderWord = gender === 'female' ? 'woman' : 'man'

  return `You are a professional photographer specializing in editorial portraits for medical and professional publications.

⚠️ FACE IDENTITY LOCK — HIGHEST PRIORITY ⚠️
This is NOT a generation task. This is a CLOTHING SWAP on an EXISTING photo.
- The person's FACE must remain 100% IDENTICAL to the input — same eyes, nose, mouth, jawline, skin texture, facial hair, makeup, expression
- Do NOT regenerate, redraw, or reinterpret the face in ANY way
- The face must be a PIXEL-LEVEL COPY from the original photo
- ZERO tolerance for face changes

YOUR TASK: ONLY change the CLOTHING on this person. Keep everything else identical.

SCENARIO DIRECTIVE:
${directive}

CRITICAL: This is a ${genderWord}. The outfit MUST be appropriate for a ${genderWord}.

PERSONAL COLOR ANALYSIS — USE THE PHOTO:
- Study this person's ACTUAL skin undertone, hair color, and eye color from the input photo
- Choose the uniform/outfit color that creates the most FLATTERING effect on THIS specific person
- The right color should make their skin look healthy and vibrant, NOT washed out
- Trust your analysis — there is no "default" color. Every person has different ideal colors.
${silhouetteGuide}

${getBeautyRetouch(gender)}

${FOCUS_RULES}

${BACKGROUND_ENHANCEMENT}

${INPAINTING_RULES}

${BODY_PRESERVATION}

${ABSOLUTE_REQUIREMENTS}

This is a clothing REPLACEMENT task for the MAIN PERSON only.
Keep the person's HEAD and FACE at the EXACT same position and size.
The clothes should naturally fit the existing body shape.
DO NOT generate full body if original only shows partial body.
DO NOT zoom in, crop, or shift the frame in ANY way.

⚠️ FINAL CHECK before outputting:
1. Is the HEAD fully visible with same space above? If not → REDO
2. Is the FACE identical to the input? If not → REDO
3. Is the framing/zoom IDENTICAL to input? If not → REDO

Generate the edited photo with PIXEL-PERFECT IDENTICAL composition to the input.`
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
    ? 'This is a WOMAN. The outfit MUST be feminine and stylish. Use a MIX of trousers, blazers, blouses, knits, dresses, and skirts — NOT only skirts/dresses. Tailored trousers with a feminine top are equally beautiful. Adapt the style to her body type.'
    : 'This is a MAN. The outfit MUST be masculine and designed for men. Use suits, shirts, masculine jackets, pants - NOT women\'s clothing.'

  return `You are the world's top personal stylist. Your job is to dress this person in the PERFECT outfit that complements their unique skin tone, face shape, and body proportions.

BRAND MOOD DIRECTIVE:
${brandDirective}

STYLING APPROACH — PROFESSIONAL PERSONAL COLOR ANALYSIS:
- Diagnose the person's seasonal color type from their skin undertone:
  * SPRING WARM (golden, peachy glow): Coral, warm peach, cream, light camel — vivid warm radiance
  * SUMMER COOL (pink, delicate): Lavender, dusty rose, powder blue, mauve — muted cool elegance
  * AUTUMN WARM (deep golden/olive): Terracotta, olive, mustard, burgundy, forest green — rich depth
  * WINTER COOL (high contrast, clear): Cobalt, emerald, magenta, true red, black, white — bold clarity
- The specified color palette is a SUGGESTION — shift to match this person's seasonal color type
- Quality fabrics with natural texture and drape — cashmere, silk, fine wool, supple leather
- Avoid overly theatrical or costume-like outfits — keep it realistic, modern, and luxurious
${gender === 'male' ? '- Relaxed, comfortable silhouette — NOT tight, NOT skinny fit\n- Trousers with comfortable straight-leg or slightly wide drape, jackets with soft natural shoulders\n- Mix of relaxed tailored fit and easy casual fit — modern men prefer comfort over constriction' : '- Use a MIX of feminine clothing — tailored trousers, wide-leg pants, blouses, knits, dresses, skirts\n- Do NOT default to only skirts/dresses — trousers are equally feminine and stylish\n- Emphasize waist definition, quality fabrics, elegant proportions\n- Think Reformation, Rouje, Sezane, The Row — modern feminine with variety\n- Include heels, mules, flats, or clean sneakers depending on the look'}

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
Keep the person's HEAD and FACE at the EXACT same position and size.
The ${genderWord}'s clothes should naturally fit the existing body shape.
DO NOT generate full body if original only shows partial body.
DO NOT zoom in, crop, or shift the frame in ANY way.

⚠️ FINAL CHECK before outputting:
1. Is the HEAD fully visible with same space above? If not → REDO
2. Is the FACE identical to the input? If not → REDO
3. Is the framing/zoom IDENTICAL to input? If not → REDO

Generate the edited photo with PIXEL-PERFECT IDENTICAL composition to the input.`
}
