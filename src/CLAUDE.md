# Frontend CLAUDE.md

Next.js 15 (App Router) + React 19 + TypeScript + TailwindCSS v4 frontend rules. Inherits root CLAUDE.md.

## Patterns

**Design System**: All frontend design must follow `DESIGN.md` (colors, typography, spacing, components, animations).

- Functional components + hooks only
- `@/` import alias
- `cn()` for Tailwind class merging
- TypeScript strict — **`any` is forbidden**
- shadcn/ui component patterns
- **All mutations must show sonner/toast feedback** (success/failure)
- OAuth callbacks: use shared OAuthCallbackHandler component — do not create per-provider page copies
- `console.log` in committed code is forbidden
- Tailwind arbitrary values (`h-[123px]`) forbidden — use theme tokens
- File uploads: use `ApiClient.uploadFile()` — never bypass ApiClient with raw fetch + FormData
- API calls: always use `ApiClient` methods — no raw `fetch()` in feature code
- Error extraction: always use `handleApiError(err)` from `@/utils/error` — never inline `err instanceof Error ? err.message : ...`
- Price formatting: always use `formatCurrency()` from `@/utils/currency` — no inline `.toLocaleString() + '원'`
- Data fetching: use `useAsyncAction` hook — no manual `useState(loading) + try/catch/finally`
- **Component state props**: reusable components (ImageGallery, ProductList, etc.) must accept:
  - `isLoading?: boolean` — show skeleton/placeholder
  - `error?: Error | null` — show error message + retry button
  - `onRetry?: () => void` — retry callback
  - Empty state must use icon + descriptive text (not just "없음" text)
- Typography: use `typo-h1`, `typo-h2`, `typo-body`, `typo-label`, `typo-button` utility classes — no raw `text-*` size overrides on headings. Font families: `font-display-ko` (Korean display), `font-body` (body text)
- Scroll logo: HeroBanner wraps content in `<ScrollLogoProvider>`. Use `useScrollLogoTransition({ heroRef })` to get `heroLogoStyle` / `headerLogoStyle` / `progress` / `isHeroVisible` — do not duplicate scroll logic inline

## Responsive & Accessibility

- Responsive: flex/grid based, component-level mobile branching
- Semantic HTML, ARIA labels, keyboard navigation

## Template / CMS System

- Pages built as blocks: hero-banner, product-grid, carousel, category-nav, etc.
- Navigation and categories managed in DB (CMS)

## Testing

- `npm run build && npm run test:run` before any push
- Test runner: Vitest
- Single test: `npx vitest run src/components/some/SingleTest.test.tsx`
- Single test with filter: `npx vitest run --reporter=verbose --testNamePattern="test name"`

## Admin Patterns

- `useAdminGuard()` (`hooks/useAdminGuard.ts`) — admin role check + redirect to `/`. Returns `{ user, isLoading, isAdmin }`. Always use `isAdmin` to gate data loading; never inline `user.role === 'admin'` checks.
- `useFormModal<T>(defaults, initial, open)` (`hooks/useFormModal.ts`) — shared form modal state. Returns `{ formData, setFormData, loading, handleSubmit }`. Use a `toFormData()` mapper when the initial entity type differs from the create DTO. Always wrap `initialFormData` in `useMemo(() => initial ? toFormData(initial) : null, [initial])` — never compute it inline, or the hook re-runs on every render.
- `AdminTable` + `AdminTableRowActions` (`components/admin/AdminTable.tsx`) — standard table wrapper with column headers, empty state, and edit/delete buttons.
- `StatusBadge` (`components/admin/StatusBadge.tsx`) — renders `활성` / `비활성` from `isActive: boolean`.
- `EntitySelector` (`components/admin/page-editor/EntitySelector.tsx`) — searchable picker for categories or products with reorder (up/down) and remove. Props: `type: 'category' | 'product'`, `selectedIds`, `onChange`, `categoryId?`. Replaces raw comma-separated ID input fields in block property panels.

## Key Files

```
app/                            # Pages & layouts (App Router)
components/                     # Reusable UI + shadcn/ui wrappers
lib/api.ts                      # API client
contexts/                       # AuthContext, CartContext
hooks/useWishlistToggle.ts      # Wishlist toggle with optimistic update
hooks/useAdminGuard.ts          # Admin role guard (redirect + isAdmin flag)
hooks/useFormModal.ts           # Form modal state/submit boilerplate
hooks/useAsyncAction.ts         # Async loading/error state management hook
hooks/useScrollLogoTransition.ts # Hero scroll → header logo crossfade (heroLogoStyle, headerLogoStyle, progress)
contexts/ScrollLogoContext.tsx  # Context for scroll logo state — wrap hero sections with ScrollLogoProvider
components/admin/AdminTable.tsx # Common admin table shell
components/admin/StatusBadge.tsx # Active/inactive status badge
utils/currency.ts               # Price formatting utility (formatCurrency) — single source of truth
utils/error.ts                  # Error extraction utility (handleApiError)
```
