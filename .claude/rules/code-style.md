---
globs: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]
---
# Code Style Rules

## Frontend
- Functional components + hooks only
- `@/` import alias
- `cn()` for Tailwind class merging
- TypeScript strict — **`any` is forbidden**
- shadcn/ui component patterns
- Tailwind arbitrary values (`h-[123px]`) forbidden — use theme tokens
- **All mutations must show sonner/toast feedback** (success/failure)
- Error extraction: always use `handleApiError(err)` from `@/utils/error` — never inline `err instanceof Error ? err.message : ...`
- Toast errors: use `toast.error(handleApiError(err))` pattern
- `console.log` in committed code is forbidden
- Silent `.catch(() => {})` is forbidden — all catch blocks must handle errors (log, toast, or set error state)
- API calls must go through `ApiClient` methods — no raw `fetch()` in feature code
- File uploads: use `ApiClient.uploadFile()` — never bypass ApiClient with raw fetch + FormData
- API error messages: all user-facing fallback messages must be Korean — no English fallbacks in catch blocks
- Price formatting: always use `formatCurrency()` from `@/utils/currency` — no inline `.toLocaleString() + '원'`, no local format functions
- Data fetching: use `useAsyncAction` hook from `@/hooks` — no manual useState(loading) + try/catch/finally patterns
- Responsive: flex/grid based, component-level mobile branching
- Accessibility: semantic HTML, ARIA labels, keyboard navigation
- Wishlist toggle: use `useWishlistToggle(productId)` hook with optimistic update — no inline wishlist state management

## Backend
- Controller → Service → Entity (DI pattern)
- DTO-based input validation (class-validator)
- NestJS built-in exceptions only
- Module structure: `backend/src/modules/{module}/`
- Global prefix: `/api`
- NestJS Logger only — no `console.log`
- Cursor-based pagination for lists
- Redis caching for hot data
- N+1 prevention with TypeORM relations
- Error response format: consistent structure `{ statusCode, message, error }` across all services — shipping included
- ValidationPipe error messages: must be Korean — configure exceptionFactory to translate class-validator messages
- **`findOrThrow(repo, where, message, relations?)`** — 인라인 `findOne → null check → throw` 패턴 금지. `backend/src/common/utils/repository.util.ts`에서 import 필수.

## Backend Decorator Order
컨트롤러 메서드 데코레이터 순서: Route → Modifier → Status → Guard → Param
```typescript
@Post('endpoint')      // 1. Route
@Public()              // 2. Modifier (@Public, @Roles)
@HttpCode(HttpStatus.OK) // 3. Status
async method(@Body() dto: SomeDto) { }
```

## Backend Type Safety
Guard/Interceptor에서 request 접근 시 타입 명시:
```typescript
const req = context.switchToHttp().getRequest<{ user?: { id: number; role: string } }>();
```

## Common
- TypeScript strict mode everywhere
- No `any` type
- No `console.log` in committed code
- Prefer composition over inheritance
