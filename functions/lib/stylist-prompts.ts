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
    male: `PROFESSION: MALE DOCTOR / PHYSICIAN — ACTUAL WORKING ATTIRE
This man is a doctor actively working in a hospital or clinic.
- Short-sleeve V-neck scrub top in navy, ceil blue, or dark green — fitted but comfortable
- Matching scrub pants with drawstring — clean, not baggy
- Clean white sneakers or comfortable clogs (Dansko, Crocs professional)
- Stethoscope around the neck or clipped to pocket
- ID badge clipped to scrub pocket
- MUST look like a real working doctor on duty — approachable, competent, ready to move`,
    female: `PROFESSION: FEMALE DOCTOR / PHYSICIAN — ACTUAL WORKING ATTIRE
This woman is a doctor actively working in a hospital or clinic.
- Short-sleeve V-neck or fitted scrub top in ceil blue, navy, or wine — flattering modern cut
- Matching scrub pants — jogger-style or straight fit
- Clean white sneakers or comfortable professional clogs
- Stethoscope around the neck
- ID badge clipped to scrub pocket
- MUST look like a real working doctor on duty — competent, professional, comfortable`
  },
  dentist: {
    male: `PROFESSION: MALE DENTIST — ACTUAL WORKING ATTIRE
This man is a dentist working in a dental clinic.
- Short-sleeve scrub top — fitted modern cut in teal, navy, or charcoal
- Matching scrub pants — clean straight or jogger fit
- Clean white sneakers or minimalist professional shoes
- Optional: disposable or reusable dental mask hanging around neck
- MUST look like a real working dentist — clean, precise, approachable, hygienic`,
    female: `PROFESSION: FEMALE DENTIST — ACTUAL WORKING ATTIRE
This woman is a dentist working in a dental clinic.
- Short-sleeve fitted scrub top in soft teal, navy, or white — modern feminine cut
- Matching scrub pants — jogger-style or tapered fit
- Clean white sneakers or elegant professional shoes
- Optional: dental mask around neck
- MUST look like a real working dentist — clean, precise, approachable, hygienic`
  },
  nurse: {
    male: `PROFESSION: MALE NURSE — ACTUAL WORKING ATTIRE
This man is a nurse working on a hospital ward.
- Short-sleeve scrub set — well-fitted, not baggy, modern athletic cut
- Colors: ceil blue, navy, charcoal, or hunter green
- Comfortable shoes — clean nursing clogs, Nike or New Balance nursing sneakers
- ID badge, pen in pocket, maybe a watch with second hand
- MUST look like a real working nurse on shift — competent, caring, ready to help`,
    female: `PROFESSION: FEMALE NURSE — ACTUAL WORKING ATTIRE
This woman is a nurse working on a hospital ward.
- Short-sleeve fitted scrub set in flattering modern cut
- Colors: ceil blue, wine, teal, navy, or soft grey
- Comfortable shoes — clean nursing sneakers or professional clogs
- ID badge, pen in pocket
- MUST look like a real working nurse on shift — competent, caring, ready to help`
  },
  vet: {
    male: `PROFESSION: MALE VETERINARIAN — ACTUAL WORKING ATTIRE
This man is a vet working in an animal clinic.
- Short-sleeve scrub top in hunter green, teal, or navy — practical for hands-on work
- Matching scrub pants — durable, comfortable, room to move
- Sturdy comfortable shoes — clean sneakers or practical clogs that can handle messes
- Optional: light disposable apron or stethoscope
- MUST look like a real working vet — warm, capable, hands-on, animal-friendly`,
    female: `PROFESSION: FEMALE VETERINARIAN — ACTUAL WORKING ATTIRE
This woman is a vet working in an animal clinic.
- Short-sleeve fitted scrub top in sage green, teal, or navy — practical and flattering
- Matching scrub pants — jogger or straight fit, durable
- Comfortable sneakers or practical clogs
- Optional: stethoscope around neck
- MUST look like a real working vet — warm, capable, hands-on, animal-friendly`
  },
  chef: {
    male: `PROFESSION: MALE CHEF — ACTUAL WORKING ATTIRE
This man is a chef working in a professional kitchen.
- Classic double-breasted chef jacket in white OR modern single-breasted short-sleeve chef coat
- Professional kitchen apron — tied at waist, black or grey
- Black or dark checkered chef pants — loose and practical for kitchen movement
- Non-slip kitchen shoes or clogs — black, practical
- Chef's toque or modern kitchen beanie/bandana
- MUST look like a real working chef in a busy kitchen — passionate, skilled, in action`,
    female: `PROFESSION: FEMALE CHEF — ACTUAL WORKING ATTIRE
This woman is a chef working in a professional kitchen.
- Modern fitted chef jacket in white OR short-sleeve chef coat — practical feminine cut
- Professional kitchen apron — tied at waist
- Black or dark chef pants — comfortable, practical fit
- Non-slip kitchen shoes — black, comfortable
- Chef's toque or modern kitchen bandana
- MUST look like a real working chef in a busy kitchen — passionate, skilled, in action`
  },
  lawyer: {
    male: `PROFESSION: MALE LAWYER / ATTORNEY — WORKING ATTIRE
This man is a lawyer at work in an office or court.
- Well-fitted suit — navy, charcoal, or dark grey — clean professional silhouette
- Crisp dress shirt — white or light blue — with a tie
- Polished leather oxford shoes or cap-toe derbies
- Professional accessories: quality watch, leather briefcase or portfolio
- MUST look like a working attorney — authoritative, sharp, confident`,
    female: `PROFESSION: FEMALE LAWYER / ATTORNEY — WORKING ATTIRE
This woman is a lawyer at work in an office or court.
- Tailored suit — fitted blazer in navy, charcoal, or black
- Silk blouse or structured top — professional neckline
- Tailored trousers or pencil skirt — clean fit
- Professional shoes — pointed-toe pumps, kitten heels, or refined flats
- MUST look like a working attorney — authoritative, sharp, confident`
  },
}

