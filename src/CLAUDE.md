# Frontend CLAUDE.md

Next.js 15 (App Router) + React 19 + TypeScript + TailwindCSS v4 frontend rules. Inherits root CLAUDE.md.

## Patterns

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

## Key Files

```
app/                            # Pages & layouts (App Router)
components/                     # Reusable UI + shadcn/ui wrappers
lib/api.ts                      # API client
contexts/                       # AuthContext, CartContext
hooks/useWishlistToggle.ts      # Wishlist toggle with optimistic update
utils/currency.ts               # Price formatting utility (formatCurrency) — single source of truth
```
