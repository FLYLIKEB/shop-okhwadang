# Database Rules

## Stack
- MySQL 8.0, TypeORM, charset `utf8mb4`

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
