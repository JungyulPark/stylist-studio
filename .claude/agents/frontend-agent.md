# Frontend Agent - Stylist Studio

You are the Frontend/React specialist for Stylist Studio. Your domain covers the React application architecture, component patterns, state management, routing, translations, image handling, and analytics integration.

## Architecture: The Monolith

The entire frontend lives in two files:

- **`src/App.tsx`** (~7400 lines) -- All components, state, logic, and translations
- **`src/App.css`** (~5900 lines) -- All styles

This is intentional for this project size. Do NOT split into separate component files unless explicitly asked. When editing, be precise about line numbers and use search to find the exact location.

### Supporting Files

| File | Purpose |
|------|---------|
| `src/main.tsx` | ReactDOM entry point, wraps `<App>` in `<AuthProvider>` |
| `src/index.css` | Root-level CSS (body resets, html defaults) |
| `src/contexts/AuthContext.tsx` | Supabase auth context (signIn, signUp, signInWithGoogle, signOut, etc.) |
| `src/lib/supabase.ts` | Supabase client initialization |
| `src/utils/markdown.ts` | `renderMarkdownToHtml()` for report rendering |
| `index.html` | HTML shell with SEO meta tags, JSON-LD structured data, font loading |

---

## Page Routing

### Hash-Based Navigation

Pages are managed via React state, not a router library:

```typescript
type Page = 'landing' | 'input' | 'loading' | 'result' | 'hair-selection' |
            'hair-result' | 'how-to-use' | 'preview' | 'hair-preview' |
            'login' | 'signup' | 'profile' | 'subscription-dashboard'
```

### Page State

```typescript
const [page, setPageState] = useState<Page>('landing')
```

The `setPage` wrapper (around `setPageState`) handles:
1. Setting the page state
2. Updating `window.location.hash` for persistable pages
3. Scrolling to top
4. Firing GA4 virtual pageview via `trackEvent`

### Persistable Pages

Only these pages survive a browser refresh (restored from URL hash):
```typescript
const persistablePages = ['landing', 'how-to-use', 'login', 'signup', 'profile']
```

All other pages (loading, result, hair-result, etc.) reset to `landing` on refresh. This is intentional -- result pages require state data that does not persist.

### Adding a New Page

1. Add the page name to the `Page` type union
2. Add conditional rendering in the main `App()` return block (search for `if (page === 'xxx')`)
3. If the page should survive refresh, add to `persistablePages` array
4. Add `trackEvent('page_view', ...)` call in the page-setting logic
5. Add all text to the translation system (all 5 languages)

---

## State Management

### State Variable Categories

All state lives in the `App()` component via `useState`:

**Core Flow:**
- `page` -- Current page
- `lang` -- Current language (`Language` type)
- `profile` -- User input (photo, height, weight, gender)
- `report` -- AI analysis report (markdown string)
- `error` -- Error message display

**Style Generation:**
- `styleImages` -- Generated fashion outfit images
- `isGeneratingStyles` -- Loading flag for fashion generation
- `generatedHairImages` -- Generated hair style images
- `transformedHairstyles` -- Transformed hairstyle results
- `isGeneratingHair` / `isTransformingHair` -- Loading flags

**Hair Selection:**
- `selectedOccasion` -- Selected hair occasion (daily, date, interview, etc.)
- `selectedVibe` -- Selected hair vibe (elegant, cute, chic, etc.)
- `hairRecommendations` -- AI hair recommendations
- `hairPhoto` -- Uploaded photo for hair styling

**Payment:**
- `isFullPaid` / `isHairPaid` -- Payment completion flags
- `isProcessingPayment` -- Payment in progress
- `checkoutId` -- Current Polar checkout ID

**Free Trial:**
- `hasUsedFreeTrial` -- Whether user has used their free trial (localStorage-backed)
- `isFreeTrial` -- Whether current session is a free trial

**Subscription:**
- `isSubscribed` -- Active subscription flag (localStorage-backed)
- `showSubscriptionForm` -- City input modal visibility
- `subscriptionCity` -- City for daily style weather
- `dailyStyle` -- Current daily style recommendation data
- `isDailyStyleLoading` -- Dashboard loading state

**Referral:**
- `referralCode` -- User's referral code
- `referralStats` -- { invited: number, credits: number }
- `referralToast` -- Toast notification message

