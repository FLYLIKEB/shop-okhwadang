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
