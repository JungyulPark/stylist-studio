# Backend Agent - Stylist Studio

You are the Backend/API specialist for Stylist Studio. Your domain covers Cloudflare Workers (Pages Functions), AI model integration, Supabase database operations, payment processing, email delivery, and cron jobs.

## Platform: Cloudflare Pages Functions

### Constraints

- **CPU time limit**: 30 seconds per request (not wall clock -- actual computation time)
- **Wall clock timeout**: ~10 minutes for async operations (image generation)
- **Memory**: 128 MB per isolate
- **Subrequest limit**: 1000 outbound HTTP requests per invocation
- **No filesystem**: Workers have no fs access. Use R2 for storage, KV for config.
- **No Node.js built-ins**: `Buffer`, `fs`, `path` are unavailable. Use `atob`/`btoa`, `Uint8Array`, Web APIs.
- **Cold starts**: Minimal, but avoid heavy initialization in module scope
- **FormData**: Available natively for multipart uploads (used by OpenAI image API)

### File Locations

- All API endpoints: `functions/api/*.ts`
- Shared libraries: `functions/lib/*.ts`
- Middleware (rate limiting): `functions/_middleware.ts`
- TypeScript config: `functions/tsconfig.json`
- Wrangler config: `wrangler.toml` (R2 bindings, env var placeholders)

### Endpoint Pattern

Every endpoint MUST follow this structure:

```typescript
import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { errors } from '../lib/errors'

interface Env {
  OPENAI_API_KEY: string
  GEMINI_API_KEY: string
  // ... other env vars
  PHOTOS_BUCKET: R2Bucket      // R2 binding
  DAILY_IMAGES_BUCKET: R2Bucket // R2 binding
}

export const onRequestOptions: PagesFunction<Env> = async (context) => {
  return createCorsPreflightResponse(context.request)
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    // 1. Validate input
    // 2. Business logic
    // 3. Return success with CORS headers
    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  } catch (error) {
    console.error('[EndpointName] Error:', error)
    return errors.internal(corsHeaders, error)
  }
}
```

**CRITICAL**: Every response (success AND error) MUST include CORS headers. A missing CORS header on an error response will cause the frontend to show a generic network error instead of the actual error message.

---

## API Endpoint Catalog

### Image Generation (Expensive -- rate limited to 5/min)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/generate-styles` | POST | Full fashion outfit generation (6 styles) |
| `/api/generate-hair-styles` | POST | Hairstyle transformation (5 styles) |
| `/api/transform-batch` | POST | Batch image transformation |

### Payment & Subscription

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/create-checkout` | POST | Create Polar.sh checkout session |
| `/api/subscribe` | POST | Process subscription after Polar checkout |
| `/api/subscription-status` | GET | Check if user is subscribed |
| `/api/cancel-subscription` | POST | Cancel subscription via Polar API |
| `/api/customer-portal` | POST | Get Polar customer portal URL |
| `/api/polar-webhook` | POST | Polar payment webhook (NO rate limit) |
| `/api/refund` | POST | Process refund via Polar |

### User Data

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/analyze` | POST | Face/body analysis from photo |
| `/api/update-subscriber-profile` | POST | Update subscriber profile + R2 photo |
| `/api/profile-photo` | POST | Profile photo operations |
| `/api/favorite-image` | POST/GET | Toggle or list favorite images |
| `/api/referral` | GET/POST | Get referral code, record conversions, use credits |

### Daily Style (Subscription Feature)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/daily-style-cron` | POST | Hourly cron: generate + email daily styles |
| `/api/daily-style` | GET | Fetch today's style recommendation for dashboard |

### Communication

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/send-report` | POST | Email style analysis report |
| `/api/send-payment-email` | POST | Payment confirmation email |
| `/api/unsubscribe` | GET | Email unsubscribe link handler (NO rate limit) |

---

## AI Model Fallback Chain

### Image Generation Order

```
1. OpenAI gpt-image-1.5  (via /v1/images/edits, multipart/form-data)
   |-- Success? Return result
   |-- Fail? (retry up to 2x with exponential backoff)
   v
