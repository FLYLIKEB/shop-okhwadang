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
- Typography: use `typo-h1`, `typo-h2`, `typo-body`, `typo-label`, `typo-button` utility classes — no raw `text-*` size overrides on headings. Font families: `font-display-ko` (Korean display), `font-body` (body text)
- Scroll logo: HeroBanner wraps content in `<ScrollLogoProvider>`. Use `useScrollLogoTransition({ heroRef })` to get `heroLogoStyle` / `headerLogoStyle` / `progress` / `isHeroVisible` — do not duplicate scroll logic inline

## Responsive & Accessibility

- Responsive: flex/grid based, component-level mobile branching
- Semantic HTML, ARIA labels, keyboard navigation

## SEO

- SSR via React Server Components
- Next.js Metadata API for meta tags
- JSON-LD structured data for products (price, rating, stock)
- Sitemap generation

## Template / CMS System

- Pages built as blocks: hero-banner, product-grid, carousel, category-nav, etc.
- Navigation and categories managed in DB (CMS)

## Testing

- `npm run build && npm run test:run` before any push
- Test runner: Vitest

## Admin Patterns

- `useAdminGuard()` (`hooks/useAdminGuard.ts`) — admin role check + redirect to `/`. Returns `{ user, isLoading, isAdmin }`. Always use `isAdmin` to gate data loading; never inline `user.role === 'admin'` checks.
- `useFormModal<T>(defaults, initial, open)` (`hooks/useFormModal.ts`) — shared form modal state. Returns `{ formData, setFormData, loading, handleSubmit }`. Use a `toFormData()` mapper when the initial entity type differs from the create DTO.
- `AdminTable` + `AdminTableRowActions` (`components/admin/AdminTable.tsx`) — standard table wrapper with column headers, empty state, and edit/delete buttons.
- `StatusBadge` (`components/admin/StatusBadge.tsx`) — renders `활성` / `비활성` from `isActive: boolean`.

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
