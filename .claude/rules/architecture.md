---
globs: ["**/*.ts", "**/*.tsx"]
---
# Architecture Rules

Shared architectural concerns for both frontend and backend.

## Tech Stack
- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript + TailwindCSS v4 + Radix UI (shadcn/ui)
- **Backend**: NestJS + TypeORM + MySQL 8.0
- **Auth**: JWT (Access + Refresh Token) + OAuth (Kakao/Google)
- **Cache**: Redis
- **Storage**: S3/R2 compatible (selected by `STORAGE_PROVIDER` env)
- **Runtime**: Node.js 22

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

## SEO
- SSR via React Server Components
- Next.js Metadata API for meta tags
- JSON-LD structured data for products (price, rating, stock)
- Sitemap generation

## Deploy Structure
```
Client → Vercel CDN + Vercel Functions (api/proxy.ts) → AWS EC2 t3.small (NestJS :3000) → AWS Lightsail MySQL :3306
```


