# DESIGN.md

## UI Language

Product guide disclosures show a single English control label above a thin divider.
Opening the label reveals the regional-language body (Korean on `/ko`). Omit chevrons,
duplicate headings and separate expand controls; keep keyboard operation and 44px targets.

Customer and administrator controls use English copy on both regional routes.
On `/ko`, policy content, product notices and explanatory body copy remain Korean;
`/en` retains English content. Do not translate body copy when changing menu labels.
Keep the route locale for currency, checkout providers, product visibility and stored content.
Display menu items, buttons and admin section headings in uppercase. Descriptive prose,
product names, legal text and user content retain their original capitalization.
Use existing English message resources and English navigation labels; preserve Korean source translations.

Frontend design guidelines for shop-okhwadang. All frontend code must follow this document.

## Storefront Direction (2026-10-23)

Reference: [LESS GET MORE](https://www.lessgetmore.com/). Adapt its restrained navigation, photography-first layout and quiet editorial typography to 옥화당's existing content and brand.

- Use semantic background/foreground tokens for storefront chrome so CMS theme settings and dark mode still apply. Keep checkout and admin surfaces independent.
- Header: compact logo/actions row, left-aligned text navigation, understated search field and measured sticky offset. Preserve search, locale/theme controls, account and cart access.
- Hero: full-width photography, static imagery, bottom-left caption, one bottom gradient for readable text and an underlined CTA. Reuse `hero-caption` and `hero-shade`; keep slides and content CMS-managed.
- Product collections: left-aligned normal-weight headings with actions on the opposite side using `catalog-heading`. Allow wrapping on narrow screens.
- Product cards: names and prices (including original and sale prices) use 12px on every breakpoint; discounts, labels, descriptions, review counts and cart actions use 10px. Square, unrounded image frames, no enclosing panel or hover shadow, plain text stock/shipping labels at the top of the image, white product attribute values at the bottom-right inside the image without a badge background, category/name/description/price below, and a bottom row with review count and an always-visible text `ADD TO CART` action (44px touch target). Sold-out cards keep a plain stock notice and no cart action. No image icon actions, colored badges, dimming or hover zoom. Reuse the same `ProductCard` across listings and CMS blocks.
- Mobile catalog: `catalog-container` uses 6px side gutters; `catalog-product-grid` uses two equal columns with a 4px gap. Search and its loading placeholders share this geometry. Home product grids and carousels, including loading placeholders, use zero gaps at every breakpoint so adjacent photos touch. Mobile carousels show two complete cards; keep desktop column counts and explicit list-view controls.
- Footer: match LESS GET MORE's compact five-group format (social, two navigation groups, contact, legal). Use 10px type, desktop column ratios 1:1:1:1:2, 50px/30px/20px padding and right-aligned legal details. At 1000px and below use one left-aligned column, 20px group gaps and 30px/10px padding. Use the shared light/dark surface token and one thin foreground separator above the footer. No visible section headings, logo, icons or panels. Keep every CMS link and business setting; retain 44px touch targets on coarse pointers.
- Keep hero pagination touch targets at least 44px even when the visible indicator is only a thin line.
- Buttons use square corners and no decorative shadows, including icon buttons, native buttons and links rendered through `Button asChild`. The shared button rule owns this invariant; do not add per-page overrides. Preserve keyboard focus rings and interactive state feedback.
- All application surfaces use zero CSS border radius, including sidebar, forms, badges, CMS images and admin panels. The global rule owns this invariant and overrides stored radius settings. Native control semantics, focus indicators and external payment iframe internals remain independent.
- Use a monochrome UI palette: the legacy brown button variant is a neutral alias; preserve original product photography and meaningful validation feedback. Header logos are black on light surfaces and white on dark surfaces.
- Desktop header order is logo, wrapping CMS categories, search and account actions in one row. Header text uses 11px for navigation, search, language selection and badges. Below 1024px use the text-first sidebar; keep search available in every breakpoint.
- The compact header row and logo viewport are 44px tall (45px including the divider). Header action icons are 16px, centered in 44px touch targets; do not nest padded wrappers around the cart or offset account icons from the shared center line.
- Search and cart use `SEARCH` and `BAG (count)` text controls instead of icons. Desktop and mobile share the existing search panel and submit logic; keep accessible translated labels and count announcements.
- Theme and account controls also use text: `DARK`/`LIGHT` indicates the target theme; `LOGIN`/`MYPAGE` and `LOGOUT` follow authentication state. Reuse the shared controls in the header and sidebar.
- Sidebar menus, secondary links, language controls and theme text share the 11px header typography, with 44px minimum navigation touch targets. Keep its logo viewport at 44px with an 80px-wide logo matching the mobile header and a 16px close icon.
- The search panel shares the header's 11px text tokens. Its input has only a bottom rule, strengthened on focus; do not add an enclosing border or rectangular input focus ring.
- Announcement bar uses black/white and 10px text: 32px for plain notices, 44px when links or paging controls need touch targets. Each carousel step is exactly one row.
- Category CMS uses compact rows: 56px mobile / 64px desktop thumbnails with labels beside them, two mobile columns and four desktop columns. This navigation block uses `py-8 md:py-12` and a 16px title gap as an exception to standard content-section spacing. Text categories use simple divided links without colored clay swatches. Journal previews are image-and-text articles without panels, shadows, overlay badges or hover lift.

## Core Principles

### Editorial Split Content

Home split-content and brand-story blocks run edge-to-edge while other home blocks retain the shared layout container. The charcoal variant uses `--color-editorial-gray` (#414141), white 11px body text and a 12px heading. Desktop columns are 1:2, with introduction at the upper left, description/link at the lower left, 40px padding for the large template, and a grayscale 3:2 image on the right. Mobile stacks text and image with 30px vertical / 10px horizontal text padding. Images and links remain CMS-owned; never hardcode replacement imagery or reference-site copy. The editor reuses the CMS image uploader and stores optional derivatives.

The charcoal image panel has a top-to-transparent overlay using the same `--color-editorial-gray` token as the text panel, fading out by 60% of the image height.

### Minimal Product Listing

The product listing uses a full-width white surface, 3px outside gutters and zero grid gaps, with four columns at 1024px and above and two below. Use small page/category labels instead of a hero card. Category links remain horizontal; the shared complete filter panel opens on demand at every breakpoint. Preserve sorting, view preference, pagination and empty/error recovery. Product images use a 3:4 frame with `object-fit: contain` so the teapot is not cropped, and no surrounding card, border or shadow. Scope this geometry to `.editorial-catalog`; home/search layouts retain their own settings. Loading images share the same frame class. List view uses one product per row with a full-width square photo using `object-fit: cover`, followed by compact 12px name/price and 10px supporting text. Use original image URLs for this large presentation. No card background, border, shadow, hover lift, star icon or image dimming; stock and shipping remain plain text. List loading placeholders follow the same geometry.

### Product Detail Layout

At 1024px and above, use three equal columns: sticky full sanitized product description and guidance on the left, a single large gallery image, horizontal selectable thumbnails and attribute values with their descriptions from the published collection CMS page in the center, and a sticky purchase panel on the right. Both side panels may scroll when content exceeds the available viewport. The purchase panel rests toward the bottom of its available height. Below 1024px use gallery with thumbnails and attribute descriptions → purchase summary → description and guidance. Below 768px match the reference flow: gallery/thumbnails → attributes/descriptions → product name, short description and SKU → price → options and quantity → stacked BUY NOW then ADD TO CART → review/Q&A links → description and guidance. Use one shared inline set of purchase controls at every breakpoint; do not add a fixed mobile purchase bar. Reviews and inquiries are continuous full-width sections after the grid. Reuse `ProductDescription` and `ProductGuides`; never duplicate purchase state or crop tall description images. The product name uses 14px at every breakpoint.

1. **Reuse abstractions** — Do not reimplement `src/styles/globals.css`, `src/components/ui/`, `src/hooks/`
2. **No Tailwind arbitrary values** — Use theme tokens instead of `h-[123px]`
3. **Use `cn()`** — Use `cn()` utility for conditional Tailwind classes
4. **Use CSS variables** — Use `--color-*` tokens instead of hardcoded hex values

## Color Palette

All colors are CSS variables in `src/styles/globals.css`. Use tokens, not raw hex.

| Token | Default Hex | Usage |
|-------|-------------|-------|
| `--color-primary` | `#353535` | Brand primary — buttons, links, focus rings |
| `--color-tea` | `#5E5E5E` | Accent — secondary actions, highlights |
| `--color-danni` | `#BABABA` | Muted accent — tags, badges |
| `--color-surface` | `#F0F0F0` | Subtle backgrounds |
| `--color-background` | `#F9F9F9` | Page background |
| `--color-foreground` | `#1a1a1a` | Body text |
| `--color-card` | `#F9F9F9` | Card surfaces |
| `--color-border` | `#E1E1E1` | Borders, dividers |
| `--color-muted` | `#F0F0F0` | Disabled states, subtle backgrounds |
| `--color-destructive` | `#3D3D3D` | Error states, delete actions |

## Typography

### Scale (defined in `src/styles/globals.css`)

| Class | Font | Mobile | Desktop | Weight |
|-------|------|--------|---------|--------|
| `typo-h1` | Noto Serif KR | 24px | 36px | 600 |
| `typo-h2` | Noto Serif KR | 20px | 24px | 600 |
| `typo-h3` | Pretendard | 18px | 20px | 500 |
| `typo-body` | Pretendard | 16px | 16px | 400 |
| `typo-body-sm` | Pretendard | 14px | 14px | 400 |
| `typo-label` | Pretendard | 10px | 10px | — |
| `typo-button` | Pretendard | 14px | 14px | 500 |

### Typography Rules

** MUST use `typo-*` utilities instead of raw `text-*` Tailwind classes.**

| Raw Tailwind | Utility Class |
|--------------|---------------|
| `text-xs` | `typo-label` |
| `text-sm` | `typo-body-sm` |
| `text-base` | `typo-body` |
| `text-lg` | `typo-h3` |
| `text-xl` | `typo-h2` |
| `text-2xl` | `typo-h1` |

**Exception**: Only use `text-*` when the exact size doesn't match any `typo-*` utility, or when you need to override a `typo-*` for a specific reason (with a comment explaining why).

### Font Families
- All storefront and admin text uses self-hosted Roboto Condensed, including headings, body, numbers, and code-style UI.
- `--font-display`, `--font-display-latin`, `--font-mono`, `--font-sans`, and `--font-serif` share `--font-body`.
- Roboto Condensed does not include Korean glyphs; the configured base family and existing Korean sans-serif stack provide fallbacks. The theme font-family setting controls this fallback stack.
- Serve normal and italic variable WOFF2 fonts (100–900) locally with `font-display: swap`.

### Line Height
| Context | Value |
|---------|-------|
| Headings | 1.25 |
| Body | 1.6 |
| Compact | 1.1 |

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 0 | Small inputs, badges |
| `--radius-md` | 0 | Buttons, panels |
| `--radius-lg` | 0 | Modals, large panels |

## Surfaces & Borders

옥화당의 기본 UI는 **진한 박스 라인보다 여백·타입·은은한 구분선**으로 구조를 만든다.
고객-facing 화면에서 카드, 입력창, 요약 패널, 수동적인 안내 박스는 기본 `border`/`border-border` 대신 아래 공통 유틸리티를 우선 사용한다.

| Utility | Usage |
|---------|-------|
| `surface-card` | 기본 카드/패널. `rounded-lg border bg-card` 대체 기본값 |
| `border-soft` | 단일 구분선, dashed border, 작은 버튼/칩의 부담 없는 선색 |
| `border-divider-soft` | 기존 구분선 호환 유틸. 신규 고객 화면은 `border-soft`를 우선한다 |
| `field-soft` | 입력창/select/textarea 기본 선색과 배경 |
| `divide-soft` | 리스트 내부 `divide-y` 구분선 완화 |

### Border Rules

- Default: `surface-card`, `border-soft`, `field-soft`, `divide-soft`를 사용한다.
- Strong borders (`border-foreground`, plain `border`, `border-border`)은 **선택됨/활성/포커스/브랜드 CTA/오류**처럼 강조가 필요한 상태에만 사용한다.
- 고객 화면의 큰 카드에 `shadow`를 추가하기보다 먼저 `surface-card` + 충분한 spacing으로 계층을 만든다.
- Admin table처럼 정보 밀도와 스캔성이 중요한 화면은 기존 admin utilities(`admin-surface`, table dividers)를 우선한다.
- 새 폼 컴포넌트는 공통 `FormInput`/`FormSelect` 또는 `field-soft`를 사용한다.

## Animation Utilities

CMS content must be visible in server-rendered HTML before hydration. `BlockReveal` uses the shared `useScrollAnimation` hook; observer callbacks must never be required to reveal essential content. Local previews must use the existing `npm run dev` command (Turbopack), including port overrides, so the development runtime works with the site's CSP.

| Class | Description |
|-------|-------------|
| `animate-kenburns` | Hero images (8s infinite) |
| `animate-fade-in-up` | Entrance animations (0.7s) |
| `animate-skeleton-shimmer` | Loading skeleton (1.4s) — 모든 로딩 상태에 사용 |

## Skeleton Loading Rules

**로딩 상태는 `animate-skeleton-shimmer`를 사용.** `animate-pulse` 금지.

| 파일 | 용도 |
|------|------|
| `src/components/ui/Skeleton.tsx` | 기본 스켈레톤 컴포넌트 (`SkeletonLine`, `SkeletonBox`, `CardSkeleton`) |
| `src/components/ui/SkeletonList.tsx` | 리스트 스켈레톤 |
| `src/components/products/ProductSkeleton.tsx` | 상품 목록/그리드 스켈레톤 |
| `loading.tsx` | Next.js streaming 로더 — `animate-skeleton-shimmer` 직접 사용 |

## Clay Material Tags

`.tag-*` classes in `src/styles/globals.css`. Use instead of raw color values.

| Class | Background | Text |
|-------|-----------|------|
| `.tag-zuni` | `#8B4513` | white |
| `.tag-danni` | `#C4A882` | `#1C1710` |
| `.tag-zini` | `#6B3A5C` | white |
| `.tag-heukni` | `#2A2520` | `#F8F5F0` |
| `.tag-chunsuni` | `#3D6B6B` | white |
| `.tag-nokni` | `#4A6741` | white |

## Common Components

### UI Components (`src/components/ui/`)
| Component | Usage | Key API |
|-----------|-------|---------|
| `Button` | CVA variants: default, destructive, outline, secondary, ghost, link | `variant`, `size`, `asChild` |
| `Skeleton` | Single skeleton placeholder | `className` |
| `SkeletonList` | List skeleton wrapper | `count`, `className` |
| `Modal` | Radix UI modal | `open`, `onOpenChange`, `children` |
| `FormInput` | Form input | `label`, `error`, `...InputHTMLAttributes` |
| `FormSelect` | Form select | `label`, `error`, `options`, `...SelectHTMLAttributes` |

### Admin Components (`src/components/admin/`)
| Component | Usage |
|-----------|-------|
| `AdminTable` | Table shell with headers, empty state, row actions |
| `StatusBadge` | Active/inactive badge (활성/비활성) |
| `ProductImageUploader` | Image upload with preview |
| `OrderStatusSelect` | Order status dropdown |

## Hooks (`src/hooks/`)

| Hook | Usage |
|------|-------|
| `useAdminGuard` | Admin role check + redirect. Returns `{ user, isLoading, isAdmin }` |
| `useFormModal<T>` | Form modal state. Returns `{ formData, setFormData, loading, handleSubmit }` |
| `useAsyncAction` | Async loading/error state. Returns `{ loading, error, execute }` |
| `useScrollLogoTransition` | Hero → header logo crossfade. Returns `{ heroLogoStyle, headerLogoStyle, progress, isHeroVisible }` |
| `useWishlistToggle` | Wishlist toggle with optimistic update |

## Utilities (`src/utils/`)

| Function | Usage |
|---------|-------|
| `cn()` | Tailwind class merge (clsx + twMerge) |
| `formatCurrency(amount)` | Format price with Korean won (e.g., `₩100,000`) |
| `handleApiError(err)` | Extract error message string |

## Responsive Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| Default | 0–767px | Mobile first |
| `md:` | 768px+ | Tablet |
| `lg:` | 1024px+ | Desktop |

## Spacing

### Section Vertical Padding (CMS Blocks)

| Context | Mobile | Desktop |
|---------|--------|---------|
| CMS block sections (`py-*`) | `py-16` (64px) | `md:py-24` (96px) |
| Text content block (`my-*`) | `my-12` (48px) | `md:my-20` (80px) |

All CMS block `<section>` elements must use `py-16 md:py-24` — never `py-12`.

### Section Header Margin

| Element | Class |
|---------|-------|
| Block title → content gap | `mb-8` |

## Layout Patterns

```
<body>
  <Header />           # Sticky navigation
  <main>
    <HeroSection />    # Full-width hero
    <ContentSections /> # max-w-5xl centered
  </main>
  <Footer />
</body>
```

### Admin Layout
- Sidebar: `w-64 shrink-0`
- Content: `flex-1 overflow-hidden`
- Panel: `w-72 shrink-0`

## Accessibility

- All interactive elements: `aria-label` or visible text
- Focus: `focus-visible:ring-2 focus-visible:ring-ring`
- Color contrast: minimum 4.5:1 (WCAG AA)
- Touch target: minimum 44x44px

## Implementation Checklist

- [ ] All text uses `typo-*` utilities (no raw `text-*` overrides, except for valid exceptions)
- [ ] Loading states use `animate-skeleton-shimmer` (no `animate-pulse`)
- [ ] Headings use `font-display` (Roboto Condensed)
- [ ] All typography roles share Roboto Condensed with Korean fallbacks
- [ ] Colors use `--color-*` tokens (no hardcoded hex)
- [ ] Border radius uses `radius-*` tokens
- [ ] Customer-facing cards/fields/dividers use `surface-card`, `field-soft`, `border-soft`, or `divide-soft` by default
- [ ] Animations use `animate-*` utilities
- [ ] Interactive elements have focus states
- [ ] Mobile touch targets are 44px+
- [ ] ProductCard: text cart action visible on mobile and desktop at the bottom of the description
- [ ] Async operations use `useAsyncAction` (loading + error states required)
- [ ] Error messages display via `handleApiError()` with user feedback
- [ ] No Tailwind arbitrary values (`h-[123px]`)

---

**Rule: Do not reimplement existing abstractions. Update this document first if a new global component is needed.**

## Source of truth

Status: Active. Reviewed 2026-10-12 for the admin guide. Evidence: admin routes,
`AdminHeader`, `AdminSidebar`, `AdminPageHeader`, `FormInput`, `Button`, and the
existing `.toss-admin` theme in `src/styles/globals.css`. Existing rules above
remain authoritative for the storefront and other admin features.

## Brand

Admin guidance is calm, concise and task-oriented. Use the existing Toss-inspired
admin palette, whitespace and soft surfaces; avoid promotional art and heavy cards.

## Product goals

Help operators find what a menu does, complete a task and understand its consequences.
Success: every admin feature has searchable instructions and help available in context.

## Personas and jobs

Store operators manage catalog, fulfillment, customer support and published content.
Super administrators additionally inspect operational logs. Help must preserve active form input.

## Information architecture

`/admin/guide` groups all guidance into start, catalog, operations, content and settings.
Sidebar entry opens the guide. Each working screen has a collapsed contextual disclosure.
Route metadata in `src/lib/admin-guide.ts` and localized topic copy are shared by both.

## Design principles

Show a short purpose first, then a manually advanced screenshot slide with one task caption.
Use previous/next controls and progress dots instead of a numbered instruction list.
Keep the relevant caution visible below the slides. Never auto-advance.
Prefer a searchable index and native disclosures over onboarding tours or modal interruptions.

## Visual language

Reuse the color, type and spacing rules above and `.toss-admin` tokens. No new theme,
fonts or decorative imagery. Guide screenshots show actual components with fictional data. The admin guide uses `font-body` for headings as a scoped
exception to storefront display headings, matching the requested Toss style. Soft dividers and generous spacing establish hierarchy.

## Components

Reuse `AdminPageHeader`, `FormInput` and `Button`. `AdminGuide` owns the guide index
and the shared screenshot slider; native `details`/`summary` supplies keyboard-operable disclosure.
Reuse `CarouselArrowButton` for slide navigation; screenshots load only when help is open.
Each image has translated alt text and a full-size viewing link.

## Responsive behavior

Guide content uses a bounded readable width, stacked rows and wrapping text on mobile.
Help and guide navigation remain available without hover. Touch targets are at least 44px.

## Interaction states

Search covers purpose, steps and caution as well as menu names. An empty search result
shows a clear reset action. Hash links open the requested topic. Contextual help resets
when the route changes. Search opens the matching instruction slide. Screenshot examples
are captured from the real UI with fictional fixtures; no live customer or credential data.
Guidance performs no business API requests or mutations.

## Content voice

Use short operator-facing instructions and exact screen concepts. Explain when changes
are saved or published. Distinguish provider acceptance from customer receipt for messages.
All new strings live in both Korean and English locale files.

## Implementation constraints

Keep admin authentication and roles intact. Do not expose a log navigation action to
ordinary administrators. No dependencies, backend endpoints or schema changes are needed.
Test route coverage, translations, search, disclosure, contextual help and role filtering.

## Open questions

None blocking. Production authentication and real message delivery are outside guide QA.

## Transactional email design

Status: Active, 2026-10-22. Applies to all eight Korean/English email templates in
`backend/src/modules/notification/templates/render.ts`. Evidence: live public
`/api/settings?group=color`, `src/styles/globals.css`, and the existing Toss admin surfaces.

Match the current storefront's monochrome palette: charcoal `#353535`, text `#1a1a1a`,
background `#F9F9F9`, muted surfaces `#F0F0F0`, secondary text `#525252`, borders `#E1E1E1`.
Use a white, softly rounded email card with generous spacing and no decorative shadow.
Keep the wordmark on a light background, use clear sans-serif headings, group order facts
on a subtle gray surface, and provide a broad charcoal primary action with at least 48px height.
Retain all transactional copy, links, escaping, subjects and plain-text alternatives.

Use email-compatible tables and inline styles; responsive enhancements must have usable
inline fallbacks. Do not require external fonts, images, scripts or CSS variables.
Verify Korean/English and narrow-screen rendering, including long order/product values.
Custom administrator-saved HTML remains authoritative; inspect saved overrides before rollout.
