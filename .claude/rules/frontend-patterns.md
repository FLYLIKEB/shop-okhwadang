# Frontend Patterns

Next.js/React-specific patterns, hooks, and key files. Complements `src/CLAUDE.md`.

## CMS 페이지 렌더링 — **홈 페이지는 DB 필수**

홈 페이지(`/`)는 **반드시** DB `pages` 테이블(slug=`home`)의 `page_blocks` 데이터로만 렌더해야 한다.

- 프론트엔드 코드에 **하드코딩된 기본/폴백 블록 배열 금지**. `buildDefaultBlocks` 같은 헬퍼 두지 말 것.
- i18n 메시지로 기본 슬라이드/문구 보강도 금지 (`heroDefaultSlides` 같은 키를 런타임에 참조해 기본 슬라이드를 조립하지 말 것).
- DB 조회 실패/빈 블록 시: **`throw new Error(...)` 로 명시적 에러 발생** → `error.tsx` 로 운영 알림.
- 시드 방법: `scripts/run-seed.sh` 또는 `/db-seed` skill.

**이유**
- 운영팀이 CMS 에서 홈을 자유롭게 편집해야 하는데, 코드 폴백이 있으면 DB 수정이 반영 안 보여 혼란 발생.
- 로케일 추가 시마다 프론트 코드를 수정해야 하는 결합 제거.

**관련 파일**
- `src/app/[locale]/(routes)/page.tsx` — 홈 엔트리. 상단 주석에 규칙 명시됨.
- `src/components/shared/blocks/HeroBannerBlock.tsx` — DB `page_blocks.content.slides` 외 기본값 없음.

## Component State Props

Reusable components (ImageGallery, ProductList, etc.) must accept:
- `isLoading?: boolean` — show skeleton/placeholder
- `error?: Error | null` — show error message + retry button
- `onRetry?: () => void` — retry callback
- Empty state must use icon + descriptive text (not just "없음" text)

## Typography & Scroll Logo

- Typography: use `typo-h1`, `typo-h2`, `typo-body`, `typo-label`, `typo-button` utility classes — no raw `text-*` size overrides on headings. Font families: `font-display-ko` (Korean display), `font-body` (body text)
- Scroll logo: HeroBanner wraps content in `<ScrollLogoProvider>`. Use `useScrollLogoTransition({ heroRef })` to get `heroLogoStyle` / `headerLogoStyle` / `progress` / `isHeroVisible` — do not duplicate scroll logic inline

## CMS Block Hooks

All CMS block components (`*Block.tsx`) must use these shared hooks — do not inline equivalent logic.

- **`useBlockData<T>({ prefetched, fetch, deps })`** (`components/shared/hooks/useBlockData.ts`) — SSR prefetch-first data fetching for blocks. Uses `prefetched` data when available; falls back to client-side `fetch()` on mount. Returns `{ data: T[], loading: boolean }`. Network errors are silently swallowed (non-fatal for CMS blocks).
- **`useScrollAnimation<El>()`** (`components/shared/hooks/useScrollAnimation.ts`) — IntersectionObserver-based scroll visibility. Returns `{ ref, visible }`. Apply `opacity`/`translateY` transitions gated on `visible` for staggered reveal.
- **`useCarouselProgress({ scrollRef })`** (`components/shared/hooks/useCarouselProgress.ts`) — shared horizontal carousel progress (0–1). Call `updateProgress()` after async data loads.
- **`CarouselProgressBar`** (`components/shared/common/CarouselProgressBar.tsx`) — shared visual progress indicator for carousel blocks. Use instead of reimplementing progress UI.

When passing optional array props into hook deps, use a module-level empty constant (e.g. `EMPTY_CATEGORY_IDS`) instead of `content.ids ?? []` inline; a new empty array each render can trigger fetch loops.

