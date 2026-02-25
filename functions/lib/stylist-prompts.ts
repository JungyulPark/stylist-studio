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
    male: `STYLING BRIEF — MALE DOCTOR
You are styling a doctor for a premium hospital brand photoshoot.

OUTFIT SPEC:
- TOP: Short-sleeve V-neck scrub top. The fabric has a subtle 4-way stretch with matte sheen — like lululemon meets medical wear. Slim athletic cut that follows the torso without being tight. Clean topstitching details at shoulder seams.
- BOTTOM: Scrub jogger pants with tapered ankle and elastic cuff. Sits at the hip. The drape is clean — not a wrinkle, not a bunch. Think tailored sweatpant.
- SHOES: Pristine white minimalist leather sneakers with a clean sole (no chunky platform). Immaculate.
- ACCESSORIES: Stethoscope draped naturally around the neck. One simple watch.

COLOR DIRECTION: Read this person's skin undertone carefully. For warm undertones → deep teal, burgundy-wine, or warm charcoal. For cool undertones → slate blue, steel grey, or deep navy. The scrub color should make their face GLOW.

MOOD: He looks like the doctor you'd request by name. Quietly confident. The uniform fits like it was custom-made. Magazine-quality.`,
    female: `STYLING BRIEF — FEMALE DOCTOR
You are styling a female doctor for a premium hospital brand photoshoot.

OUTFIT SPEC:
- TOP: Short-sleeve V-neck or mandarin-collar scrub top. Feminine darted fit that defines the waist without being tight. Premium 4-way stretch fabric with soft matte finish. Subtle princess seaming for shape.
- BOTTOM: Scrub jogger pants — tapered ankle, mid-rise, with a clean drape that flatters the leg line. OR slim straight-leg scrub pants.
- SHOES: Clean white leather sneakers or white slip-on mules. Spotless.
- ACCESSORIES: Stethoscope draped naturally. Minimal jewelry — small studs or thin bracelet only.

COLOR DIRECTION: Read this person's skin tone, undertone, and hair color. For warm skin → dusty rose, sage green, warm wine, or caramel-toned khaki. For cool skin → ceil blue, soft lavender-grey, cool navy, or icy mint. The color should illuminate her complexion.

MOOD: She walks into the ward and everyone notices. Not because she's trying — because the fit, the color, and the confidence are perfect. She looks like she belongs on the cover of a medical fashion editorial.`
  },
  dentist: {
    male: `STYLING BRIEF — MALE DENTIST
You are styling a dentist for a high-end aesthetic dental clinic's brand imagery.

OUTFIT SPEC:
- TOP: Clean-line short-sleeve scrub top with a modern crew or henley neckline. No V-neck — dentists need a higher neckline for close-contact work. Slim tailored fit, premium performance fabric with subtle texture.
- BOTTOM: Slim tapered scrub pants. Clean front, no cargo. Jogger cuff OR clean straight hem. Sharp crease optional.
- SHOES: White minimalist sneakers — leather upper, thin sole. Clinical-clean aesthetic.

COLOR DIRECTION: Dental clinics are white-on-white environments, so the scrubs need to stand out with quiet sophistication. Read this person's skin tone: warm → charcoal, deep olive, muted terracotta. Cool → steel blue, slate, cool grey. Pure white scrubs also work if the person has high-contrast coloring (dark hair + light skin or vice versa).

MOOD: A premium Gangnam or Beverly Hills aesthetic dentist. Everything is precise, intentional, immaculate. The patient trusts him the moment he walks in.`,
    female: `STYLING BRIEF — FEMALE DENTIST
You are styling a female dentist for a high-end aesthetic dental clinic's brand imagery.

OUTFIT SPEC:
- TOP: Modern fitted scrub top — crew neck or subtle wrap-front. Clean feminine tailoring with flattering bust darts. Premium matte fabric. Short sleeve with a slightly cropped proportion that sits at the hip.
- BOTTOM: Tapered scrub jogger or slim ankle-length pants. High enough waist to look polished when bending.
- SHOES: Clean white leather slip-ons or minimal sneakers. Pristine.

COLOR DIRECTION: She works in a white-on-white clinic, so the color must complement her face at close range (patients stare at her all day). Warm skin → soft sage, muted blush, warm sand. Cool skin → powder blue, lavender-grey, cool white. Avoid anything too dark or heavy — dental setting demands lightness.

MOOD: Patients choose this clinic partly because she makes them feel at ease. Polished, precise, effortlessly chic. Think the dentist that beauty editors recommend.`
  },
  nurse: {
    male: `STYLING BRIEF — MALE NURSE
You are styling a nurse for a modern hospital's recruitment campaign — the kind that makes young people say "I want to work there."

OUTFIT SPEC:
- TOP: Short-sleeve scrub top with a sporty, athletic cut. Raglan sleeve seaming or contrast topstitching. Performance 4-way stretch fabric that shows the shoulders well. NOT boxy — fitted through the torso with room to move.
- BOTTOM: Jogger-style scrub pants — elastic ankle cuff, tapered fit, functional side pockets. Modern and sporty, like premium workout pants.
- SHOES: Performance running sneakers in a fresh colorway — Nike, Hoka, or On Cloud. Clean but with personality.

COLOR DIRECTION: Nurses often have limited color choices. Find the BEST color for this person: warm skin → hunter green, warm grey, burgundy. Cool skin → ceil blue, navy, cool charcoal. Choose the one that makes him look most alive and healthy — nurses need to radiate energy.

MOOD: The nurse that new patients feel instantly safe with. Athletic, capable, modern. He looks like he runs half-marathons on his days off. The scrubs fit like athleisure, not like a uniform.`,
    female: `STYLING BRIEF — FEMALE NURSE
You are styling a nurse for a modern hospital's recruitment campaign.

OUTFIT SPEC:
- TOP: Fitted scrub top — either a modern mock-wrap or a clean V-neck with feminine darting. The fit skims the body, shows her shape without being tight. Performance fabric with soft hand-feel.
- BOTTOM: Jogger scrub pants — tapered, mid-rise, with elastic ankle and a flattering leg line. OR straight slim scrub pants.
- SHOES: Fresh performance sneakers — white Nike, pastel New Balance, or clean Hoka. Not beaten up — box-fresh.

COLOR DIRECTION: Match the scrub color to illuminate her face. Warm skin → soft wine, warm teal, sage. Cool skin → ceil blue, lavender, cool grey. Avoid colors that wash her out — if she's fair, go for richer tones; if she has deeper skin, jewel tones or warm earth.

MOOD: She makes the entire ward feel better just by walking in. Composed, stylish, warm. The scrubs look like they were designed specifically for her body. Not a "uniform" — a look.`
  },
  vet: {
    male: `STYLING BRIEF — MALE VETERINARIAN
You are styling a vet for a premium pet care brand's social media — approachable but professional, outdoor-ready but polished.

OUTFIT SPEC:
- TOP: Short-sleeve scrub top in a relaxed athletic fit. Slightly more casual than hospital scrubs — think outdoor-brand meets medical. Durable fabric with subtle ripstop or canvas texture. Chest pocket with pen.
- BOTTOM: Scrub cargo joggers — functional thigh pockets, elastic ankle, room to kneel and move. Utilitarian but modern, like Patagonia workwear.
- SHOES: Rugged but clean sneakers — Salomon trail runners, New Balance Fresh Foam, or clean Vans in earth tones. Shoes that can handle a muddy backyard.
- OPTIONAL: Stethoscope around neck, rolled sleeves showing forearms.

COLOR DIRECTION: Vet scrubs should feel connected to nature. Warm skin → forest green, warm khaki, earthy olive. Cool skin → deep teal, ocean blue, cool moss. Earth tones always work — avoid clinical white or stark blue that feels too "hospital."

MOOD: The vet that dogs run toward, not away from. Warm, grounded, capable. He looks like he rescues animals on weekends. The outfit says "I'm a professional who gets my hands dirty."`,
    female: `STYLING BRIEF — FEMALE VETERINARIAN
You are styling a female vet for a premium pet care brand's social media.

OUTFIT SPEC:
- TOP: Fitted short-sleeve scrub top in soft, durable performance fabric. Feminine but practical — she needs to pick up large dogs and kneel on exam room floors. Clean seaming, well-proportioned.
- BOTTOM: Jogger scrub pants or slim straight pants with functional pockets. Durable, washable, but figure-flattering. Mid-rise.
- SHOES: Clean but rugged sneakers — Veja, New Balance, or white leather sneakers that still look good after a long day.
- OPTIONAL: Stethoscope, hair tied back neatly.

COLOR DIRECTION: Natural, living tones that animals and their owners respond to warmly. Warm skin → sage green, warm sand, dusty olive. Cool skin → soft teal, ocean grey, muted denim blue. The color should feel like being outdoors.

MOOD: The vet you trust completely with your pet. Gentle hands, bright eyes, quiet competence. She looks like she could be on a nature documentary AND a fashion blog.`
  },
  chef: {
    male: `STYLING BRIEF — MALE CHEF
You are styling a head chef for a Michelin-guide restaurant feature. This is where culinary art meets personal style.

OUTFIT SPEC:
- TOP: Modern chef jacket — single-breasted with hidden snap buttons, mandarin collar, short sleeves showing the forearms. Slim-fit through the torso. Premium heavyweight cotton or cotton-linen. NOT the baggy double-breasted grandpa jacket.
- APRON: A statement apron — crossback style in waxed canvas, raw denim, or full-grain leather. This is the signature piece. Worn with intention, tied with precision.
- BOTTOM: Slim black or deep charcoal chef pants. Modern straight leg, clean drape. NOT checkered, NOT baggy. Think Acne Studios black trousers.
- SHOES: Black leather clogs (Birkenstock Professional or Swedish Hasbeens) or clean black ankle boots. Utilitarian but premium.
- OPTIONAL: Black cotton beanie or clean headband. Rolled sleeves. Visible forearm tattoos are fine — adds character.

COLOR: Jacket in crisp bright white (most impactful) or charcoal grey for a moodier look. The apron provides contrast.

MOOD: This is the chef you see on Netflix. Sharp jawline of focus. The jacket fits like Tom Ford tailored it. Every element — from the knife roll to the apron tie — is intentional. He doesn't just cook food. He creates.`,
    female: `STYLING BRIEF — FEMALE CHEF
You are styling a head chef for a Michelin-guide restaurant feature.

OUTFIT SPEC:
- TOP: Modern chef jacket — slim feminine cut, short sleeves, mandarin collar or clean crew neck. Darted at the waist for shape. Premium cotton or cotton-linen, crisp but not stiff.
- APRON: Crossback linen or canvas apron — elegant and functional. Tied at the waist to define her silhouette.
- BOTTOM: Slim black chef pants — straight leg or tapered, clean and modern. Think Isabel Marant trousers in black.
- SHOES: Black leather clogs or clean minimal ankle boots. Comfortable but chic.
- OPTIONAL: Hair tied in a sleek low bun or under a clean bandana. Minimal jewelry — just a watch.

COLOR: Bright white jacket (classic authority) or off-white/cream for warmth. The apron in raw indigo, black, or natural linen provides contrast.

MOOD: The chef who got the James Beard Award AND the Vogue feature. Every plate is art, and so is she. The kitchen whites fit like they were cut for her. Elegant power in a working kitchen.`
  },
  lawyer: {
    male: `STYLING BRIEF — MALE LAWYER
You are styling a senior attorney for a corporate portrait that will appear in Forbes or The Economist. Power dressing at its finest.

OUTFIT SPEC:
- SUIT: Two-piece suit with natural shoulder, clean chest, and a modern slim-but-not-skinny silhouette. The fabric is premium super 130s wool — it has a subtle luster and drapes beautifully. Single-breasted, two-button. The lapel width is current (not too narrow, not too wide).
- SHIRT: Crisp cotton poplin in white or very pale blue. Spread collar. French cuffs optional.
- TIE: Silk tie in a tasteful pattern — subtle diagonal stripe, micro dot, or solid textured knit. NOT a power red — something more sophisticated.
- SHOES: Polished cap-toe oxford or clean penny loafer. Dark leather matching the belt.
- ACCESSORIES: Quality watch (understated, not flashy), leather portfolio or slim briefcase.

COLOR: Read this person's skin tone carefully. Warm undertone → rich navy, deep brown, warm charcoal. Cool undertone → cool grey, blue-black, steel blue. The suit color should make his face the focal point.

MOOD: The attorney opposing counsel does NOT want to face. Every seam is precision. The suit moves with him like a second skin. He looks like he bills $1,500/hour — and is worth every cent.`,
    female: `STYLING BRIEF — FEMALE LAWYER
You are styling a senior attorney for a corporate portrait that will appear in Forbes.

OUTFIT SPEC:
- SUIT: Power suit — fitted single-breasted blazer with defined waist and clean shoulders. Premium wool crepe or tropical wool. The proportions are modern — slightly cropped blazer with high-waist trousers, OR longer blazer with a midi pencil skirt.
- TOP: Silk blouse in a complementary tone, or a structured camisole. Sophisticated neckline — not too high, not too low.
- TROUSERS: Wide-leg or straight-leg, full length, with a clean pressed crease. OR midi pencil skirt with a back slit.
- SHOES: Pointed-toe pumps (70-90mm heel), refined slingbacks, or elegant loafers. Polished leather.
- ACCESSORIES: Quality watch or thin bracelet. Structured leather bag. Minimal earrings — gold studs or small hoops.

COLOR: Read this person's skin carefully. Warm → rich navy, deep camel, chocolate brown. Cool → charcoal, blue-grey, deep burgundy. Black is always an option but the RIGHT color is more powerful than default black.

MOOD: She walks into the courtroom and the room shifts. Not because she's loud — because every detail is flawless. The suit is power. The blouse is confidence. The shoes are authority. She looks like she just won a landmark case and has three more before lunch.`
  },
}

