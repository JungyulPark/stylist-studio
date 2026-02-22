# Stylist Agent — Expert Styling Knowledge Reference

## Purpose
Reference document for the AI styling system. Contains silhouette theory, color theory, scenario philosophy, and brand DNA that informs the directive-based prompt system in `functions/lib/stylist-prompts.ts`.

## Core Philosophy: Directive-Based Styling

Instead of prescribing specific garments ("wear a navy blazer with cream trousers"), we give the AI image model **directives** that instruct it to **analyze the person** and **design the optimal outfit** for their unique features.

**Why this works better:**
- Different body types need different silhouettes
- Different skin tones need different color palettes
- The AI can see the actual person and adapt in real-time
- More variety — the AI isn't constrained to one outfit per scenario

## Silhouette Theory

### Female Silhouettes
| Body Type | Flattering Approaches |
|-----------|----------------------|
| **Slim/Petite** | A-line shapes, layered textures, high waist for elongation, warm colors |
| **Balanced** | Most silhouettes work. Highlight waist with belts, fitted mid-sections |
| **Curvy** | X-silhouette, defined waist, show slim areas (wrists, ankles, collarbone) |
| **Fuller** | Vertical lines, monochromatic flow, V-necks, structured fabrics |
| **Long legs** | Midi skirts, A-line dresses, high-waisted pieces that showcase length |
| **Broad shoulders** | V-necks, A-line skirts, wide-leg bottoms to balance proportions |

### Male Silhouettes
| Body Type | Flattering Approaches |
|-----------|----------------------|
| **Slim** | Layered pieces, textured fabrics, structured shoulders for volume |
| **Balanced** | Most fits work. Clean proportions, well-fitted pieces |
| **Athletic** | Fitted knits, well-proportioned trousers, showcase frame |
| **Stocky** | Vertical lines, monochromatic color, V-shaped layering |
| **Fuller** | Dark vertical lines, V-necks, structured fabrics, open collars |

## Color Theory — Skin Undertone Matching

### Warm Undertone (golden, peachy, yellow skin)
- **Best colors**: terracotta, olive, camel, mustard, coral, cream, warm browns
- **Avoid**: stark cool tones (ice blue, bright white, silver)

### Cool Undertone (pink, rosy, bluish skin)
- **Best colors**: navy, lavender, ice blue, emerald, burgundy, pearl white, cool greys
- **Avoid**: warm yellows, oranges, mustard

### General Rules
- Dark skin + warm tones = striking harmony
- Light skin + cool tones = refined elegance
- Muted, wearable colors always — NO neon, NO bright red, NO hot pink
- Neutral base with ONE subtle accent at most

## Scenario Philosophy

Each of the 6 scenarios has a distinct emotional purpose:

| Scenario | Emotion | Key Principle |
|----------|---------|---------------|
| **Best Match** | "This is ME" | Personal signature — the most universally flattering look |
| **Interview** | "I'm capable" | Modern professional confidence, NOT corporate stiffness |
| **Date Night** | "I'm magnetic" | Alluring without being revealing, romantic, head-turning |
| **Luxury** | "I'm extraordinary" | Fabric-first quiet wealth, zero logos, pure quality |
| **Casual** | "I'm effortless" | Styled weekend — never boring basics, always intentional |
| **Daily** | "I'm polished" | Coffee-shop-ready everyday elegance, gets compliments naturally |

## Brand DNA Reference (for transform-batch branded looks)

### Male Brands
| Brand | DNA | Signature Elements |
|-------|-----|-------------------|
| **Hermès** | Precision + equestrian ease | Unstructured shoulders, sharp trousers, horn buttons, wool gabardine |
| **Brunello Cucinelli** | Warm relaxed elegance | Layered fine knits, spread-collar shirts, suede loafers, earth tones |
| **Auralee** | Fabric-first Japanese minimalism | Dropped shoulders, garment-washed cotton, matte textures |
| **Loro Piana** | Razor-clean quiet luxury | Tonal dressing, extraordinary cashmere, single color families |
| **Louis Vuitton** | Heritage patterns reimagined | Tweed, herringbone, houndstooth in modern cuts |
| **Bottega Veneta** | Bold contemporary edge | Deep colors, architectural shoulders, textured surfaces |

### Female Brands
| Brand | DNA | Signature Elements |
|-------|-----|-------------------|
| **Hermès** | Fitted precision + feminine power | Nipped waist, contrasting textures, equestrian details |
| **Auralee** | Fabric-first soft femininity | Baby cashmere, flowing textures, one fitted piece for balance |
| **The Row** | Pared-back perfection | Every seam intentional, monochrome, minimal jewelry |
| **Louis Vuitton** | Plush approachable femininity | Flowing draperies, billowing silhouettes, graceful movement |
| **Lemaire** | Mediterranean natural warmth | Structured linen, natural textures, south-of-France aesthetic |
| **Max Mara** | Timeless Italian sophistication | Camel coats, silk blouses, wool-crepe, warm earth tones |

## File Architecture

```
functions/lib/stylist-prompts.ts    # Central prompt builder (scenarios, colors, prompts)
functions/api/generate-styles.ts     # 6-scenario generation (uses buildFashionEditPrompt)
functions/api/transform-batch.ts     # Brand looks + hairstyles (uses buildBrandEditPrompt)
functions/lib/daily-style-scenarios.ts  # Daily cron (separate system, weather-based)
```

## Rules for Modifying Prompts

1. **Never hardcode specific garments** — use directives that let the AI choose
2. **Always include ANALYZE instruction** — the AI must examine the person first
3. **Provide multiple options** — "choose from X, Y, or Z" not "wear X"
4. **Color as suggestion** — "adapt to skin undertone" not "wear navy"
5. **Keep inpainting rules** — body preservation is non-negotiable
6. **Test with diverse body types** — same prompt must produce different outfits for different people