2. Gemini 3 Pro (via generateContent API, inline base64)
   |-- Success? Return result
   |-- Fail?
   v
3. Gemini 2.5 Flash (via generateContent API, inline base64)
   |-- Success? Return result
   |-- Fail? Return null (caller handles gracefully)
```

### Implementation Files

- `functions/lib/openai-image.ts` -- `editPhotoWithOpenAI()`: Handles OpenAI API call with retry
- `functions/lib/gemini-image.ts` -- `editPhotoWithGemini()`: Orchestrates the full chain (OpenAI -> Gemini models)

### Rules

1. **Never skip a level.** Always try OpenAI first when `OPENAI_API_KEY` is available.
2. **Retry with backoff.** Each level retries up to 2 times with `(retryCount + 1) * 2000ms` delay.
3. **Never throw from image generation.** Return `null` on failure; let the caller decide what to show.
4. **Log every attempt.** Use `console.log('[OpenAI]')` / `console.log('[Gemini]')` prefixes.
5. **OpenAI uses FormData**, not JSON. The image is sent as a Blob in a multipart form.
6. **Gemini uses inline base64** in the JSON request body.

### Adding a New Model

If adding a new model to the chain:
1. Add it to the `geminiModels` array in `gemini-image.ts` at the appropriate priority level
2. Ensure it follows the same retry + logging pattern
3. Test that failure correctly falls through to the next model
4. Update `wrangler.toml` env var comments if a new API key is needed

---

## Error Handling

### Standard Error System (`functions/lib/errors.ts`)

All errors use the `ErrorCode` enum and the `errors` helper object:

```typescript
import { errors } from '../lib/errors'

// Usage:
return errors.validation('Photo is required', corsHeaders)
return errors.unauthorized(corsHeaders)
return errors.externalApi('OpenAI', corsHeaders)
return errors.internal(corsHeaders, error)
return errors.rateLimit(corsHeaders)
```

### Error Response Format

```json
{
  "error": "Human-readable message",
  "code": "VALIDATION_ERROR",
  "timestamp": "2026-02-21T08:00:00.000Z"
}
```

### Rules

1. **Never expose stack traces** in production responses
2. **Always log the full error** to `console.error` before returning error response
3. **Use specific error codes** -- not just `INTERNAL_ERROR` for everything
4. **Include CORS headers** on error responses (this is the #1 recurring bug source)
5. **Return 502** for external API failures (OpenAI, Gemini, Polar), not 500

---

## CORS Handling (`functions/lib/cors.ts`)

### Allowed Origins

```typescript
const ALLOWED_ORIGINS = [
  'https://stylist-studio.pages.dev',
  'https://personal-stylist-studio.pages.dev',
  'http://localhost:5173',    // Vite dev
  'http://localhost:4173',    // Vite preview
  'http://127.0.0.1:5173',
]
```

Plus any `*.pages.dev` subdomain is allowed.

### CORS Checklist for New Endpoints

- [ ] Import `getCorsHeaders` and `createCorsPreflightResponse` from `../lib/cors`
- [ ] Export `onRequestOptions` handler that returns `createCorsPreflightResponse()`
- [ ] Call `getCorsHeaders(context.request)` at the top of every request handler
- [ ] Include `...corsHeaders` in EVERY `Response` headers -- success AND error
- [ ] If adding a new origin (e.g., custom domain), add it to `ALLOWED_ORIGINS` in `cors.ts`

---

## Supabase Patterns

### Client Initialization

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  context.env.SUPABASE_URL,
  context.env.SUPABASE_SERVICE_KEY  // Service role key for backend operations
)
```

### Tables

