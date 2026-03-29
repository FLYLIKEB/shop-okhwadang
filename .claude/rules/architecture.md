# Architecture Rules

## Tech Stack
- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript + TailwindCSS v4 + Radix UI (shadcn/ui)
- **Backend**: NestJS + TypeORM + MySQL 8.0
- **Auth**: JWT (Access + Refresh Token) + OAuth (Kakao/Google)
- **Cache**: Redis
- **Storage**: S3/R2 compatible (selected by `STORAGE_PROVIDER` env)
- **Runtime**: Node.js 22

## Backend Pattern
- **Controller → Service → Entity** with DI (NestJS standard)
- DTO-based input validation (class-validator)
- Module structure: `backend/src/modules/{module}/`
- Global prefix: `/api`
- NestJS Logger only — no `console.log`
- NestJS built-in exceptions only (`NotFoundException`, `BadRequestException`, etc.)

## Adapter Pattern (Interface Abstraction)
- **Payments**: `PaymentGateway` interface → `MockAdapter` / `TossAdapter` / `InicisAdapter`. Selected by `PAYMENT_GATEWAY` env.
- **Shipping**: `ShippingProvider` interface → `MockAdapter` / `CjAdapter` / `HanjinAdapter` / `LotteAdapter`. Selected by env.
- **Storage**: `local` / `s3` / `r2`. Selected by `STORAGE_PROVIDER` env.

## Frontend Pattern
- Functional components + hooks only
- `@/` import alias
- `cn()` for Tailwind class merging
- TypeScript strict — **`any` is forbidden**
- shadcn/ui component patterns
- Sonner for toast notifications — **all mutations must show toast feedback**
- Template system: pages as blocks (hero-banner, product-grid, carousel, category-nav, etc.)
- CMS: navigation and categories managed in DB

## SEO
- SSR via React Server Components
- Next.js Metadata API for meta tags
- JSON-LD structured data for products (price, rating, stock)
- Sitemap generation

## Project Structure
```
src/                    # Frontend (Next.js 15 App Router)
├── app/                # Pages & layouts
├── components/         # Reusable UI + shadcn/ui wrappers
├── lib/                # API client, global logic
└── contexts/           # Auth, Cart state
backend/                # Backend (NestJS)
├── src/modules/        # Feature modules (auth, products, orders, payments, etc.)
├── src/database/       # TypeORM migrations & config
└── src/common/         # Guards, pipes, interceptors
docs/                   # API specs & operational docs
```

## Guard 실행 순서 (Backend)
APP_GUARD 등록 순서: **ThrottlerGuard → JwtAuthGuard → RolesGuard**
- RolesGuard는 request.user에 의존하므로 반드시 JwtAuthGuard 이후에 실행되어야 함
- 순서 변경 시 RBAC 동작 안 함

## Custom Decorators (Backend)
- `@Public()` — JWT 인증 건너뛰기 (로그인, 회원가입 등)
- `@CurrentUser()` — request.user 추출
- `@Roles(...roles)` — RBAC 역할 제한

## Deploy Structure
```
Client → Vercel CDN + Vercel Functions (api/proxy.ts) → AWS EC2 t3.small (NestJS :3000) → AWS Lightsail MySQL :3306
```
