---
globs: ["backend/src/database/**", "backend/src/modules/**/*.entity.ts", "backend/src/modules/**/*.migration.ts"]
---
# Database

## Stack
MySQL 8.0, TypeORM, utf8mb4

## Migration
- TypeORM CLI only (no manual SQL), `synchronize: true` forbidden in prod
- Entity + migration must be committed together
- SSH tunnel port 3307 for migration CLI
- MySQL: no `DROP FOREIGN KEY IF EXISTS` → use INFORMATION_SCHEMA check
- Idempotent: `CREATE TABLE IF NOT EXISTS` + existence checks

## Types
- Prices: `DECIMAL(12,2)`, IDs: `BIGINT`, Statuses: `ENUM`
- BIGINT → string from TypeORM, JSON replacer in main.ts converts safe integers

## Tables (22)
- Core: users, user_authentications, user_addresses, categories, products, product_options, product_images
- Orders: orders, order_items, payments, shipping
- Engagement: reviews, wishlist, coupons, user_coupons, point_history
- CMS: pages, page_blocks, navigation_items

## State Machines
- Order: pending→paid→preparing→shipped→delivered→completed (or cancelled/refund*)
- Payment: pending→confirmed→cancelled/refunded
- Shipping: payment_confirmed→preparing→shipped→in_transit→delivered

## Soft Delete
users: `is_active`, reviews: `is_visible`, coupons: `is_active`
