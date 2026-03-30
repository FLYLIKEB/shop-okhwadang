---
globs: ["**/*.ts", "**/*.tsx"]
---
# Architecture

## Backend Pattern
- Controller → Service → Entity (DI), DTO validation (class-validator)
- Module: `backend/src/modules/{module}/`
- Prefix: `/api`, Logger only (no console.log), built-in exceptions only

## Adapters
- Payment: `PaymentGateway` → Mock/Toss/Inicis (env: `PAYMENT_GATEWAY`)
- Shipping: `ShippingProvider` → Mock/Cj/Hanjin/Lotte (env)
- Storage: local/s3/r2 (env: `STORAGE_PROVIDER`)

## Frontend Pattern
- Functional components + hooks, `@/` alias, `cn()` merge
- strict TS, no `any`, shadcn/ui, Sonner toast on all mutations
- Template blocks: hero-banner, product-grid, carousel, category-nav
- SSR (RSC), Metadata API, JSON-LD, sitemap

## Guards (Backend)
APP_GUARD order: ThrottlerGuard → JwtAuthGuard → RolesGuard (순서 필수)

## Decorators
- `@Public()` skip JWT, `@CurrentUser()` extract user, `@Roles()` RBAC

## Structure
```
src/app|components|lib|contexts/    # Frontend
backend/src/modules|database|common/ # Backend
```
