---
globs: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]
---
# Code Style Rules

Cross-cutting rules that apply to both frontend and backend.

## Error Handling
- Silent `.catch(() => {})` is forbidden — all catch blocks must handle errors (log, toast, or set error state)
- **Server Component API errors**: always `throw error` from catch block so Next.js error boundary catches it — never silently swallow with `catch { data = [] }`
- **Error boundary required**: for any page with data fetching, create `error.tsx` sibling file with retry button
- No `console.log` in committed code

## TypeScript
- TypeScript strict mode everywhere
- No `any` type — use `unknown` when type is truly unknown
- Prefer composition over inheritance
- Explicit return types for public functions
- Prefer `interface` over `type` for object shapes (extensibility)

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ProductCard.tsx` |
| Hooks | camelCase `use` prefix | `useAuth.ts` |
| Utils/functions | camelCase | `formatPrice.ts` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Types/Interfaces | PascalCase | `ProductResponse` |
| Enums | PascalCase members | `OrderStatus.PENDING` |
| Files (components) | PascalCase | `Button.tsx` |
| Files (hooks/utils) | camelCase | `useAuth.ts` |
| Database columns | snake_case | `created_at` |
| API endpoints | kebab-case | `/order-status` |

## Frontend-Specific
- `@/` import alias for internal imports
- `cn()` (classnames + tailwind-merge) for conditional Tailwind classes
- Sonner toast for all mutations (success/failure)
- Error extraction: always use `handleApiError(err)` from `@/utils/error`
- API calls must go through `ApiClient` methods — no raw `fetch()` in feature code
- File uploads: use `ApiClient.uploadFile()`
- Price formatting: always use `formatCurrency()` from `@/utils/currency`
- Data fetching: use `useAsyncAction` hook
- Tailwind arbitrary values (`h-[123px]`) forbidden — use theme tokens
- shadcn/ui component patterns with CVA for variants

## Backend-Specific
- Cursor-based pagination for lists
- In-memory caching for hot data (`CacheService`)
- N+1 prevention with TypeORM relations
- Error response format: consistent `{ statusCode, message, error }`
- ValidationPipe error messages: must be Korean (configure exceptionFactory)
- **`findOrThrow(repo, where, message, relations?)`** — use utility from `repository.util.ts`, never inline `findOne → null check → throw`