export function getWorkScenarios(jobType: string): ScenarioConfig[] {
  const job = workDirectives[jobType]
  if (!job) return getWorkScenarios('doctor') // fallback

  return [
    {
      id: 'work-standard',
      labelKo: '기본 근무복', labelEn: 'Standard On-Duty', labelJa: '標準勤務服', labelZh: '标准工作服', labelEs: 'Uniforme Estándar',
      directiveMale: `${job.male}\n\nSTYLE: STANDARD ON-DUTY — The everyday working uniform. Clean, practical, exactly what this professional wears during a normal shift. Nothing fancy, just a well-fitted, well-maintained version of the real uniform.`,
      directiveFemale: `${job.female}\n\nSTYLE: STANDARD ON-DUTY — The everyday working uniform. Clean, practical, exactly what this professional wears during a normal shift. Nothing fancy, just a well-fitted, well-maintained version of the real uniform.`,
    },
    {
      id: 'work-modern',
      labelKo: '모던 핏', labelEn: 'Modern Fit', labelJa: 'モダンフィット', labelZh: '现代版型', labelEs: 'Corte Moderno',
      directiveMale: `${job.male}\n\nSTYLE: MODERN FIT — Same working uniform but with a contemporary athletic cut. Slimmer, tapered, jogger-style pants, modern fabric that looks fresh. Like the trendy young professional everyone notices.`,
      directiveFemale: `${job.female}\n\nSTYLE: MODERN FIT — Same working uniform but with a contemporary athletic cut. Fitted, tapered, flattering proportions, modern fabric. Like the stylish young professional everyone admires.`,
    },
    {
      id: 'work-color',
      labelKo: '컬러 코디', labelEn: 'Color Coordinated', labelJa: 'カラーコーデ', labelZh: '色彩搭配', labelEs: 'Color Coordinado',
      directiveMale: `${job.male}\n\nSTYLE: COLOR COORDINATED — Same working uniform but in a distinctive color choice. Try a different professional color that stands out while staying appropriate — wine, forest green, charcoal, or navy. Well-coordinated from head to toe.`,
      directiveFemale: `${job.female}\n\nSTYLE: COLOR COORDINATED — Same working uniform but in a distinctive color choice. Try a different professional color that stands out while staying appropriate — wine, soft sage, dusty rose, or navy. Well-coordinated from head to toe.`,
    },
    {
      id: 'work-offduty',
      labelKo: '출퇴근 룩', labelEn: 'Off-Duty Commute', labelJa: '通勤スタイル', labelZh: '通勤穿搭', labelEs: 'Look de Ida al Trabajo',
      directiveMale: `${job.male}\n\nSTYLE: OFF-DUTY COMMUTE — What this professional looks like commuting to work. Smart casual clothes that hint at their profession — like throwing on a nice jacket over scrubs, or the casual outfit before changing into uniform. Professional but relaxed.`,
      directiveFemale: `${job.female}\n\nSTYLE: OFF-DUTY COMMUTE — What this professional looks like commuting to work. Smart casual clothes that hint at their profession — like a stylish layer over scrubs, or the chic outfit before changing into uniform. Professional but relaxed.`,
    },
  ]
}