export function getWorkScenarios(jobType: string): ScenarioConfig[] {
  const job = workDirectives[jobType]
  if (!job) return getWorkScenarios('doctor') // fallback

  return [
    {
      id: 'work-signature',
      labelKo: '시그니처 디자이너', labelEn: 'Signature Designer', labelJa: 'シグネチャー', labelZh: '设计师签名款', labelEs: 'Firma del Diseñador',
      directiveMale: `${job.male}\n\nSTYLE: SIGNATURE DESIGNER — The hero look. Analyze this person's face shape, skin tone, and body proportions, then choose THE single best color and fit for them. This is the #1 recommendation — the color and cut that makes them look their absolute best in this uniform.`,
      directiveFemale: `${job.female}\n\nSTYLE: SIGNATURE DESIGNER — The hero look. Analyze this person's face shape, skin tone, and body proportions, then choose THE single best color and fit for them. This is the #1 recommendation — the color and cut that makes them look their absolute best in this uniform.`,
    },
    {
      id: 'work-warm-tone',
      labelKo: '웜톤 매치', labelEn: 'Warm Tone Match', labelJa: 'ウォームトーン', labelZh: '暖色调搭配', labelEs: 'Tono Cálido',
      directiveMale: `${job.male}\n\nSTYLE: WARM TONE — Choose a warm-toned color palette for this uniform based on the person's skin undertone. Earthy, warm colors: burgundy, warm navy, forest green, terracotta, camel, olive. Pick the warmest color that flatters THIS specific person's complexion.`,
      directiveFemale: `${job.female}\n\nSTYLE: WARM TONE — Choose a warm-toned color palette for this uniform based on the person's skin undertone. Earthy, warm colors: burgundy, warm wine, sage, dusty rose, warm camel, olive. Pick the warmest color that flatters THIS specific person's complexion.`,
    },
    {
      id: 'work-cool-tone',
      labelKo: '쿨톤 매치', labelEn: 'Cool Tone Match', labelJa: 'クールトーン', labelZh: '冷色调搭配', labelEs: 'Tono Frío',
      directiveMale: `${job.male}\n\nSTYLE: COOL TONE — Choose a cool-toned color palette for this uniform based on the person's skin undertone. Cool, refined colors: steel blue, charcoal, slate grey, cool navy, ice blue, deep teal. Pick the coolest color that flatters THIS specific person's complexion.`,
      directiveFemale: `${job.female}\n\nSTYLE: COOL TONE — Choose a cool-toned color palette for this uniform based on the person's skin undertone. Cool, refined colors: lavender grey, ceil blue, cool navy, slate, soft teal, charcoal. Pick the coolest color that flatters THIS specific person's complexion.`,
    },
    {
      id: 'work-offduty',
      labelKo: '출퇴근 룩', labelEn: 'Off-Duty Commute', labelJa: '通勤スタイル', labelZh: '通勤穿搭', labelEs: 'Look de Ida al Trabajo',
      directiveMale: `${job.male}\n\nSTYLE: OFF-DUTY COMMUTE — What this professional looks like heading to work. Stylish layering over or instead of the uniform — a designer jacket, clean sneakers, premium bag. The kind of commute outfit that makes people think "that person has great taste AND an important job."`,
      directiveFemale: `${job.female}\n\nSTYLE: OFF-DUTY COMMUTE — What this professional looks like heading to work. Stylish layering over or instead of the uniform — a chic coat, designer bag, elevated sneakers or heels. The kind of commute outfit that makes people think "she has incredible taste AND an important job."`,
    },
  ]
}

