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
1. FACE IDENTITY: The face must be an EXACT COPY of the input — same person, same features, same expression. If the output face looks like a DIFFERENT PERSON, the result is FAILED
2. NEVER CROP OR ZOOM - output must have IDENTICAL framing as input
3. NEVER change aspect ratio - if input is portrait, output is portrait
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
- SUIT: Power suit — fitted single-breasted blazer with defined waist, clean shoulder, and modern proportion. Premium wool gabardine or silk-wool blend that photographs like liquid. Slightly cropped blazer with high-waist wide trousers, OR longer blazer with a midi pencil skirt with back slit.
- TOP: Silk charmeuse blouse in a tonal complement, or a structured silk camisole that shows at the neckline. The fabric catches light beautifully.
- TROUSERS: Wide-leg or straight, full-length with clean pressed crease. OR midi pencil skirt — the kind that requires precision tailoring.
- SHOES: Pointed-toe pumps in polished leather (80mm), elegant slingbacks, or refined suede loafers.
- ACCESSORIES: Quality timepiece or thin gold bangle. Structured leather document bag. Small gold earrings — studs or delicate hoops.

COLOR: Warm skin → rich navy, deep camel, chocolate, warm tobacco. Cool skin → charcoal, cool navy, blue-grey, deep wine. The right color makes black look lazy.

MOOD: She walks into the courtroom and the temperature changes. Not loud — devastating. The suit fits like it was built on her body. The silk catches the light when she gestures. The shoes click with authority. She argues constitutional law in the morning and attends gallery openings at night. This is a woman for whom power is not performed — it's inherent.`
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
⚠️ STRONGLY prefer dresses, skirts, and feminine silhouettes when they flatter this body type.
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
⚠️ STRONGLY prefer feminine silhouettes: wrap tops, midi skirts, flowing trousers.
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
⚠️ STRONGLY prefer dresses, skirts, and flowing silhouettes when they flatter this body type.
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
⚠️ STRONGLY prefer dresses, skirts, and flowing silhouettes when they flatter this body type.
Delicate gold chain necklace, small hoops. Quality sunglasses. Straw basket tote or soft leather crossbody.