// ─── Trend Style Types ───────────────────────────────────────────

const trendDirectives: Record<string, { male: string; female: string }> = {
  street: {
    male: `STREET FASHION for this man. Think Stussy, Supreme, Palace, Nike ACG, WTAPS.
- Oversized graphic tee or hoodie with bold but tasteful print
- Wide-leg cargo pants, baggy jeans, or technical joggers
- Chunky sneakers (Jordan, New Balance 550, Nike Dunk) or boots
- Layering: flannel shirt, coach jacket, or windbreaker
- Accessories: snapback cap, crossbody bag, layered necklaces
- Relaxed, confident, urban aesthetic — NOT preppy, NOT formal`,
    female: `STREET FASHION for this woman. Think Stussy, Nike, Ader Error, Ambush.
- Oversized graphic tee or cropped hoodie, or vintage band tee
- Wide-leg cargo pants, baggy jeans, or biker shorts + oversized top
- Chunky sneakers (Jordan, New Balance, Nike Dunk) or platform boots
- Layering: oversized denim jacket, bomber, or windbreaker
- Accessories: bucket hat, mini bag, layered jewelry
- Cool, effortless street style — confident and bold`,
  },
  hype: {
    male: `HYPEBEAST FASHION for this man. Think Fear of God, Off-White, visvim, Sacai.
- Premium streetwear with designer edge — elevated basics
- Fear of God Essentials-style relaxed hoodie or boxy tee in muted tones
- Wide-leg trousers or premium sweatpants with correct drape
- High-end sneakers (Travis Scott collabs, Sacai Nike, Fear of God shoes)
- Accessories: designer crossbody, statement watch, subtle branding
- Understated hype — NOT loud logos, but clearly premium`,
    female: `HYPEBEAST FASHION for this woman. Think Off-White, Ambush, Sacai, Marine Serre.
- Premium streetwear with designer edge — elevated basics
- Oversized designer hoodie or structured crop top
- Wide-leg trousers, cargo skirt, or technical pants
- High-end sneakers or chunky boots
- Accessories: designer mini bag, layered chains, statement sunglasses
- Understated hype — NOT loud logos, but clearly premium`,
  },
  'minimal-mz': {
    male: `MINIMAL MZ (Gen Z) FASHION for this man. Think COS, Lemaire, Our Legacy, Auralee.
- Clean minimalist with subtle fashion-forward details
- Oversized but intentional silhouette — dropped shoulders, relaxed body
- Monochromatic or tonal dressing in muted colors (beige, grey, black, cream)
- Clean sneakers, leather loafers, or simple boots
- Minimal accessories: simple watch, clean bag
- Instagram-worthy minimal aesthetic — effortlessly stylish`,
    female: `MINIMAL MZ (Gen Z) FASHION for this woman. Think COS, Toteme, Lemaire, Acne Studios.
- Clean minimalist with subtle fashion-forward details
- Oversized blazer or structured crop + wide-leg combination
- Monochromatic or tonal dressing in muted colors (beige, grey, black, cream)
- Clean sneakers, pointed mules, or simple boots
- Minimal accessories: delicate jewelry, structured bag
- Instagram-worthy minimal aesthetic — effortlessly stylish`,
  },
  sporty: {
    male: `SPORTY FASHION for this man. Think Nike Tech, Adidas Y-3, On Running, Arc'teryx.
- Premium athleisure with technical fabrics
- Tech fleece hoodie or zip-up, performance tee or mock-neck
- Tapered joggers, technical pants, or sport-cut trousers
- Performance sneakers (Nike, On, New Balance) in clean colorway
- Accessories: sport watch, running cap, gym bag
- Athletic but polished — NOT gym clothes, but sport-inspired fashion`,
    female: `SPORTY FASHION for this woman. Think Nike, Adidas by Stella McCartney, Lululemon, Alo Yoga.
- Premium athleisure with fashion edge
- Cropped tech jacket or fitted zip-up, sports bra + oversized layer
- High-waist leggings, track pants, or sport skirt
- Performance sneakers in clean colorway or chunky platform trainers
- Accessories: sport watch, mini belt bag, sunglasses
- Athletic but polished — gym-to-street ready`,
  },
  retro: {
    male: `RETRO VINTAGE FASHION for this man. Think 70s-90s revival, vintage Americana, retro sportswear.
- Vintage-wash denim jacket or retro varsity jacket
- Graphic vintage tee, polo shirt, or corduroy shirt
- Straight-leg vintage jeans, corduroy pants, or pleated trousers
- Retro sneakers (Vans, Converse, New Balance 574) or leather boots
- Accessories: vintage sunglasses, leather belt, retro watch
- Nostalgic but fresh — vintage pieces styled in a modern way`,
    female: `RETRO VINTAGE FASHION for this woman. Think 70s boho, 90s grunge, Y2K, vintage Americana.
- Vintage-wash denim jacket, retro cardigan, or varsity jacket
- Graphic vintage tee, wrap top, or floral blouse
- High-waist mom jeans, corduroy skirt, or vintage flared pants
- Retro sneakers (Converse, Vans), platform shoes, or vintage boots
- Accessories: vintage sunglasses, bandana, retro jewelry
- Nostalgic but fresh — vintage pieces styled in a modern way`,
  },
  'avant-garde': {
    male: `AVANT-GARDE FASHION for this man. Think Rick Owens, Yohji Yamamoto, Comme des Garcons, Julius.
- Architectural silhouettes with dramatic proportions
- Oversized deconstructed coat or asymmetric jacket
- Drop-crotch pants, wide draped trousers, or layered bottoms
- Statement boots (Rick Owens, Maison Margiela Tabis) or platform shoes
- All-black palette or stark monochrome with texture contrast
- Dark, artistic, fashion-forward — wearable art`,
    female: `AVANT-GARDE FASHION for this woman. Think Rei Kawakubo, Yohji Yamamoto, Rick Owens, Issey Miyake.
- Architectural silhouettes with dramatic proportions
- Oversized deconstructed coat, asymmetric dress, or sculptural top
- Wide draped trousers, pleated experimental skirt, or layered pieces
- Statement boots or architectural heels
- All-black palette or stark monochrome with texture contrast
- Dark, artistic, fashion-forward — wearable art`,
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
