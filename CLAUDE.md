# Stylist Studio - Project Instructions

## Project Overview

**Stylist Studio** (kstylist.cc) is a single-page React application deployed on Cloudflare Pages with Cloudflare Workers (Functions) as the backend. It provides AI-powered personal styling: hairstyle recommendations and fashion outfit transformations from a single photo.

- **Frontend**: React 19 SPA (`src/App.tsx` ~7400 lines, `src/App.css` ~5900 lines)
- **Backend**: Cloudflare Pages Functions (`functions/api/*.ts`)
- **Database**: Supabase (PostgreSQL + Auth)
- **Storage**: Cloudflare R2 (`stylist-photos`, `stylist-daily-images`)
- **Payments**: Polar.sh checkout
- **AI Models**: OpenAI gpt-image-1.5 (primary) with Gemini 3 Pro / Gemini 2.5 Flash (fallback)
- **Languages**: ko, en, ja, zh, es
- **Domain**: https://kstylist.cc/

## File Structure

```
stylist-studio/
  src/
    App.tsx              # THE monolith React component (~7400 lines)
    App.css              # ALL styles (~5900 lines)
    main.tsx             # ReactDOM entry
    index.css            # Root/global CSS
    contexts/
      AuthContext.tsx     # Supabase auth provider
    lib/
      supabase.ts        # Supabase client init
    utils/
      markdown.ts        # Markdown rendering utility
  functions/
    _middleware.ts        # Rate limiting middleware
    tsconfig.json
    api/
      generate-styles.ts       # Full fashion outfit generation
      generate-hair-styles.ts  # Hairstyle generation
      transform-batch.ts       # Batch image transformation
      daily-style-cron.ts      # Hourly cron for daily outfit emails
      daily-style.ts           # Fetch daily style for dashboard
      create-checkout.ts       # Polar checkout creation
      subscribe.ts             # Subscription signup
      subscription-status.ts   # Check subscription status
      cancel-subscription.ts   # Cancel subscription
      customer-portal.ts       # Polar customer portal
      polar-webhook.ts         # Polar payment webhook
      referral.ts              # Referral system (GET/POST)
      favorite-image.ts        # Toggle/list favorites
      update-subscriber-profile.ts  # Update subscriber profile + R2 photo
      profile-photo.ts         # Profile photo operations
      analyze.ts               # Face/body analysis
      refund.ts                # Refund processing
      send-report.ts           # Email report sending
      send-payment-email.ts    # Payment confirmation email
      unsubscribe.ts           # Email unsubscribe
    lib/
      cors.ts                  # CORS utilities (ALLOWED_ORIGINS list)
      errors.ts                # Standardized ErrorCode enum + error response helpers
      validation.ts            # Request validation utilities
      openai-image.ts          # editPhotoWithOpenAI() - OpenAI gpt-image-1.5
      gemini-image.ts          # editPhotoWithGemini() - OpenAI primary, Gemini fallback
      daily-style-scenarios.ts # Weather-based outfit scenario prompts
  public/
    _headers               # Security headers + CSP + cache rules
    sw.js                  # Service worker
    manifest.json          # PWA manifest
    sitemap.xml            # SEO sitemap
    robots.txt
    og-image.png           # Open Graph image
    hero-*.avif/webp       # Hero images (multi-resolution)
    *.avif/webp/png        # Service card images
  supabase/
    migrations/
      001_create_subscribers.sql
      002_add_image_columns.sql
      003_create_profiles_and_history.sql
      004_referral_system.sql
  index.html               # HTML shell with SEO meta, JSON-LD, fonts
  wrangler.toml            # Cloudflare config (R2 bindings, env var docs)
  vite.config.ts           # Vite config with /api proxy
  package.json             # Scripts: dev, build, deploy, test, lint
```

## Color Scheme: Platinum Editorial

The design follows a "Platinum Editorial" aesthetic -- luxury fashion magazine on cream paper.

### CSS Variables (`src/App.css` :root)
```css
--primary: #1A1A1A;        /* Near-black, used for headings and strong text */
--primary-light: #4A4A4A;  /* Softer dark for secondary text */
--bg-light: #FAFAF8;       /* Warm cream background (NOT pure white) */
--bg-dark: #111111;        /* Dark sections background */
--charcoal: #1a1a1a;       /* Body text color */
--white: #ffffff;           /* Pure white, used sparingly */
--font-display: 'Manrope'; /* Sans-serif for UI text */
--font-serif: 'Playfair Display'; /* Serif for editorial headings */
```