When an enum needs i18n display, define a `CATEGORY_KEY_MAP: Record<EnumType, string>` constant mapping enum values to translation keys, then call `t(CATEGORY_KEY_MAP[value])` — never inline string literals or switch statements for this mapping.

## CMS Navigation Links

For CMS-driven navigation links that point to data-heavy routes (header nav, footer nav, category cards), set Next `Link` `prefetch={false}` to avoid production prefetch bursts and backend 429s. Keep this explicit when adding new header/footer/category navigation surfaces.

## Bundle-Sensitive Imports

- `npm run audit:bundle-imports` (`scripts/audit-bundle-imports.sh`) checks static `react-markdown` / `@stripe/stripe-js` imports and lucide wildcard imports.
- Use dynamic imports for `react-markdown` and `@stripe/stripe-js` where possible.
- Import individual lucide icons only; never use `import * as Icons from 'lucide-react'`.

## Admin Patterns

- `useAdminGuard()` (`components/shared/hooks/useAdminGuard.ts`) — admin role check + redirect to `/`. Returns `{ user, isLoading, isAdmin }`. Always use `isAdmin` to gate data loading; never inline `user.role === 'admin'` checks.
- `useFormModal<T>(defaults, initial, open)` (`components/shared/hooks/useFormModal.ts`) — shared form modal state. Returns `{ formData, setFormData, loading, handleSubmit }`. Use a `toFormData()` mapper when the initial entity type differs from the create DTO. Always wrap `initialFormData` in `useMemo(() => initial ? toFormData(initial) : null, [initial])` — never compute inline.
- `AdminTable` + `AdminTableRowActions` (`components/shared/admin/AdminTable.tsx`) — standard table wrapper with column headers, empty state, edit/delete buttons.
- `StatusBadge` (`components/shared/admin/StatusBadge.tsx`) — renders `활성` / `비활성` from `isActive: boolean`.
- `EntitySelector` (`components/shared/admin/page-editor/EntitySelector.tsx`) — searchable picker for categories or products with reorder (up/down) and remove. Props: `type: 'category' | 'product'`, `selectedIds`, `onChange`, `categoryId?`. Replaces raw comma-separated ID input fields in block property panels.
- `useAdminDndSensors()` (`components/shared/hooks/useDndSensors.ts`) — shared @dnd-kit sensors (PointerSensor distance:8 + KeyboardSensor). Use for admin drag-and-drop tables; do not inline `useSensors` setup.

## Key Files

```
app/                            # Pages & layouts (App Router)
components/                     # Reusable UI + shadcn/ui wrappers
lib/api/index.ts                # API client barrel export (`@/lib/api`)
contexts/                       # AuthContext, CartContext
hooks/useWishlistToggle.ts      # Wishlist toggle with optimistic update
components/shared/hooks/useAdminGuard.ts # Admin role guard (redirect + isAdmin flag)
components/shared/hooks/useFormModal.ts  # Form modal state/submit boilerplate
components/shared/hooks/useAsyncAction.ts # Async loading/error state management hook
components/shared/hooks/useScrollLogoTransition.ts # Hero scroll → header logo crossfade
components/shared/hooks/useBlockData.ts  # CMS block SSR-prefetch + client fallback data fetching
components/shared/hooks/useScrollAnimation.ts # IntersectionObserver scroll reveal for CMS blocks
components/shared/hooks/useCarouselProgress.ts # Shared carousel scroll progress hook
components/shared/hooks/useDndSensors.ts # Shared admin drag-and-drop sensors
components/shared/common/CarouselProgressBar.tsx # Shared carousel progress indicator
contexts/ScrollLogoContext.tsx  # Context for scroll logo state — wrap hero sections with ScrollLogoProvider
components/shared/admin/AdminTable.tsx # Common admin table shell
components/shared/admin/StatusBadge.tsx # Active/inactive status badge
utils/currency.ts               # Price formatting utility (formatCurrency) — single source of truth
utils/error.ts                  # Error extraction utility (handleApiError)
```