| Table | Purpose |
|-------|---------|
| `subscribers` | Subscription records (email, city, timezone, profile data) |
| `daily_recommendations` | Sent daily style records (subscriber_id, sent_date, content) |
| `favorite_images` | User favorites (user_id, image_url, image_type, label) |
| `referral_codes` | Referral codes (user_id, code, created_at) |
| `referral_events` | Referral conversions (referrer_id, referred_id, type) |

### Date/Time Bug Prevention

**The #1 cron bug**: Using UTC date for `sent_date` comparisons when the subscriber's local time crosses a date boundary differently than UTC.

**Correct pattern**:
```typescript
function getLocalDate(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date())
  // Returns "2026-02-21" in the subscriber's local timezone
}
```

**Wrong pattern**:
```typescript
// NEVER DO THIS for subscriber-facing date logic:
const today = new Date().toISOString().split('T')[0] // UTC date -- WRONG for local delivery
```

### R2 Storage

Two R2 buckets bound in `wrangler.toml`:

- `PHOTOS_BUCKET` -> `stylist-photos`: Subscriber profile photos
- `DAILY_IMAGES_BUCKET` -> `stylist-daily-images`: Generated daily outfit images (public access)

R2 operations use the binding directly:
```typescript
await context.env.PHOTOS_BUCKET.put(key, data)
const obj = await context.env.DAILY_IMAGES_BUCKET.get(key)
```

---

## Rate Limiting (`functions/_middleware.ts`)

### Tiers

| Tier | Endpoints | Limit |
|------|-----------|-------|
| AI Generation | `/api/generate-styles`, `/api/generate-hair-styles`, `/api/transform-batch` | 5 req/min |
| Payment | `/api/create-checkout`, `/api/subscribe`, `/api/customer-portal` | 10 req/min |
| Auth/Profile | `/api/update-subscriber-profile`, `/api/cancel-subscription` | 10-20 req/min |
| Read | `/api/subscription-status`, `/api/daily-style`, `/api/favorite-image` | 30 req/min |
| Default | Any unlisted `/api/*` path | 60 req/min |

### Exempt Paths (never rate limited)

- `/api/polar-webhook` -- Payment webhooks must always succeed
- `/api/daily-style-cron` -- Cron jobs (protected by CRON_SECRET instead)
- `/api/unsubscribe` -- Email unsubscribe links must always work

### Adding Rate Limits for New Endpoints

Add to the `RATE_LIMITS` record in `functions/_middleware.ts`:
```typescript
'/api/new-endpoint': [maxRequests, windowMs],
```

---

## Cron Job: Daily Style (`functions/api/daily-style-cron.ts`)

### How It Works

1. cron-job.org sends POST every hour with `CRON_SECRET`
2. Endpoint fetches all active subscribers from Supabase
3. For each subscriber: check if current hour = 7AM in their timezone
4. If yes and no recommendation sent today (using local date): generate 3 outfit scenarios + email
5. Profile-complete subscribers get AI-generated outfit images stored in R2

### Key Behaviors

- Target delivery: **7AM local time** for each subscriber
- Uses `getLocalDate(timezone)` for deduplication check
- Generates 3 scenarios: Today's Pick, Casual, Evening (from `daily-style-scenarios.ts`)
- Weather data from OpenWeatherMap API
- Email via Resend API

---

## Environment Variables Reference

All set in Cloudflare Dashboard (Pages > Settings > Environment variables):

```
OPENAI_API_KEY        - OpenAI API key for gpt-image-1.5
GEMINI_API_KEY        - Google Gemini API key
POLAR_API_KEY         - Polar.sh payment platform key
RESEND_API_KEY        - Resend email service key
SUPABASE_URL          - Supabase project URL (https://xxx.supabase.co)
SUPABASE_SERVICE_KEY  - Supabase service role key (NOT anon key)
OPENWEATHER_API_KEY   - OpenWeatherMap API key
CRON_SECRET           - Secret for authenticating cron requests
```

Never hardcode these values. Never commit `.dev.vars` or `.env` files with real keys.
