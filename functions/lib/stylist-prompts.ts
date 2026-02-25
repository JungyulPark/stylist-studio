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
    male: `PROFESSION: MALE DOCTOR — DESIGNER SCRUBS
This man is a doctor. Dress him in elevated, designer-level medical scrubs that look stylish while being fully functional.
- Short-sleeve V-neck scrub top — slim athletic fit, premium stretch fabric with subtle texture
- Matching scrub jogger pants — tapered ankle, modern silhouette (think FIGS, Jaanuu designer scrubs)
- Premium sneakers — clean minimalist white (Common Projects style) or On Running
- Stethoscope around the neck
- COLOR MUST BE CHOSEN based on this person's skin tone and undertone from the photo
- MUST look like the best-dressed doctor in the hospital — stylish, modern, head-turning but still professional`,
    female: `PROFESSION: FEMALE DOCTOR — DESIGNER SCRUBS
This woman is a doctor. Dress her in elevated, designer-level medical scrubs that look chic while being fully functional.
- Short-sleeve or cap-sleeve scrub top — feminine fitted cut, premium stretch fabric with subtle texture
- Matching scrub jogger pants — tapered, flattering silhouette (think FIGS, Jaanuu, Healing Hands)
- Premium sneakers — clean white or stylish neutral (Veja, On Running)
- Stethoscope around the neck
- COLOR MUST BE CHOSEN based on this person's skin tone, undertone, and hair color from the photo
- MUST look like the most stylish doctor in the hospital — chic, confident, head-turning but professional`
  },
  dentist: {
    male: `PROFESSION: MALE DENTIST — DESIGNER DENTAL WEAR
This man is a dentist. Dress him in elevated, designer-level dental scrubs that are sleek and modern.
- Short-sleeve scrub top — slim tailored fit with clean lines, premium fabric
- Matching scrub pants — jogger or slim tapered fit, modern proportions
- Premium minimalist sneakers — white or tonal neutral
- Optional: designer dental loupe around neck
- COLOR MUST BE CHOSEN based on this person's skin tone and undertone from the photo
- MUST look like a dentist at a premium boutique clinic — polished, precise, fashionable yet hygienic`,
    female: `PROFESSION: FEMALE DENTIST — DESIGNER DENTAL WEAR
This woman is a dentist. Dress her in elevated, designer-level dental scrubs that are sleek and feminine.
- Short-sleeve fitted scrub top — modern feminine cut with flattering seaming, premium fabric
- Matching scrub pants — jogger or tapered fit with ankle detail
- Premium minimalist sneakers — white or soft neutral
- Optional: dental mask casually around neck
- COLOR MUST BE CHOSEN based on this person's skin tone, hair color, and undertone from the photo
- MUST look like a dentist at a high-end aesthetic clinic — chic, clean, effortlessly stylish`
  },
  nurse: {
    male: `PROFESSION: MALE NURSE — DESIGNER NURSING SCRUBS
This man is a nurse. Dress him in elevated, designer-level nursing scrubs with athletic styling.
- Short-sleeve scrub top — athletic fit with raglan or contrast seaming, performance fabric
- Matching scrub jogger pants — tapered with elastic cuffs, modern sporty look
- Premium nursing sneakers — Nike, Hoka, or On Running in clean colorway
- Functional details: multiple pockets, pen slot, ID clip
- COLOR MUST BE CHOSEN based on this person's skin tone and undertone from the photo
- MUST look like the coolest nurse on the ward — fit, modern, approachable yet professional`,
    female: `PROFESSION: FEMALE NURSE — DESIGNER NURSING SCRUBS
This woman is a nurse. Dress her in elevated, designer-level nursing scrubs with a feminine athletic edge.
- Short-sleeve or mock-wrap scrub top — fitted feminine cut, performance fabric, flattering neckline
- Matching scrub jogger pants — tapered, figure-flattering with ankle detail
- Premium nursing sneakers — Nike, New Balance, or Hoka in fresh colorway
- Functional details: pockets, pen slot
- COLOR MUST BE CHOSEN based on this person's skin tone, hair color, and undertone from the photo
- MUST look like a nurse everyone admires — stylish, caring, put-together`
  },
  vet: {
    male: `PROFESSION: MALE VETERINARIAN — DESIGNER VET SCRUBS
This man is a vet. Dress him in elevated, designer-level veterinary scrubs that are rugged yet stylish.
- Short-sleeve scrub top — relaxed athletic fit, durable premium fabric with subtle outdoor-inspired details
- Matching scrub cargo or jogger pants — functional pockets, comfortable
- Clean rugged sneakers — New Balance, Salomon style in earth tones
- Optional: stethoscope around neck
- COLOR MUST BE CHOSEN based on this person's skin tone — earth tones, sage, forest, or teal recommended
- MUST look like a vet at a premium animal hospital — warm, capable, stylish but hands-on ready`,
    female: `PROFESSION: FEMALE VETERINARIAN — DESIGNER VET SCRUBS
This woman is a vet. Dress her in elevated, designer-level veterinary scrubs that are practical yet chic.
- Short-sleeve fitted scrub top — flattering cut, durable premium fabric
- Matching scrub jogger or straight pants — functional and figure-flattering
- Clean stylish sneakers — Veja, New Balance in natural tones
- Optional: stethoscope around neck
- COLOR MUST BE CHOSEN based on this person's skin tone and hair — sage, teal, warm earth, or navy recommended
- MUST look like a vet at a boutique animal clinic — warm, stylish, effortlessly put-together`
  },
  chef: {
    male: `PROFESSION: MALE CHEF — DESIGNER CHEF COAT
This man is a chef. Dress him in a modern designer chef jacket that belongs in a Michelin-star kitchen.
- Modern chef jacket — single-breasted, short-sleeve, mandarin collar, slim fit in premium cotton
- Designer kitchen apron — waxed canvas or premium leather, tied at waist
- Dark slim chef pants — black or charcoal, clean modern fit (NOT checkered)
- Premium kitchen shoes — minimal black leather clogs or clean ankle boots
- Optional: modern black kitchen beanie
- COLOR MUST BE CHOSEN for the jacket based on skin tone — crisp white, charcoal, or warm grey
- MUST look like a head chef at a design-forward restaurant — creative, sharp, commanding`,
    female: `PROFESSION: FEMALE CHEF — DESIGNER CHEF COAT
This woman is a chef. Dress her in a modern designer chef jacket that belongs in a Michelin-star kitchen.
- Modern chef jacket — fitted feminine cut, short-sleeve, clean lines, premium cotton
- Designer kitchen apron — waxed canvas or linen, elegant tie
- Dark slim chef pants — black, flattering straight or tapered fit
- Premium kitchen shoes — minimal black clogs or clean ankle boots
- Optional: modern kitchen bandana or headband
- COLOR MUST BE CHOSEN for the jacket based on skin tone — white, off-white, warm grey, or charcoal
- MUST look like a head chef at a design-forward restaurant — creative, elegant, confident`
  },
  lawyer: {
    male: `PROFESSION: MALE LAWYER — DESIGNER SUIT
This man is a lawyer. Dress him in an impeccably tailored designer suit that commands the courtroom.
- Slim, modern-fit suit — precision tailoring, premium wool or wool-blend fabric
- Crisp dress shirt — white or pale blue, with a tasteful silk tie
- Polished leather oxford shoes or loafers
- Quality accessories: watch, leather portfolio
- SUIT COLOR MUST BE CHOSEN based on this person's skin tone and undertone from the photo
- MUST look like a top attorney at an elite firm — sharp, powerful, effortlessly stylish`,
    female: `PROFESSION: FEMALE LAWYER — DESIGNER SUIT
This woman is a lawyer. Dress her in an impeccably tailored designer suit that commands the courtroom.
- Modern power suit — fitted blazer with defined waist, premium wool or crepe fabric
- Silk blouse or structured camisole — sophisticated
- Tailored trousers or midi pencil skirt — precise fit
- Elegant shoes — pointed-toe pumps or refined mules
- SUIT COLOR MUST BE CHOSEN based on this person's skin tone and undertone from the photo
- MUST look like a top attorney at an elite firm — powerful, polished, unmistakably stylish`
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