// ─── Trend Style Types ───────────────────────────────────────────

const trendDirectives: Record<string, { male: string; female: string }> = {
  street: {
    male: `STYLING BRIEF — MALE STREET FASHION
You are styling this man for a Seoul/Tokyo street-snap photographer. The look should make people screenshot it on Instagram.

OUTFIT BUILD:
- LAYER 1: Oversized washed cotton tee OR heavyweight boxy hoodie. The print (if any) is vintage-feel, faded, NOT corporate graphic. Fits wide at the body, drops past the hip.
- LAYER 2 (optional): Open flannel, workwear chore coat, or unzipped coach jacket — adds depth and movement.
- BOTTOM: Wide-leg carpenter jeans (raw or light wash) OR nylon cargo pants with velcro pockets. NOT skinny. The silhouette is relaxed and intentional.
- SHOES: Nike Dunk Low, New Balance 550, Jordan 1 Low, or Asics Gel-Kayano — always clean, laced loosely.
- ACCESSORIES: Crossbody sling bag (small), layered silver chain, snapback or 5-panel cap optional.

COLOR: Muted and textural — washed black, faded olive, cream, stone grey, deep burgundy. NOT neon. NOT all-black-everything. At least two tones in the outfit.

MOOD: He looks like he just walked out of a vintage shop in Harajuku with perfect taste. Nothing is "trying" — it all just works. The proportions are what make it special: oversized top, wide bottom, clean shoe.`,
    female: `STYLING BRIEF — FEMALE STREET FASHION
You are styling this woman for a Seoul/Tokyo street-snap photographer.

OUTFIT BUILD:
- LAYER 1: Cropped boxy tee, vintage band tee (tucked or knotted), OR oversized hoodie worn as a mini dress.
- LAYER 2 (optional): Oversized denim jacket (worn off-shoulder), cropped bomber, or utility vest.
- BOTTOM: Wide-leg cargo pants, baggy boyfriend jeans with rolled cuff, OR mini skirt + knee-high socks combo.
- SHOES: Nike Dunk, New Balance 530, chunky platform boots, or Converse high-tops. Clean or intentionally beat-up.
- ACCESSORIES: Micro bag or crossbody, layered necklaces, bucket hat or baseball cap, small hoop earrings.

COLOR: Washed, lived-in tones — faded denim blue, dusty pink, cream, olive, washed black. Pops of color through accessories only.

MOOD: She looks like the cool girl that fashion editors follow on Instagram. Effortless but every piece was chosen carefully. The proportions play big-and-small: oversized jacket + tight bottom, or fitted top + wide pants.`,
  },
  hype: {
    male: `STYLING BRIEF — MALE HYPE / DESIGNER STREETWEAR
You are styling this man for a Highsnobiety or HYPEBEAST editorial. The look whispers money — it doesn't scream.

OUTFIT BUILD:
- TOP: Heavyweight oversized hoodie in washed earth tone (Essentials-level quality) OR boxy double-layer tee with raw hem. The fabric is thick, expensive-looking, with visible weight and drape. No loud logos — tone-on-tone branding at most.
- BOTTOM: Wide-leg pleated trousers in technical wool OR premium cotton sweatpants with clean seaming. The drape is everything — fabric falls straight with weight.
- SHOES: Designer sneakers that know their place — Sacai x Nike Vaporwaffle, Fear of God Athletics, Rick Owens DRKSHDW runners, or clean suede New Balance 2002R.
- OUTER (optional): Oversized padded vest or deconstructed overcoat thrown over shoulders.
- ACCESSORIES: Matte black crossbody, simple silver ring, quality beanie.

COLOR: Muted luxury tones — cement grey, washed mocha, fog white, deep espresso, muted olive. Monochromatic or tonal — never more than 2 colors. The "richness" comes from fabric weight and texture contrast, not color.

MOOD: You can't name the brand from across the room but up close everything costs $400+. He's the kind of guy who buys Bottega and wears it like it's Uniqlo. Effortless wealth. Quiet hype.`,
    female: `STYLING BRIEF — FEMALE HYPE / DESIGNER STREETWEAR
You are styling this woman for a Highsnobiety editorial. Understated luxury meets street edge.

OUTFIT BUILD:
- TOP: Oversized structured hoodie (cream/grey/black) OR fitted mock-neck long-sleeve with designer-level fabric weight. Minimal to zero visible branding.
- BOTTOM: Wide-leg tailored trousers OR leather-look straight pants OR technical cargo skirt. Premium drape and construction.
- SHOES: Chunky designer sneakers (Sacai, Maison Margiela) OR sleek knee-high boots over the pants. Statement but monochrome.
- OUTER (optional): Oversized shearling, leather bomber, or quilted long vest.
- ACCESSORIES: Structured mini bag (Bottega-style), thin gold chain, simple sunglasses.

COLOR: Tonal luxury — all cream, all grey, all black, or espresso-to-camel gradient. Let texture and proportion do the talking.

MOOD: She looks expensive. Not flashy-expensive — quietly, devastatingly expensive. The kind of woman who walks into Dover Street Market and the staff brings her coffee.`,
  },
  'minimal-mz': {
    male: `STYLING BRIEF — MALE MINIMAL / MZ GEN Z
You are styling this man for a COS or Lemaire lookbook. The beauty is in the proportions and the silence of the outfit.

OUTFIT BUILD:
- TOP: Oversized cotton or wool-blend crew top with dropped shoulders. OR clean mock-neck in ribbed knit. The fit is relaxed but structured — the shoulder seam sits 3cm past the natural shoulder.
- BOTTOM: Wide straight-leg trousers — pressed crease, full length, clean break at the shoe. Wool, cotton-twill, or heavy linen.
- SHOES: Clean white leather sneakers (Margiela GAT or Common Projects style), suede loafers, or minimal Chelsea boots.
- OUTER (optional): Unstructured overcoat in wool or oversized single-button blazer. Worn open, never buttoned.
- ACCESSORIES: Almost nothing. A simple leather tote or canvas bag. One ring maximum.

COLOR: Tonal — head-to-toe in ONE color family. Oatmeal + cream + white. OR charcoal + black + slate. OR camel + sand + tan. Maximum 2 tones across the whole outfit. Zero patterns.

MOOD: He looks like he lives in a Tadao Ando building and only owns 30 items of clothing, all of which are perfect. Every seam is intentional. The silhouette is a poem. This is what "less is more" actually looks like when executed flawlessly.`,
    female: `STYLING BRIEF — FEMALE MINIMAL / MZ GEN Z
You are styling this woman for a Toteme or The Row lookbook.

OUTFIT BUILD:
- TOP: Oversized wool blazer (sleeves slightly too long, worn pushed up) OR clean fitted turtleneck in fine-gauge knit. OR structured crop top in heavy cotton.
- BOTTOM: Wide-leg high-waist trousers — full length, clean pressed crease, beautiful drape. The width is dramatic but controlled.
- SHOES: Pointed-toe kitten mules, clean white sneakers, or square-toe ankle boots.
- OUTER (optional): Long tailored coat in camel, grey, or cream. Worn draped over shoulders.
- ACCESSORIES: Structured bag (The Row style), delicate gold chain, small hoop earrings. Nothing more.

COLOR: Monochrome or tonal. Cream-on-cream-on-white. Black-on-charcoal-on-grey. Camel-on-sand. One color story, told through different textures — knit against woven, matte against sheen.

MOOD: She is the human embodiment of a clean-lined apartment in Copenhagen. Serene, precise, devastatingly chic. People stare not because the outfit is loud — but because the proportions are so perfect it looks like art.`,
  },
  sporty: {
    male: `STYLING BRIEF — MALE SPORTY / GORPCORE
You are styling this man for a premium athleisure or outdoor-fashion editorial. Athletic DNA, fashion execution.

OUTFIT BUILD:
- TOP: Technical mock-neck half-zip in performance fabric OR clean tech-fleece hoodie with minimal branding. The fabric has visible technical quality — moisture-wicking sheen, bonded seams.
- BOTTOM: Tapered technical joggers with zip pockets and clean seaming (Nike Tech Fleece level) OR slim hiking-inspired pants (Arc'teryx or Salomon aesthetic).
- SHOES: Performance runners — On Cloudmonster, Nike Vomero, Salomon XT-6, or New Balance Fresh Foam. The shoe is the statement piece. Clean, current colorway.
- OUTER (optional): Lightweight running vest or shell jacket, packed-shoulder style.
- ACCESSORIES: Sports watch (Garmin or Apple Watch with sport band), running cap, minimal backpack or sling.

COLOR: Technical palette — black + volt accent, charcoal + reflective, navy + orange detail. OR all-neutral earth gorpcore: stone, olive, sand. The outfit should look like it performs, not like it's costume.

MOOD: He just finished a 10K and is grabbing coffee before a meeting. The outfit works for both. It's not "gym clothes" — it's a lifestyle. He moves fast and dresses like it.`,
    female: `STYLING BRIEF — FEMALE SPORTY / ATHLEISURE
You are styling this woman for a premium athleisure editorial. The line between gym and street disappears.

OUTFIT BUILD:
- TOP: Fitted half-zip running top OR cropped tech jacket over a clean sports bra/tank. Premium performance fabric with visible quality.
- BOTTOM: High-waist sculpt leggings in dark color OR wide-leg track pants with side-stripe detail. OR tennis skirt with built-in shorts.
- SHOES: Fashion-forward runners — On Running, Hoka Bondi, Nike V2K, or New Balance 9060. Fresh, current silhouette.
- OUTER (optional): Oversized puffer vest, light windbreaker, or sheer running jacket.
- ACCESSORIES: Sleek sports watch, mini belt bag, clean sunglasses, hair in effortless ponytail or bun.

COLOR: Clean sport palette — black + white + one pop (sage, dusty rose, or soft orange). OR monochrome tech: all charcoal, all navy, all cream. Cohesive and intentional.

MOOD: She runs marathons, does pilates, and makes it to brunch looking like this. The outfit is technically functional but fashion-magazine ready. Fit, fresh, in motion.`,
  },
  retro: {
    male: `STYLING BRIEF — MALE RETRO / VINTAGE REVIVAL
You are styling this man for a "new vintage" editorial — 70s warmth, 80s structure, 90s ease, all filtered through a 2026 lens.

OUTFIT BUILD:
- TOP: Washed vintage-feel tee with retro graphic (sports team, old brand, faded photo print) OR fitted polo with contrast collar OR open corduroy overshirt layered over a tank.
- BOTTOM: Straight-leg vintage-wash jeans (not skinny, not baggy — '90s cut) OR high-waist pleated chinos OR corduroy wide-legs.
- SHOES: Retro runners — New Balance 574, Onitsuka Tiger Mexico 66, Adidas Samba, or Vans Old Skool. Worn-in and authentic. OR clean leather boots.
- OUTER (optional): Cropped varsity jacket, suede trucker jacket, or washed denim jacket with shearling collar.
- ACCESSORIES: Aviator or wayfarer sunglasses, woven leather belt, analog watch with leather strap.

COLOR: Warm retro tones — burnt orange, mustard, faded burgundy, tobacco brown, cream, washed denim blue. The palette should feel like a Kodachrome photograph — warm, golden, slightly faded.

MOOD: He looks like he stepped out of a Wes Anderson film but lives in 2026. Nostalgic without being costume-y. Every piece could be genuine vintage or a perfect modern remake — you can't tell, and that's the point.`,
    female: `STYLING BRIEF — FEMALE RETRO / VINTAGE REVIVAL
You are styling this woman for a "new vintage" editorial — 70s romance, 90s edge, Y2K fun, all through a modern lens.

OUTFIT BUILD:
- TOP: Fitted vintage band tee (cropped or tucked) OR wrap blouse with retro print OR slim cardigan buttoned up as a top.
- BOTTOM: High-waist flared jeans (70s) OR pleated wide-leg trousers (80s) OR mini skirt with knee-high boots (Y2K).
- SHOES: Platform sandals, retro Adidas Samba, Converse Chuck 70, or knee-high leather boots. Era-appropriate.
- OUTER (optional): Oversized vintage leather jacket, cropped faux-fur, or patchwork denim jacket.
- ACCESSORIES: Retro sunglasses (cat-eye or oversized round), silk scarf in hair, vintage-style jewelry (chunky gold hoops, layered chains), small structured bag.

COLOR: Warm nostalgic palette — terracotta, mustard gold, vintage pink, faded denim, cream, burgundy. Nothing too crisp or modern — everything should feel sun-faded and lived-in.

MOOD: She raided the best vintage store in the city and styled it better than anyone on the rack could imagine. Each decade is referenced but nothing is costume. She looks like the cool protagonist of an indie film set in summer.`,
  },
  'avant-garde': {
    male: `STYLING BRIEF — MALE AVANT-GARDE / DARK FASHION
You are styling this man for an editorial inspired by Rick Owens, Yohji Yamamoto, and Ann Demeulemeester. This is fashion as architecture.

OUTFIT BUILD:
- TOP: Asymmetric draped top OR deconstructed oversized shirt with raw edges and unfinished hems. OR a structured high-neck layer under a looser outer piece. The fabric is heavyweight — jersey, boiled wool, or waxed cotton.
- BOTTOM: Extra-wide draped trousers that puddle at the shoe (Yohji-style) OR drop-crotch pants in heavy black cotton OR layered skirt-over-pants.
- SHOES: Rick Owens-style angular boots, chunky platform leather boots, or Maison Margiela Tabi. The shoe is sculptural, not decorative.
- OUTER: Oversized deconstructed overcoat with asymmetric closure OR long draped cardigan-coat. Unstructured shoulders, dramatic length.
- ACCESSORIES: Almost nothing — maybe one architectural silver ring or a leather harness detail.

COLOR: Near-total black — but with TEXTURE variation. Matte black wool next to shiny black leather next to washed black cotton. If not all-black: black + ash grey, or black + off-white for stark contrast. Never colorful.

MOOD: He looks like a character from a dystopian art film who also happens to be brilliantly stylish. The silhouette is dramatic — wide, flowing, architectural. Nothing is "normal." Every proportion is pushed, every hem is intentional. This is not fashion for approval — it's fashion as self-expression.`,
    female: `STYLING BRIEF — FEMALE AVANT-GARDE / DARK FASHION
You are styling this woman for an editorial inspired by Rei Kawakubo, Yohji Yamamoto, and Rick Owens.

OUTFIT BUILD:
- TOP: Asymmetric deconstructed top OR sculptural draped blouse with unexpected volume — one shoulder exaggerated, or a wrapped construction. OR a fitted base layer under an oversized architectural piece.
- BOTTOM: Ultra-wide palazzo trousers that sweep the floor OR a dramatic pleated skirt with unexpected volume OR layered asymmetric skirt.
- SHOES: Sculptural ankle boots, Rick Owens wedge platforms, or Margiela Tabi boots. The shoe completes the architecture.
- OUTER: Cocoon-shaped coat, deconstructed trench with raw edges, or oversized draped cape-jacket.
- ACCESSORIES: One statement piece — an architectural cuff, or oversized geometric earring. Never multiple accessories.

COLOR: Black is the foundation. Layer textures: matte black, glossy black, sheer black, crushed black velvet. For contrast: stark white, raw ecru, or deep blood-red as a single accent. Never prints, never patterns.

MOOD: She is a walking installation. People don't just look — they study the construction, the movement of fabric as she walks. This is Comme des Garcons made human. Every fold is a decision. Every asymmetry is a statement. She doesn't follow trends — trends study her.`,
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
