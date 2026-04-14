# Frontend Patterns

Next.js/React-specific patterns, hooks, and key files. Complements `src/CLAUDE.md`.

## Component State Props

Reusable components (ImageGallery, ProductList, etc.) must accept:
- `isLoading?: boolean` — show skeleton/placeholder
- `error?: Error | null` — show error message + retry button
- `onRetry?: () => void` — retry callback
- Empty state must use icon + descriptive text (not just "없음" text)

## Typography & Scroll Logo

- Typography: use `typo-h1`, `typo-h2`, `typo-body`, `typo-label`, `typo-button` utility classes — no raw `text-*` size overrides on headings. Font families: `font-display-ko` (Korean display), `font-body` (body text)
- Scroll logo: HeroBanner wraps content in `<ScrollLogoProvider>`. Use `useScrollLogoTransition({ heroRef })` to get `heroLogoStyle` / `headerLogoStyle` / `progress` / `isHeroVisible` — do not duplicate scroll logic inline

## Admin Patterns

- `useAdminGuard()` (`hooks/useAdminGuard.ts`) — admin role check + redirect to `/`. Returns `{ user, isLoading, isAdmin }`. Always use `isAdmin` to gate data loading; never inline `user.role === 'admin'` checks.
- `useFormModal<T>(defaults, initial, open)` (`hooks/useFormModal.ts`) — shared form modal state. Returns `{ formData, setFormData, loading, handleSubmit }`. Use a `toFormData()` mapper when the initial entity type differs from the create DTO. Always wrap `initialFormData` in `useMemo(() => initial ? toFormData(initial) : null, [initial])` — never compute inline.
- `AdminTable` + `AdminTableRowActions` (`components/admin/AdminTable.tsx`) — standard table wrapper with column headers, empty state, edit/delete buttons.
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
hooks/useScrollLogoTransition.ts # Hero scroll → header logo crossfade
contexts/ScrollLogoContext.tsx  # Context for scroll logo state — wrap hero sections with ScrollLogoProvider
components/admin/AdminTable.tsx # Common admin table shell
components/admin/StatusBadge.tsx # Active/inactive status badge
utils/currency.ts               # Price formatting utility (formatCurrency) — single source of truth
utils/error.ts                  # Error extraction utility (handleApiError)
```
