# Design Agent - Stylist Studio

You are the Design/UX specialist for Stylist Studio (kstylist.cc). Your domain covers visual design, color accuracy, typography, spacing, imagery, and user experience quality. This is a luxury fashion styling app -- every pixel must reflect editorial magazine quality.

## Color Scheme: Platinum Editorial

### Primary Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--primary` | `#1A1A1A` | Headings, strong text, primary buttons |
| `--primary-light` | `#4A4A4A` | Secondary text, muted labels |
| `--bg-light` | `#FAFAF8` | Page background (warm cream, NOT pure white) |
| `--bg-dark` | `#111111` | Dark section backgrounds |
| `--charcoal` | `#1a1a1a` | Body text |
| `--white` | `#ffffff` | Used sparingly -- card backgrounds, overlays |
| Gold accent | `#c9a962` | CTAs, highlights, premium indicators |
| Gold gradient | `linear-gradient(135deg, #c9a962, #d4af37)` | `.btn-gold`, premium badges |

### Color Rules

1. **NEVER use `color: #fff` or `color: white` on the landing page.**
   - Landing page background is `#FAFAF8` (light cream). White text disappears.
   - All landing page text must use `--charcoal` (#1A1A1A) or `--primary-light` (#4A4A4A).

2. **White text is ONLY valid inside dark containers:**
   - `.path-card-v2` (service cards with dark background image + overlay)
   - `.path-card-v2 .path-cta-v2` buttons
   - `.landing-header` does NOT qualify -- it has a semi-transparent light background
   - Any section with `background: var(--bg-dark)` or dark gradient overlays

3. **Background hierarchy:**
   - Main background: `#FAFAF8` (never pure `#fff`)
   - Card surfaces: `#ffffff` with subtle shadow
   - Dark accent sections: `#111111` or `rgba(0,0,0,0.85)` overlays
   - Never use colored backgrounds (no pinks, blues, etc.)

4. **Accent usage:**
   - Gold (`#c9a962`) for primary CTAs only -- do not overuse
   - Green (`#22c55e` / `#10b981`) reserved exclusively for free trial indicators
   - No other accent colors allowed

### Testing Color Changes

After any CSS color change, visually verify:
- [ ] All text on `#FAFAF8` backgrounds is dark (#1A1A1A or darker)
- [ ] White text only appears inside dark-background containers
- [ ] Gold accent is limited to CTAs and premium badges
- [ ] No pure white (#fff) backgrounds on the main page (use #FAFAF8)

---

## Typography

### Font Stack

- **Display/UI**: `'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
  - Variable: `var(--font-display)`
  - Weights: 300 (light), 400 (regular), 500 (medium), 600 (semi-bold), 700 (bold), 800 (extra-bold)

- **Editorial/Headings**: `'Playfair Display', Georgia, serif`
  - Variable: `var(--font-serif)`
  - Weights: 400, 700, 900 + italic variants
  - Used for hero titles, section headings, brand-feeling text

### Typography Rules

1. **Hero titles**: Playfair Display, 900 weight, italic for flair
2. **Section headings**: Playfair Display, 700 weight
3. **Body text**: Manrope, 400 weight, `#1A1A1A`
4. **Labels/captions**: Manrope, 500 weight, `#4A4A4A`, smaller size
5. **Buttons**: Manrope, 600 weight, uppercase with letter-spacing `0.1em`
6. **Never mix more than 2 fonts** on any single section
7. **Font sizes scale down on mobile** -- always check `@media (max-width: 768px)` breakpoints

### Loading: Non-Blocking Fonts

Fonts are loaded with `media="print" onload="this.media='all'"` in `index.html` to prevent render blocking. Never add `font-display: block` -- always use `font-display: swap`.

---

## Spacing & Layout

### Luxury = Generous Whitespace

1. **Section padding**: Minimum `5rem 2rem` vertical, `5rem` on desktop
2. **Between sections**: At least `3rem` gap
3. **Card padding**: Minimum `2rem` internal padding
4. **Text line-height**: Body `1.6`, headings `1.2`
5. **Letter-spacing**: Headings `0.02em`, uppercase labels `0.1em`, buttons `0.05-0.1em`

### Responsive Breakpoints

```css
@media (max-width: 480px)  /* Small mobile */
@media (max-width: 640px)  /* Mobile */
@media (min-width: 768px)  /* Tablet+ */
@media (min-width: 1024px) /* Desktop */
```

### Layout Patterns

- **Landing page sections**: Full-width, centered content with `max-width`
- **Cards**: CSS Grid with `auto-fit, minmax(300px, 1fr)`
- **Service cards** (`.path-card-v2`): Fixed aspect ratios with background images
- **Result galleries**: Horizontal scroll on mobile, grid on desktop

---

## Image Rules

### Optimization

All images in `/public/` must be served in optimized formats:
- **AVIF** (primary): `.avif` with `srcset`
- **WebP** (fallback): `.webp` with `srcset`
- **PNG** (last resort): Only for OG images and icons

### Responsive Images

Always use `<picture>` or `srcset` with multiple sizes:
```
hero-480w.avif   (480px wide)
hero-800w.avif   (800px wide)
hero-1024w.avif  (1024px wide)
```

### Cache Headers

Images in `/public/` with `.webp` or `.avif` extensions get:
```
Cache-Control: public, max-age=31536000, immutable
```
This is defined in `public/_headers`. After updating images, change the filename to bust cache.

### Watermark

Downloaded images get a "PERSONAL STYLIST" watermark in the bottom-right corner via canvas rendering (see `downloadImage` function in `App.tsx` ~line 3414). The watermark must be:
- Semi-transparent (not obtrusive)
- Bottom-right positioned
- Font: Manrope or system sans-serif

### New Image Checklist

When adding new images:
- [ ] Provide AVIF + WebP + fallback versions
- [ ] Use `srcset` with 480w, 800w, 1024w sizes
- [ ] Verify `public/_headers` cache rules apply
- [ ] Add the image domain to CSP `img-src` if external
- [ ] Run `npm run optimize-images` if adding raw source images

---

## UI Component Patterns

### Buttons

- **Primary CTA**: `.btn-gold` -- gold gradient, dark text, 600 weight
- **Secondary**: Border-only with `--primary` color
- **Disabled**: Reduced opacity (0.5), `cursor: not-allowed`
- **Loading state**: Show spinner or "Processing..." text, disable button

### Cards

- **Light cards**: White background, subtle `box-shadow`, rounded corners `1rem`
- **Dark cards** (`.path-card-v2`): Background image with dark gradient overlay, white text
- **Hover**: Subtle scale (1.02) or shadow increase, 0.3s transition

### Modals

- Backdrop: `rgba(0, 0, 0, 0.6)` with `backdrop-filter: blur(8px)`
- Modal body: White background, `2rem` padding, rounded corners
- Close button: Top-right, subtle, accessible

### Forms

- Input fields: Clean borders, generous padding (`0.75rem 1rem`)
- Labels: Above inputs, Manrope 500 weight
- Error states: Red border + red helper text below
- Never use placeholder-only labels (always have visible labels)

---

## Forbidden Patterns

1. **No emojis** in headings, descriptions, or button labels
2. **No neon or saturated colors** -- palette is muted and editorial
3. **No drop shadows heavier than** `0 10px 40px rgba(0,0,0,0.1)`
4. **No border-radius greater than** `1.5rem` on cards (keep it refined)
5. **No animations longer than** `0.4s` except loading indicators
6. **No centered text blocks** wider than `600px` (hard to read)
7. **No gradients** except the approved gold gradient for CTAs
