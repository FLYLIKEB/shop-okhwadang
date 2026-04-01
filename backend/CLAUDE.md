# Backend CLAUDE.md

NestJS + TypeORM + MySQL backend rules. Inherits root CLAUDE.md.

## Architecture

- **Controller → Service → Entity** (DI pattern)
- DTO-based input validation (class-validator)
- Module structure: `src/modules/{module}/`
- Global prefix: `/api`
- NestJS Logger only — no `console.log`
- NestJS built-in exceptions only (`NotFoundException`, `BadRequestException`, etc.)

## Guard Execution Order

APP_GUARD registration order: **ThrottlerGuard → JwtAuthGuard → RolesGuard**
- RolesGuard depends on `request.user` — must run after JwtAuthGuard
- Changing order breaks RBAC

## Custom Decorators

- `@Public()` — skip JWT auth (login, signup endpoints)
- `@CurrentUser()` — extract `request.user`
- `@Roles(...roles)` — RBAC role restriction

## Decorator Order on Controller Methods

Route → Modifier → Status → Guard → Param

```typescript
@Post('endpoint')           // 1. Route
@Public()                   // 2. Modifier (@Public, @Roles)
@HttpCode(HttpStatus.OK)    // 3. Status
async method(@Body() dto: SomeDto) { }
```

## Type Safety in Guards/Interceptors

```typescript
const req = context.switchToHttp().getRequest<{ user?: { id: number; role: string } }>();
```

## Adapter Pattern

- **Payments**: `PaymentGateway` interface → `MockAdapter` / `TossAdapter` / `InicisAdapter`. Selected by `PAYMENT_GATEWAY` env.
- **Shipping**: `ShippingProvider` interface → `MockAdapter` / `CjAdapter` / `HanjinAdapter` / `LotteAdapter`. Selected by env.
- **Storage**: `local` / `s3` / `r2`. Selected by `STORAGE_PROVIDER` env.

## Database (TypeORM + MySQL 8.0)

- `synchronize: true` **forbidden in production**
- **TypeORM Migration CLI only** — manual SQL files forbidden
- Entity changes must **always be committed with migration file**
- Migration CLI requires SSH tunnel on port 3307:
  ```
  LOCAL_DATABASE_URL=mysql://root:__REDACTED_ROOT_PW__@127.0.0.1:3307/commerce npm run migration:run
  ```
- MySQL does NOT support `DROP FOREIGN KEY IF EXISTS` — use INFORMATION_SCHEMA check helper
- Partially-ran migrations: use `CREATE TABLE IF NOT EXISTS` + existence-check helpers for idempotent `up()`

### Data Types
- `DECIMAL(12,2)` for prices
- `BIGINT` for IDs
- `ENUM` for statuses

### BigInt Serialization
TypeORM returns BIGINT columns as strings. Register JSON replacer in `main.ts`:
```typescript
app.getHttpAdapter().getInstance().set('json replacer', (_key: string, value: unknown) => {
  if (typeof value === 'string' && /^\d+$/.test(value) && Number.isSafeInteger(Number(value))) {
    return Number(value);
  }
  return value;
});
```

## Security

Security pipeline: CORS → Rate Limiting → JWT Guard → ValidationPipe → Controller

- JWT (Access + Refresh Token), RBAC: `user` / `admin` / `super_admin`
- bcrypt hashing (salt rounds 10+)
- Rate limiting — Global: 200 req/min, Auth: 30 req/min
- `ValidationPipe` globally: `whitelist: true`, `forbidNonWhitelisted: true`
- `app.use(helmet())` in `main.ts`
- Server-side payment amount validation mandatory
- CORS: `FRONTEND_URL` + `FRONTEND_URLS` (comma-separated), `credentials: true`, no wildcard in prod
- Log redaction: `password`, `token`, `authorization`, `credit_card`, `cvv` → `[REDACTED]`

## Testing

- Unit tests: `npm run build && npm run test`
- E2E tests: `npm run test:e2e` — **required for any entity/migration/DB change**

## Common Utilities (`src/common/utils/`)

- **`findOrThrow(repo, where, message, relations?)`** — 엔티티 조회 + NotFoundException. 인라인 `findOne → if (!x) throw` 패턴 금지, 반드시 이 유틸리티 사용.
  ```typescript
  import { findOrThrow } from '../common/utils/repository.util';
  const product = await findOrThrow(this.productRepo, { id }, '상품을 찾을 수 없습니다.');
  ```

## Key Directories

```
src/modules/        # Feature modules (auth, products, orders, payments, etc.)
src/database/       # TypeORM migrations & config
src/common/         # Guards, pipes, interceptors
```