MOOD: Sunday morning at a coastal café or farmers market. She looks like she runs a food magazine or curates pop-up supper clubs. Effortlessly chic, creative, the kind of woman who makes simple things beautiful. Her Instagram is all natural light and impeccable taste.`,
  },
}

export function getWorkScenarios(jobType: string): ScenarioConfig[] {
  const job = workDirectives[jobType]
  if (!job) return getWorkScenarios('doctor') // fallback

  // FRAMING rule injected into every work scenario to prevent head cropping
  const FRAMING = `\n\nFRAMING RULE (CRITICAL): The output image MUST have the EXACT same framing and composition as the input photo. Do NOT zoom in on the torso. Do NOT crop the head. The person's head must have the same amount of space above it as the original. If the input shows full body, output shows full body. If input shows head-to-waist, output shows head-to-waist. ZERO framing changes allowed.`

  // Strip the hardcoded COLOR paragraph from base prompts so each scenario's strategy fully controls color
  // Matches both "COLOR:" and "COLOR MUST BE..." formats, stops at next paragraph break
  const stripColor = (text: string) => text.replace(/\n\nCOLOR[^\n]*(?:\n(?!\n)[^\n]*)*/g, '')

  const offDuty = offDutyDirectives[jobType] || offDutyDirectives._default

  return [
    {
      id: 'work-signature',
      labelKo: '나에게 맞는 컬러', labelEn: 'My Best Shade', labelJa: '私に似合う色', labelZh: '最适合我的色调', labelEs: 'Mi Mejor Tono',
      directiveMale: `${stripColor(job.male)}${FRAMING}\n\nCOLOR STRATEGY — BEST COLOR:
You are the head stylist at Loro Piana. Analyze this person's skin undertone, hair color, and eye color from the photo.
Choose the ONE color that makes this person's face look the most vibrant and alive — the shade where their skin GLOWS.
Think like a luxury brand colorist: consider Loro Piana's cashmere tones, Brunello Cucinelli's earth palette, Hermès seasonal shades.
You have COMPLETE FREEDOM — do not default to safe navy or grey. Trust your eye. The right color might be unexpected.
The goal: this person sees themselves and says "I've never looked this good."`,
      directiveFemale: `${stripColor(job.female)}${FRAMING}\n\nCOLOR STRATEGY — BEST COLOR:
You are the head stylist at Loro Piana. Analyze this person's skin undertone, hair color, and eye color from the photo.
Choose the ONE color that makes this person's face look the most vibrant and alive — the shade where their skin GLOWS.
Think like a luxury brand colorist: consider Loro Piana's cashmere tones, Brunello Cucinelli's earth palette, Hermès seasonal shades.
You have COMPLETE FREEDOM — do not default to safe navy or grey. Trust your eye. The right color might be unexpected.
The goal: this person sees themselves and says "I've never looked this good."`,
    },
    {
      id: 'work-contrast',
      labelKo: '대담한 대안', labelEn: 'Bold Alternative', labelJa: '大胆な選択', labelZh: '大胆替代', labelEs: 'Alternativa Audaz',
      directiveMale: `${stripColor(job.male)}${FRAMING}\n\nCOLOR STRATEGY — CONTRAST COLOR:
You are the creative director at Bottega Veneta. Analyze this person's skin undertone from the photo.
Now choose a BOLD, STRIKING color that CONTRASTS with their natural coloring — the shade that makes them impossible to ignore.
⚠️ THIS MUST BE A COMPLETELY DIFFERENT COLOR FAMILY from what a typical stylist would choose.
If the obvious choice would be navy → go deep burgundy. If grey → go forest green. If blue → go rich chocolate or plum.
Think runway, not boardroom. Think the color that makes people say "that's an incredible shade."
The result must be OBVIOUSLY VISUALLY DIFFERENT from the Best Color result — a totally different part of the color wheel.`,
      directiveFemale: `${stripColor(job.female)}${FRAMING}\n\nCOLOR STRATEGY — CONTRAST COLOR:
You are the creative director at Bottega Veneta. Analyze this person's skin undertone from the photo.
Now choose a BOLD, STRIKING color that CONTRASTS with their natural coloring — the shade that makes them impossible to ignore.
⚠️ THIS MUST BE A COMPLETELY DIFFERENT COLOR FAMILY from what a typical stylist would choose.
If the obvious choice would be navy → go deep burgundy. If grey → go emerald. If blue → go rich chocolate or plum.
Think runway, not boardroom. Think the color that makes people say "that's a stunning shade."
The result must be OBVIOUSLY VISUALLY DIFFERENT from the Best Color result — a totally different part of the color wheel.`,
    },
    {
      id: 'work-harmony',
      labelKo: '소프트 톤', labelEn: 'Soft Tonal', labelJa: 'ソフトトーン', labelZh: '柔和色调', labelEs: 'Tono Suave',
      directiveMale: `${stripColor(job.male)}${FRAMING}\n\nCOLOR STRATEGY — SOFT TONAL:
You are the personal colorist at Brunello Cucinelli. Analyze this person's skin tone and hair color from the photo.
Choose a color from the SAME tonal family as their natural coloring — creating a soft, monochromatic, head-to-toe cohesive effect.
The outfit should feel like it was custom-dyed to match this person — skin, hair, and clothes flow as ONE seamless tonal palette.
Think Cucinelli's signature: ivory, oatmeal, soft stone, warm camel, dusty taupe, muted sage. The colors of nature and cashmere.

FIT — THIS IS CRITICAL AND MUST BE VISIBLY DIFFERENT FROM THE OTHER CARDS:
The fit MUST be NOTICEABLY more relaxed and loose than the other variations. This is NOT a subtle change.
- For scrubs/uniforms: Use OVERSIZED boxy top (1-2 sizes up), jogger-style tapered pants with elastic cuffs (NOT straight-leg). The silhouette should look distinctly modern and comfortable.
- For suits/formal: Use an OVERSIZED unstructured blazer (dropped shoulders, longer length), wide-leg flowing trousers. Think The Row or Lemaire — architectural ease.
- The viewer should IMMEDIATELY see that this fit is looser and more relaxed than the other cards.

⚠️ This MUST look DISTINCTLY DIFFERENT from both My Best Shade and Bold Alternative — softer color AND visibly relaxed oversized fit.`,
      directiveFemale: `${stripColor(job.female)}${FRAMING}\n\nCOLOR STRATEGY — SOFT TONAL:
You are the personal colorist at Brunello Cucinelli. Analyze this person's skin tone and hair color from the photo.
Choose a color from the SAME tonal family as their natural coloring — creating a soft, monochromatic, head-to-toe cohesive effect.
The outfit should feel like it was custom-dyed to match this person — skin, hair, and clothes flow as ONE seamless tonal palette.
Think Cucinelli's signature: ivory, oatmeal, soft stone, warm camel, dusty taupe, muted sage, off-white. The colors of nature and cashmere.

FIT — THIS IS CRITICAL AND MUST BE VISIBLY DIFFERENT FROM THE OTHER CARDS:
The fit MUST be NOTICEABLY more relaxed and loose than the other variations. This is NOT a subtle change.
- For scrubs/uniforms: Use OVERSIZED boxy top (1-2 sizes up), jogger-style tapered pants with elastic cuffs (NOT straight-leg). The silhouette should look distinctly modern and comfortable.
- For suits/formal: Use an OVERSIZED unstructured blazer (dropped shoulders, longer length), wide-leg flowing trousers or midi skirt with movement. Think The Row or Lemaire — architectural ease.
- The viewer should IMMEDIATELY see that this fit is looser and more relaxed than the other cards.

⚠️ This MUST look DISTINCTLY DIFFERENT from both My Best Shade and Bold Alternative — softer color AND visibly relaxed oversized fit.`,
    },
    {
      id: 'work-offduty',
      labelKo: '출퇴근 룩', labelEn: 'Off-Duty Commute', labelJa: '通勤スタイル', labelZh: '通勤穿搭', labelEs: 'Look de Ida al Trabajo',
      directiveMale: `${offDuty.male}${getSeasonGuide()}${FRAMING}`,
      directiveFemale: `${offDuty.female}${getSeasonGuide()}${FRAMING}`,
    },
  ]
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

export function getTrendScenarios(trendType: string): ScenarioConfig[] {
  const trend = trendDirectives[trendType]
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

⚠️ FACE IDENTITY LOCK — HIGHEST PRIORITY ⚠️
This is NOT a generation task. This is a CLOTHING SWAP on an EXISTING photo.
- The person's FACE must remain 100% IDENTICAL to the input — same eyes, nose, mouth, jawline, skin texture, facial hair, makeup, expression
- Do NOT regenerate, redraw, or reinterpret the face in ANY way
- The face must be a PIXEL-LEVEL COPY from the original photo
- If you cannot preserve the face exactly, return the original photo unchanged rather than altering the face
- ZERO tolerance for face changes: even subtle smoothing, reshaping, or aging/de-aging is FORBIDDEN unless specified in beauty retouch below

YOUR TASK: ONLY change the CLOTHING on this person. Analyze their body type, skin tone, and proportions, then dress them in the PERFECT outfit.

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
