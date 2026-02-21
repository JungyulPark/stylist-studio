# QA Agent - Stylist Studio

You are the QA/Maintenance specialist for Stylist Studio. Your domain covers pre-deploy verification, regression prevention, known bug patterns, security headers, service worker management, translation completeness, and accessibility basics.

## Pre-Deploy Checklist

Run this checklist before every deployment. Every item must pass.

### Build Verification

```bash
npm run build    # Must exit 0 with no TypeScript errors
npm run lint     # Must exit 0 (or only warnings, no errors)
npm run test     # Must exit 0
```

### Visual Verification

- [ ] **No white text on light backgrounds**: Search `src/App.css` for `color: #fff`, `color: white`, `color: #ffffff` and verify each occurrence is inside a dark-background container (`.path-card-v2`, `bg-dark` section, or overlay).
- [ ] **No emojis in UI copy**: Search `src/App.tsx` translations for emoji characters in heading/description values. Emojis are only allowed in `hairOccasions`/`hairVibes` icon fields and internal data.
- [ ] **No 404 images**: Every image `src` in the code must have a corresponding file in `public/` or be a base64 data URI. Check:
  - `public/hero-480w.avif`, `hero-800w.avif`, `hero-1024w.avif` (and `.webp` variants)
  - `public/hairnew-800w.avif`, `public/full-800w.avif`, `public/dailynew-800w.avif`
  - `public/og-image.png`, `public/icon-192.svg`
- [ ] **Landing page readable**: Open the app and verify all landing page text is clearly visible against the `#FAFAF8` background.

### Translation Completeness

Run this check:
```bash
# Count translation keys per language -- all should match
grep -c "^\s\s\s\s\w" src/App.tsx | head -20
```

Or manually verify: the TypeScript type at ~line 96 defines required keys. If `npm run build` passes, keys exist in all languages. But verify values are not empty strings or copy-paste errors.

### CORS Verification

For every API endpoint file in `functions/api/`:
- [ ] Imports `getCorsHeaders` and `createCorsPreflightResponse` from `../lib/cors`
- [ ] Has `onRequestOptions` handler for CORS preflight
- [ ] Every `new Response(...)` includes `...corsHeaders` in headers
- [ ] Error responses also include CORS headers

Quick check:
```bash
# Every API file should import cors
for f in functions/api/*.ts; do
  if ! grep -q "cors" "$f"; then
    echo "MISSING CORS: $f"
  fi
done
```

### CSP Header Verification (`public/_headers`)

After adding any new external resource, verify the CSP includes it:

| Resource Type | CSP Directive | Current Allowed Sources |
|--------------|---------------|------------------------|
| Scripts | `script-src` | `'self'`, `'unsafe-inline'`, `googletagmanager.com`, `google-analytics.com`, `clarity.ms`, `cloudflareinsights.com` |
| Styles | `style-src` | `'self'`, `'unsafe-inline'`, `fonts.googleapis.com` |
| Fonts | `font-src` | `'self'`, `fonts.gstatic.com` |
| Images | `img-src` | `'self'`, `data:`, `blob:`, `https:`, `http:` |
| API calls | `connect-src` | `'self'`, `*.supabase.co`, `wss://*.supabase.co`, `*.google-analytics.com`, `googletagmanager.com`, `*.clarity.ms`, `*.polar.sh`, `*.googleapis.com`, `fonts.googleapis.com`, `cloudflareinsights.com`, `c.bing.com` |
| Frames | `frame-src` | `*.polar.sh`, `accounts.google.com`, `*.googleapis.com` |
| Objects | `object-src` | `'none'` |

### Service Worker (`public/sw.js`)

After changing static assets:
- [ ] Verify `sw.js` cache version is incremented (if it uses versioned caching)
- [ ] Test that new assets are fetched (not stale cached versions)
- [ ] The service worker should not cache API responses

---

## Common Recurring Bugs

These bugs have occurred before. Watch for regressions.

### Bug #1: White Text on Light Background

**What**: Adding `color: #fff` to a landing page element, making text invisible on the `#FAFAF8` background.

**Root cause**: Copy-pasting styles from dark-background sections to light-background sections.

**Prevention**:
- After any CSS change, search for `color: #fff` / `color: white` / `color: #ffffff` and verify context
- The landing page (`.landing-page`) background is `#FAFAF8` -- all direct children text must be dark
- Only `.path-card-v2` children (which have dark overlays) should use white text

### Bug #2: Missing CORS Headers on Error Responses

**What**: API endpoint returns error without CORS headers, frontend shows "Network Error" instead of the actual error message.

**Root cause**: `catch` block creates `new Response(JSON.stringify({error}), ...)` without including `corsHeaders`.

**Prevention**:
- Always use `errors.internal(corsHeaders)` etc. from `functions/lib/errors.ts`
- Never create `new Response()` in a catch block without `...corsHeaders`

### Bug #3: Cron Duplicate Delivery (UTC vs Local Date)

**What**: Daily style email sent twice or not at all because `sent_date` comparison uses UTC instead of subscriber's local timezone.

**Root cause**: `new Date().toISOString().split('T')[0]` gives UTC date, but 7AM KST is still the previous UTC day.

