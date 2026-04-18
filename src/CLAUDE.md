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
- i18n: use `next-intl` (`useTranslations('ns')`) for locale-backed user-facing strings and reusable shared UI. Locale files: `src/i18n/messages/{ko,en,ja,zh}.json`. When values come from enums/keys, map them to translation keys (see `JournalPreviewBlock` `CATEGORY_KEY_MAP`). When adding a locale-backed key, update all 4 locale files.

## Responsive & Accessibility
- Responsive: flex/grid based, component-level mobile branching
- Semantic HTML, ARIA labels, keyboard navigation

## Template / CMS System
- Pages built as blocks: hero-banner, product-grid, carousel, category-nav, etc.
- Navigation and categories managed in DB (CMS)
- **홈 페이지(`/`)는 반드시 DB `pages`(slug=`home`)의 `page_blocks`로만 렌더** — 하드코딩 기본값·폴백 배열·i18n 기반 기본 슬라이드 금지. 빈 블록이면 `throw`. 상세는 `.claude/rules/frontend-patterns.md` "CMS 페이지 렌더링" 섹션 참조

## Testing
- `npm run build && npm run test:run` before push
- Test runner: Vitest
- Single test: `npx vitest run src/components/some/SingleTest.test.tsx`
- With filter: `npx vitest run --reporter=verbose --testNamePattern="test name"`