### Accent Color
- Gold accent: `#c9a962` (used in gradients, CTAs, highlights)
- Gold gradient: `linear-gradient(135deg, #c9a962, #d4af37)`
- Class `.btn-gold` for primary CTA buttons

### Background Context
- **Landing page** (`.landing-page`): `background: var(--bg-light)` = `#FAFAF8` (LIGHT)
- **Service cards** (`.path-card-v2`): Dark overlays on images (DARK backgrounds)
- **Result/dashboard pages**: Light backgrounds

---

## CRITICAL RULES

### 1. NEVER use white text (#fff / #ffffff / white) on landing page sections
The landing page background is `#FAFAF8` (light cream). White text is invisible against it. ALL text on landing page sections MUST be dark (`#1A1A1A` or `var(--charcoal)`).

**Exception**: Service cards (`.path-card-v2`) have dark gradient overlays -- white text is correct ONLY inside those dark overlay areas.

### 2. NEVER add emojis to the UI
The design is luxury/editorial. No emojis in visible UI text, buttons, or headings. Emojis are acceptable ONLY in internal data structures (like `hairOccasions` icon field) that render as selection options, never in marketing copy or headings.

### 3. Always preserve the model fallback chain
Image generation must follow: OpenAI gpt-image-1.5 (primary) -> Gemini 3 Pro -> Gemini 2.5 Flash. Never skip a fallback level. Never hardcode a single model.

### 4. All 5 languages must stay in sync
When adding or modifying any translation key, update ALL 5 languages: `ko`, `en`, `ja`, `zh`, `es`. The TypeScript type system enforces key existence but not value accuracy.

### 5. CORS headers on every API response
Every API endpoint must call `getCorsHeaders(request)` from `functions/lib/cors.ts` and include those headers on ALL responses (success, error, and preflight). Missing CORS headers = broken frontend.

### 6. localStorage keys are sacred
Never rename or remove these localStorage keys without migrating existing user data:
- `stylist_free_trial_used`
- `stylist_subscription_active`
- `stylist_first_visit_timer`
- `stylist_referral_code`
- `pendingAnalysisFlag`
- `productType`
- `paidCustomer`
- `lastCheckoutId`

### 7. Supabase date queries must use local timezone
When comparing dates for subscriber delivery (daily-style-cron), always use `getLocalDate(timezone)` via `Intl.DateTimeFormat('en-CA', { timeZone })`. Never use UTC `new Date().toISOString().split('T')[0]` for sent_date checks.

### 8. CSP header must be updated when adding new external domains
`public/_headers` contains a strict Content-Security-Policy. Any new external script, font, image source, or API endpoint requires updating the CSP directive.

---

## Build & Development Commands

```bash
npm run dev          # Vite dev server (frontend only, port 5173)
npm run dev:api      # Backend dev server (port 8788)
npm run dev:full     # Both frontend + backend
npm run build        # tsc -b && vite build
npm run deploy       # Build + wrangler pages deploy
npm run test         # vitest run
npm run lint         # eslint
```

## Environment Variables (Cloudflare Dashboard)

- `OPENAI_API_KEY` - OpenAI API key
- `GEMINI_API_KEY` - Google Gemini API key
- `POLAR_API_KEY` - Polar.sh payment API key
- `RESEND_API_KEY` - Resend email API key
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `OPENWEATHER_API_KEY` - OpenWeatherMap API key
- `CRON_SECRET` - Secret for cron endpoint auth

## Agent Architecture

Specialized agent instructions live in `.claude/agents/`:

- **[orchestrator.md](.claude/agents/orchestrator.md)** - Master coordinator: task delegation, review checklists, deployment
- **[design-agent.md](.claude/agents/design-agent.md)** - Design/UX: color scheme, typography, spacing, image rules
- **[backend-agent.md](.claude/agents/backend-agent.md)** - Backend/API: Workers constraints, model fallbacks, error handling
- **[frontend-agent.md](.claude/agents/frontend-agent.md)** - Frontend/React: component patterns, translations, routing, state
- **[qa-agent.md](.claude/agents/qa-agent.md)** - QA/Maintenance: pre-deploy checklists, recurring bugs, accessibility
