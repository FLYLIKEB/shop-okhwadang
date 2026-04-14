---
globs: ["backend/src/database/**", "backend/src/modules/**/*.entity.ts", "backend/src/modules/**/*.migration.ts"]
---
# Database Rules

## Stack
- MySQL 8.0, TypeORM, charset `utf8mb4`

## Seed Data Insertion
- **UTF-8 encoding is mandatory** — always use `SET NAMES utf8mb4;` before INSERT/UPDATE when inserting Korean or other non-ASCII text via `docker exec mysql`
- Heredoc syntax (`<<'EOSQL'`) is recommended to avoid shell escaping issues
- Single-row INSERTs are safer for avoiding encoding corruption

## Migration
- **TypeORM Migration CLI only** — manual SQL files forbidden
- `synchronize: true` **forbidden in production**
- Entity changes must **always be committed with migration file**
- Migration CLI requires SSH tunnel on port 3307:
  ```
  LOCAL_DATABASE_URL=mysql://root:changeme_root_password@127.0.0.1:3307/commerce npm run migration:run
  ```
- MySQL does NOT support `DROP FOREIGN KEY IF EXISTS` — use INFORMATION_SCHEMA check helper (see `AddOrdersTables` migration)
- Partially-ran migrations: use `CREATE TABLE IF NOT EXISTS` + existence-check helpers for idempotent `up()`

## Data Types
- `DECIMAL(12,2)` for prices
- `BIGINT` for IDs
- `ENUM` for statuses

## Key Tables (22 total)
- **Core**: users, user_authentications, user_addresses, categories, products, product_options, product_images
- **Orders**: orders, order_items, payments, shipping
- **Engagement**: reviews, wishlist, coupons, user_coupons, point_history
- **CMS**: pages, page_blocks, navigation_items

## State Machines
- **Order**: pending → paid → preparing → shipped → delivered → completed (or cancelled/refund_requested/refunded)
- **Payment**: pending → confirmed → cancelled/refunded
- **Shipping**: payment_confirmed → preparing → shipped → in_transit → delivered

## Soft Delete
- Users: `is_active` flag
- Reviews: `is_visible` flag
- Coupons: `is_active` flag

## BigInt 직렬화
TypeORM은 BIGINT 컬럼을 string으로 반환한다. main.ts에서 JSON replacer를 등록하여 safe integer string을 number로 변환:
```typescript
app.getHttpAdapter().getInstance().set('json replacer', (_key: string, value: unknown) => {
  if (typeof value === 'string' && /^\d+$/.test(value) && Number.isSafeInteger(Number(value))) {
    return Number(value);
  }
  return value;
});
```

## Environments
- Dev: local Docker MySQL
- Test: local Docker (separate DB with "test" in name)
- Staging: Lightsail via SSH tunnel
- Prod: Lightsail direct

## Lightsail MySQL (Prod) 운영 규칙

- **인스턴스**: `okhwadang-prod-db` (MySQL 8.0, ap-northeast-2a, micro_2_0)
- **민감값 저장소**: `.env.secrets` (gitignored). 문서/코드에는 키 이름만 기재하고 실제 값은 절대 커밋 금지 (`.claude/rules/sensitive-info.md` 참조)
- **접근 통제 방식**: Lightsail DB는 `publiclyAccessible=true`지만 **MySQL 사용자 host 제한**으로 접근 통제
  - `dbadmin@%` — 관리 전용, 일반 앱 사용 금지
  - `okhwadang_app@172.31.8.153` — EC2 사설IP에서만 접속 허용, `commerce.*` 권한만
- **EC2 재생성 시 사설IP가 바뀌면** `dbadmin`으로 붙어 `okhwadang_app@<new-private-ip>` 재등록 필요
- **VPC peering** 활성: EC2 VPC(`vpc-02836c09f4af7ddbb`) ↔ Lightsail VPC. EC2에서 endpoint로 접속하면 private IP(`172.26.x.x`)로 라우팅됨 — 접속 로그의 소스 IP는 사설IP 기준
- **마이그레이션**: EC2 내부에서 직접 실행하거나, 로컬에서는 EC2 bastion 경유 SSH 터널(`3307`) 사용
- **관련 문서**: `docs/infrastructure/REMOTE_DB_ACCESS.md`, `docs/infrastructure/DEPLOYMENT.md`, `docs/infrastructure/ENVIRONMENT_VARIABLES.md`

## In-memory Cache Rules

백엔드 프로세스 내 `CacheService` (Map 기반, TTL 지원). 외부 의존성 없음.

**Cache invalidation:**
- API 경유 수정(`bulkUpdate`, `resetToDefaults`) 시 `settings:*` 키 자동 삭제
- **DB를 SQL로 직접 수정**한 경우 캐시가 stale 상태. 백엔드 프로세스 재시작(PM2 `pm2 restart commerce` 또는 로컬 `bash scripts/start-local.sh`)으로 초기화
- Cache TTL: `settings:*` = 3600 seconds (1 hour)

**특성:**
- 프로세스 메모리 상주 → 재시작 시 캐시 소실(부팅 직후 첫 요청이 DB 조회, 이후 TTL 동안 캐시)
- 단일 인스턴스 전제. 다중 인스턴스/cluster 모드 전환 시 외부 캐시(Redis 등) 재도입 검토