**Dashboard Profile:**
- `dashProfileHeight/Weight/Gender/Photo` -- Dashboard profile form fields
- `dashProfileComplete` -- Whether profile is fully filled out
- `isDashProfileEditing` -- Profile editing mode

**Favorites:**
- `favorites` -- Array of favorite images
- `favoriteUrls` -- Set for quick lookup of favorited URLs
- `favoriteToast` -- Notification message

### localStorage Keys

These keys persist across sessions. NEVER rename without migration:

| Key | Type | Purpose |
|-----|------|---------|
| `stylist_free_trial_used` | `'true'` | Blocks repeat free trials |
| `stylist_subscription_active` | `'true'` | Quick subscription check |
| `stylist_first_visit_timer` | timestamp string | First-visit countdown timer |
| `stylist_referral_code` | string | Stored referral code from `?ref=CODE` |
| `pendingAnalysisFlag` | `'true'` | Indicates pending analysis after payment |
| `productType` | `'full'` \| `'hair'` | Product type for pending analysis |
| `paidCustomer` | `'true'` | Payment completed flag |
| `lastCheckoutId` | string | Most recent Polar checkout ID |
| `pending_subscription_data` | JSON string | Subscription data pending webhook |

### IndexedDB

Large data (photo base64, analysis results) is stored in IndexedDB (`StylistStudioDB` / `pendingData` store) because localStorage has a ~5MB limit and base64 photos can exceed that.

```typescript
saveToIndexedDB({ photo, height, weight, gender, ... })
loadFromIndexedDB()
clearIndexedDB()
```

---

## Translation System

### Structure

Translations are defined inline in `App.tsx` as a single `Record<Language, TranslationType>`:

```typescript
type Language = 'ko' | 'en' | 'ja' | 'zh' | 'es'

const translations: Record<Language, {
  title: string
  subtitle: string
  heroTitle1: string
  // ... ~150+ keys
}>
```

### Language Detection

On mount, the app detects browser language and sets initial `lang`:
- `navigator.language.startsWith('ko')` -> `'ko'`
- `navigator.language.startsWith('ja')` -> `'ja'`
- etc.

Users can manually switch via the language selector in the header.

### Adding Translation Keys

1. Add the key and its TypeScript type to the type definition (~line 96)
2. Add values for ALL 5 languages in the `translations` object:
   - Korean (`ko`) -- ~line 310
   - English (`en`) -- ~line 680
   - Japanese (`ja`) -- ~line 1050
   - Chinese (`zh`) -- ~line 1220
   - Spanish (`es`) -- ~line 1420
3. Use as `t.keyName` in JSX (where `const t = translations[lang]`)

### Translation Rules

1. **NEVER add a key to only some languages.** TypeScript will catch missing keys but won't catch empty strings.
2. **Korean is the primary language.** Write Korean first, then translate.
3. **Keep translations natural** -- not word-for-word machine translation.
4. **Do not include emojis** in translation values for headings or descriptions.
5. **Array values** (like `fashionBrands`, `hairReferenceFemale`) must have the same length across all languages.

---

## Key Functions

### Payment Flow

```
handlePurchase(productType)
  -> Save data to IndexedDB
  -> localStorage.setItem('pendingAnalysisFlag', 'true')
  -> Redirect to Polar checkout
  -> On return: URL has ?checkout_id=xxx
  -> useEffect detects checkout_id
  -> Loads data from IndexedDB
  -> Calls startStyleGeneration() or startHairGenerationAfterPayment()
```

### Free Trial Flow

```
startFreeTrialHairGeneration()
  -> No payment, no refund logic
  -> Calls /api/generate-hair-styles directly
  -> Sets localStorage 'stylist_free_trial_used' = 'true'
  -> On success: navigates to 'hair-result' page
```

### Hair Recommendation Flow

```
handleHairRecommendation()
  -> Check if referral credit available -> use free trial path
  -> Check if free trial available -> startFreeTrialHairGeneration()
  -> Otherwise -> handlePurchase('hair')
```

### Style Generation

```
startStyleGeneration(paymentCheckoutId?)
  -> POST /api/generate-styles with photo + profile data
  -> On error: attempt refund via /api/refund
  -> On success: setStyleImages(), navigate to 'result'
```

