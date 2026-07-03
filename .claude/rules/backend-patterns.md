# Backend Patterns

NestJS-specific patterns and utilities. Complements `backend/CLAUDE.md`.

## Adapter Pattern

- **Payments**: `PaymentGateway` interface → Mock, Toss, Stripe, KG Inicis, NaverPay, PayPal adapters. Selected by `PAYMENT_GATEWAY` env.
- **Shipping**: `ShippingProvider` interface → `MockShippingAdapter` and `CjShippingAdapter`; `hanjin`/`lotte` currently fall back to mock. CarrierCode type supports `'mock' | 'cj' | 'hanjin' | 'lotte'`.
- **Storage**: `local` / `s3`. Selected by `STORAGE_PROVIDER` env.
- **Notification/Email**: `EmailProvider` adapters → mock, Resend, SES stub. Selected by `NOTIFICATION_PROVIDER`; `mock` is blocked in production.
- **리뷰 번역 (예외 — adapter 없음)**: `ReviewsService.translateReviewContent`가 keyless Google Translate 비공식 endpoint(`translate.googleapis.com/translate_a/single?client=gtx`)를 직접 호출. env/API key 불필요, 5초 타임아웃, `@Throttle` 30/min, 실패는 502(BadGatewayException)로 매핑. 무SLA 엔드포인트임을 인지한 의도적 KISS 선택 — 유료 API 어댑터화는 실제 장애가 반복될 때만 검토.

## Payment Gateway Selection

- Locale-based checkout exposure uses `getAvailableGatewaysByLocale()` / `resolveGatewayByLocale()` (`ko`: NaverPay first, otherwise PayPal first); selected gateway must be persisted to `payment.gateway`, and later operations (`confirm`, `cancel`, `partialRefund`) must resolve the adapter from the stored `payment.gateway` value — never from the default injected gateway.
- `PaymentGatewayType` 값별 매핑은 1:1 — `MOCK`, `TOSS`, `STRIPE`, `INICIS`, `NAVERPAY`, `PAYPAL` 각각 전용 어댑터를 사용한다. 한 enum 값을 다른 어댑터로 재사용하는 placeholder 패턴 금지.

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

## Common Utilities (`src/common/utils/`)

- **`findOrThrow(repo, where, message, relations?)`** — 엔티티 조회 + NotFoundException. 인라인 `findOne → if (!x) throw` 패턴 금지, 반드시 이 유틸리티 사용.
  ```typescript
  import { findOrThrow } from '../common/utils/repository.util';
  const product = await findOrThrow(this.productRepo, { id }, '상품을 찾을 수 없습니다.');
  ```
- **`assertOwnership(entityUserId, currentUserId, message?)`** — 소유권 검증 + ForbiddenException. 인라인 `Number(x.userId) !== Number(userId)` 비교 금지. BigInt string 비교 버그를 중앙에서 처리.
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

## TypeORM Specifics

- **트랜잭션**: `dataSource.transaction(async (manager) => { ... })` 사용 필수 — `queryRunner` 수동 관리 금지. pessimistic lock이 필요한 경우만 `queryRunner` 허용.
- **Entity 컬럼명 매핑**: DB 컬럼이 `snake_case`이면 TypeScript 프로퍼티가 `camelCase`라도 `@Column({ name: 'snake_case' })` 명시 필수. 프로퍼티명과 컬럼명이 자동 매핑되지 않음.
