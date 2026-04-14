# Frontend CLAUDE.md

Next.js 15 (App Router) + React 19 + TS + TailwindCSS v4. Inherits root CLAUDE.md. See `.claude/rules/frontend-patterns.md` for admin patterns, hooks, key files.

## Patterns
**Design System**: All frontend design must follow `DESIGN.md`.

- Functional components + hooks only
- `@/` import alias, `cn()` for Tailwind merging
- TypeScript strict — **`any` is forbidden**
- shadcn/ui component patterns
- All mutations must show sonner/toast feedback (success/failure)
- OAuth callbacks: shared OAuthCallbackHandler — no per-provider copies
- `console.log` in committed code is forbidden
- Tailwind arbitrary values (`h-[123px]`) forbidden — use theme tokens
- File uploads: `ApiClient.uploadFile()` — never raw fetch + FormData
- API calls: `ApiClient` methods — no raw `fetch()` in feature code
- Error extraction: `handleApiError(err)` from `@/utils/error` — no inline instanceof checks
- Price formatting: `formatCurrency()` from `@/utils/currency` — no inline `.toLocaleString() + '원'`
- Data fetching: `useAsyncAction` hook — no manual useState(loading) + try/catch/finally

## Responsive & Accessibility
- Responsive: flex/grid based, component-level mobile branching
- Semantic HTML, ARIA labels, keyboard navigation

## Template / CMS System
- Pages built as blocks: hero-banner, product-grid, carousel, category-nav, etc.
- Navigation and categories managed in DB (CMS)

## Testing
- `npm run build && npm run test:run` before push
- Test runner: Vitest
- Single test: `npx vitest run src/components/some/SingleTest.test.tsx`
- With filter: `npx vitest run --reporter=verbose --testNamePattern="test name"`