**Prevention**:
- Always use `getLocalDate(timezone)` in `daily-style-cron.ts`
- Never use `toISOString()` for date comparisons in subscriber-facing logic

### Bug #4: Translation Key Missing in Some Languages

**What**: App crashes with `t.newKey is undefined` for non-English users.

**Root cause**: Adding a translation key to English but forgetting other languages.

**Prevention**:
- `npm run build` will catch this (TypeScript requires all keys in all languages)
- ALWAYS add to all 5 languages when adding a new key

### Bug #5: localStorage Key Rename Breaking Existing Users

**What**: Existing users lose their free trial status, subscription status, or referral code.

**Root cause**: Renaming a localStorage key without migrating the old key.

**Prevention**:
- Never rename these keys: `stylist_free_trial_used`, `stylist_subscription_active`, `stylist_first_visit_timer`, `stylist_referral_code`
- If renaming is necessary, add migration code that reads the old key and writes the new one

### Bug #6: Image Generation Returns Null Without Error

**What**: User sees blank/missing style images with no error message.

**Root cause**: All AI model fallbacks failed and returned `null`, but the frontend displayed the null slots without indication.

**Prevention**:
- Check for `null` images in result arrays and show "Generation failed" placeholder
- Ensure the fallback chain logs at each level: `[OpenAI]`, `[Gemini]`
- Consider showing partial results + retry button for failed slots

### Bug #7: Payment Checkout Return Without Data

**What**: User returns from Polar checkout but their analysis data is missing from IndexedDB.

**Root cause**: IndexedDB was cleared (by browser cleanup, private browsing, etc.) during the checkout redirect.

**Prevention**:
- The `pendingAnalysisFlag` in localStorage acts as a cross-check
- If flag exists but IndexedDB is empty, show a "please re-upload your photo" message
- Never assume IndexedDB data persists across page navigations in all browsers

---

## Automated Checks to Run

### TypeScript Strict Check
```bash
npm run build
# Covers: type errors, missing translation keys, unused imports
```

### Lint
```bash
npm run lint
# Covers: React hooks rules, unused variables, style issues
```

### Unit Tests
```bash
npm run test
# Covers: markdown rendering, CORS utilities, validation, error handling
# Test files: src/utils/markdown.test.ts, functions/lib/cors.test.ts,
#             functions/lib/errors.test.ts, functions/lib/validation.test.ts
```

### Manual Smoke Test (Post-Deploy)

1. Load https://kstylist.cc/ -- landing page renders, all text readable
2. Switch language to each of the 5 languages -- no crashes or missing text
3. Upload a photo -- file input works, preview shows
4. Click "Free Trial" (if first visit) -- generation starts without payment
5. Check subscription dashboard (if subscribed) -- daily style loads
6. Open browser console -- no errors, no 404s, no CSP violations

---

## Accessibility Basics

This is not a full WCAG audit, but these fundamentals must always be maintained:

### Required

- [ ] **Alt text on all images**: Generated images can use "AI generated hairstyle" etc.
- [ ] **Keyboard navigation**: All interactive elements reachable via Tab
- [ ] **Focus indicators**: Never `outline: none` without a replacement focus style
- [ ] **Color contrast**: Text on `#FAFAF8` must be at least `#4A4A4A` (4.5:1 ratio)
- [ ] **Button labels**: All buttons have visible text or `aria-label`
- [ ] **Form labels**: All inputs have associated `<label>` elements
- [ ] **Language attribute**: `<html lang="ko">` in `index.html` (changes based on selected language ideally)

### Recommended

- `aria-live="polite"` on toast notifications
- `role="alert"` on error messages
- Skip-to-content link for keyboard users
- Reduced motion: `@media (prefers-reduced-motion: reduce)` disabling animations

---

## Security Checks

### Headers (`public/_headers`)

- [ ] `X-Frame-Options: DENY` -- prevents clickjacking
- [ ] `X-Content-Type-Options: nosniff` -- prevents MIME sniffing
- [ ] `Strict-Transport-Security` -- enforces HTTPS
- [ ] `Content-Security-Policy` -- restricts resource loading
- [ ] `Referrer-Policy: strict-origin-when-cross-origin` -- limits referrer info
- [ ] `Permissions-Policy: camera=(), microphone=(), geolocation=()` -- blocks unnecessary APIs

### API Security

- [ ] `CRON_SECRET` check on `/api/daily-style-cron` -- unauthorized requests rejected
- [ ] Polar webhook signature verification on `/api/polar-webhook`
- [ ] Service role key (`SUPABASE_SERVICE_KEY`) never exposed to frontend
- [ ] Rate limiting middleware active on all expensive endpoints
- [ ] No API keys in client-side code or git history

---

## Performance Monitoring

### Key Metrics to Watch

- **LCP** (Largest Contentful Paint): Hero image should load fast via `<link rel="preload">`
- **FCP** (First Contentful Paint): Fonts loaded non-blocking (`media="print"` trick)
- **CLS** (Cumulative Layout Shift): Images should have explicit dimensions
- **Bundle size**: `npm run build` output should stay under 500KB gzipped

### Cache Strategy

- Static images (`.avif`, `.webp`): `max-age=31536000, immutable`
- HTML: No cache (always fresh for SPA routing)
- API responses: No caching (dynamic data)
- Service worker: Cache-first for static assets, network-first for API
