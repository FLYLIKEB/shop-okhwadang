# Backend CLAUDE.md

NestJS + TypeORM + MySQL backend rules. Inherits root CLAUDE.md.

## Architecture

- **Controller → Service → Entity** (DI pattern)
- DTO-based input validation (class-validator)
- Module structure: `src/modules/{module}/`
- Global prefix: `/api`
- NestJS Logger only — no `console.log`
- NestJS built-in exceptions only (`NotFoundException`, `BadRequestException`, etc.)
- Cursor-based pagination for lists
- Redis caching for hot data
- N+1 prevention with TypeORM relations
- Error response format: consistent `{ statusCode, message, error }` across all services
- ValidationPipe error messages: must be Korean — configure exceptionFactory to translate class-validator messages

## Guard Execution Order

APP_GUARD registration order: **ThrottlerGuard → JwtAuthGuard → RolesGuard**
- RolesGuard depends on `request.user` — must run after JwtAuthGuard
- Changing order breaks RBAC

## Public API Endpoints

**모든 공개 API 컨트롤러(로그인/회원가입/ публичная 정보 조회 등)는 반드시 `@Public()`을 명시적으로 붙여야 합니다.**

- 전역 `JwtAuthGuard`가 기본 적용되므로, 인증이 필요 없는 엔드포인트도 `@Public()` 없으면 401 반환
- 새 컨트롤러 생성 시 공개 여부를 먼저 판단하고 `@Public()` 또는 `@ApiCookieAuth()` 명확히 표시
- `GET /journals` · `GET /journals/:slug` · `GET /archives` 등 외부 공개 페이지는 반드시 `@Public()`

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

See `.claude/rules/database.md` for full migration/schema rules. Backend-specific additions:

- **트랜잭션**: `dataSource.transaction(async (manager) => { ... })` 사용 필수 — `queryRunner` 수동 관리(`connect/startTransaction/commit/rollback/release`) 금지. 단, pessimistic lock이 필요한 경우는 `queryRunner` 허용.
- **Entity 컬럼명 매핑**: DB 컬럼이 `snake_case`이면 TypeScript 프로퍼티가 `camelCase`더라도 `@Column({ name: 'snake_case' })` 명시 필수. 프로퍼티명과 컬럼명이 자동 매핑되지 않음 — `readTime` 프로퍼티에 `read_time` 컬럼을 사용하려면 반드시 `name` 옵션 필요.

## API Documentation (Swagger/OpenAPI)

- **Swagger UI**: `GET /api/docs`
- **JSON Spec**: `GET /api/docs-json`
- All DTOs must use `@nestjs/swagger` decorators (`ApiProperty`, `ApiPropertyOptional`)
- Controllers must use `ApiTags`, `ApiOperation`, `ApiResponse` decorators
- Auth endpoints use cookie-based auth: `accessToken`, `refreshToken`

### DTO Example
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: '옥화당 보리차 100g' })
  name: string;

  @ApiPropertyOptional({ example: 15000 })
  price?: number;
}
```

### Controller Example
```typescript
@ApiTags('Products')
@ApiOperation({ summary: '상품 목록 조회' })
@ApiResponse({ status: 200, description: '성공' })
@ApiResponse({ status: 401, description: '인증 실패' })
@Get()
async findAll() { }
```

## Security

See `.claude/rules/security.md` for full security rules. Backend-specific additions:

- `app.use(helmet())` in `main.ts` — CSP, X-Frame-Options, X-Content-Type-Options etc.
- Server-side payment amount validation mandatory
- PG webhook signature verification
- Payment state transitions server-only

## Testing

- Unit tests: `npm run build && npm run test`
- E2E tests: `npm run test:e2e` — **required for any entity/migration/DB change**

### When to Run E2E
- Any entity change
- Any migration file added
- Any DB-related service change

## Common Utilities (`src/common/utils/`)

- **`findOrThrow(repo, where, message, relations?)`** — 엔티티 조회 + NotFoundException. 인라인 `findOne → if (!x) throw` 패턴 금지, 반드시 이 유틸리티 사용.
  ```typescript
  import { findOrThrow } from '../common/utils/repository.util';
  const product = await findOrThrow(this.productRepo, { id }, '상품을 찾을 수 없습니다.');
  ```
- **`assertOwnership(entityUserId, currentUserId, message?)`** — 소유권 검증 + ForbiddenException. 인라인 `Number(x.userId) !== Number(userId)` 비교 금지, 반드시 이 유틸리티 사용. BigInt string 비교 버그를 중앙에서 처리.
  ```typescript
  import { assertOwnership } from '../common/utils/ownership.util';
  assertOwnership(order.userId, userId);
  ```
- **`applyLocale(entity, locale, fields[])`** — 다국어 필드 매핑. 서비스 내 private applyLocale에서 위임. 로케일 맵 하드코딩 금지.
  ```typescript
  import { applyLocale } from '../common/utils/locale.util';
  return applyLocale(product, locale, ['name', 'description', 'shortDescription']);
  ```
- **`reorderEntities(repo, items, sortField?)`** — 정렬순서 일괄 업데이트 (Promise.all 병렬). 순차 for-of await 금지.
  ```typescript
  import { reorderEntities } from '../common/utils/reorder.util';
  await reorderEntities(this.repo, items);
  ```
- **`buildTree(items, idKey?, parentKey?)`** — 플랫 목록을 parent-child 트리로 변환. 인라인 Map 기반 트리 빌드 금지.
  ```typescript
  import { buildTree } from '../common/utils/tree.util';
  return buildTree(categories, 'id', 'parentId');
  ```
- **`paginate(qb, { page?, limit? })`** — QueryBuilder 페이지네이션. 인라인 `skip/take/getManyAndCount` 금지. 기본 limit=20.
  ```typescript
  import { paginate, PaginatedResult } from '../common/utils/pagination.util';
  return paginate(qb, { page, limit });
  ```

## Key Directories

```
src/modules/        # Feature modules (auth, products, orders, payments, etc.)
src/database/       # TypeORM migrations & config
src/common/         # Guards, pipes, interceptors
```
