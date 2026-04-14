# Backend CLAUDE.md

NestJS + TypeORM + MySQL. Inherits root CLAUDE.md. See `.claude/rules/backend-patterns.md` for utilities/Swagger/adapters.

## Architecture
- **Controller → Service → Entity** (DI pattern), DTO validation (class-validator)
- Module structure: `src/modules/{module}/`, global prefix `/api`
- NestJS Logger only — no `console.log`
- NestJS built-in exceptions only (`NotFoundException`, `BadRequestException`, etc.)
- Cursor-based pagination, in-memory caching (CacheService), N+1 prevention via TypeORM relations
- Error response: `{ statusCode, message, error }`
- ValidationPipe messages must be Korean (configure exceptionFactory)

## Guard Execution Order
APP_GUARD order: **ThrottlerGuard → JwtAuthGuard → RolesGuard**. RolesGuard depends on `request.user` — must run after JwtAuthGuard.

## Public API Endpoints
**모든 공개 API 컨트롤러는 반드시 `@Public()`을 명시.** 전역 `JwtAuthGuard`가 기본 적용되므로, 인증 불필요 엔드포인트도 `@Public()` 없으면 401. 새 컨트롤러 생성 시 공개 여부를 먼저 판단하고 `@Public()` 또는 `@ApiCookieAuth()` 명확히 표시.

## Custom Decorators
- `@Public()` — skip JWT auth
- `@CurrentUser()` — extract `request.user`
- `@Roles(...roles)` — RBAC role restriction

## Decorator Order
Route → Modifier → Status → Guard → Param
```typescript
@Post('endpoint')
@Public()
@HttpCode(HttpStatus.OK)
async method(@Body() dto: SomeDto) { }
```

## Type Safety in Guards/Interceptors
```typescript
const req = context.switchToHttp().getRequest<{ user?: { id: number; role: string } }>();
```

## Security
See `.claude/rules/security.md`. Backend additions:
- `app.use(helmet())` in `main.ts`
- Server-side payment amount validation mandatory
- PG webhook signature verification
- Payment state transitions server-only

## Testing
- Unit: `npm run build && npm run test`
- E2E: `npm run test:e2e` — **required for entity/migration/DB changes**

## Key Directories
```
src/modules/     # Feature modules
src/database/    # TypeORM migrations & config
src/common/      # Guards, pipes, interceptors, utils
```