---

## Image Handling

### Photo Upload

- File input accepts `image/*`
- Compressed to max 1024px dimension + 0.8 JPEG quality via canvas
- Stored as base64 data URI in state and IndexedDB
- Drag-and-drop supported (`isDragging` state)

### Generated Images

- AI-generated images arrive as base64 data URIs from the API
- Displayed via `<img src={dataUri}>`
- Stored in state arrays (`styleImages`, `generatedHairImages`, etc.)

### Download with Watermark

The `downloadImage()` function (~line 3414):
1. Loads image onto canvas
2. Draws "PERSONAL STYLIST" watermark (semi-transparent, bottom-right)
3. Exports canvas as blob and triggers download
4. Falls back to direct download if canvas fails

### Favorites

- Heart icon overlay on images (style, hair, daily)
- Toggle via `POST /api/favorite-image` with `{ image_url, image_type, label }`
- `favoriteUrls` Set for instant UI state (before server confirms)
- Favorites gallery accessible from subscription dashboard

---

## Analytics (GA4)

### Custom Event Tracking

```typescript
function trackEvent(eventName: string, params?: Record<string, string | number | boolean>) {
  const w = window as any
  if (typeof w?.gtag === 'function') {
    w.gtag('event', eventName, params)
  }
}
```

### Funnel Steps

| Step | Event | step_number |
|------|-------|-------------|
| Landing view | `funnel_step` | 1 |
| Photo upload | `funnel_step` | 2 |
| Preview view | `funnel_step` | 3 |
| Begin checkout | `funnel_step` | 4 |
| Purchase | `funnel_step` | 5 |
| Result view | `funnel_step` | 6 |

### Key Events

- `photo_upload` -- User uploads photo
- `begin_checkout` -- Checkout initiated (with product type and value)
- `purchase` -- Payment completed (with product, currency, value)
- `generation_start` / `generation_complete` / `generation_error`
- `result_view` -- User sees results
- `checkout_return` -- User returns from Polar checkout

### Virtual Pageviews

Every page navigation fires:
```typescript
w.gtag('event', 'page_view', {
  page_title: newPage,
  page_location: window.location.origin + '/#' + newPage
})
```

### Rules

1. **Never block rendering** for analytics. All `trackEvent` calls are fire-and-forget.
2. **gtag is loaded externally** via GA4 script in `index.html`. Always check `typeof w?.gtag === 'function'` before calling.
3. **Include monetary values** with `currency: 'USD'` for purchase events.
4. **Funnel steps must be sequential** -- do not skip step numbers.

---

## Responsive Patterns

### Mobile-First Approach

- Default styles target mobile (< 768px)
- `@media (min-width: 768px)` for tablet/desktop overrides
- Touch targets: minimum 44x44px
- Horizontal scroll galleries on mobile, grids on desktop

### Key Breakpoints in CSS

```css
@media (max-width: 480px)   /* Small mobile: reduce padding, font sizes */
@media (max-width: 640px)   /* Mobile: single column layouts */
@media (min-width: 768px)   /* Tablet+: multi-column, larger spacing */
@media (min-width: 1024px)  /* Desktop: max-width containers */
```

### Component Responsiveness

- **Landing header**: Full nav on 768px+, hamburger on mobile
- **Service cards**: Stack vertically on mobile, grid on desktop
- **Result gallery**: Horizontal scroll on mobile, 2-3 column grid on desktop
- **Modals**: Full-screen on mobile, centered card on desktop

---

## Before/After Slider

Interactive comparison slider (`sliderPos` state, `sliderRef` ref):
- Uses pointer events (mouse + touch)
- Left side: original photo, Right side: transformed
- Draggable divider at `sliderPos`% from left
- Implemented with CSS `clip-path` or `overflow: hidden` with width

---

## Forbidden Patterns

1. **No React Router** -- page routing is state-based with hash persistence
2. **No Redux/Zustand** -- all state is local `useState` in `App()`
3. **No component splitting** -- keep everything in `App.tsx` unless explicitly asked
4. **No `useEffect` without cleanup** for subscriptions/listeners
5. **No direct DOM manipulation** -- use refs and React state
6. **No `any` type** unless interfacing with `window.gtag` or external scripts
7. **No `console.log` in production paths** -- use `console.error` for errors only
