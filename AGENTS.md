# AGENTS.md

This file provides guidance to AI agents working in this repository.

## Project Overview

**옥화당 자사몰** — Korean traditional tea (자사호, 보이차, 다구) D2C shopping mall

- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript + TailwindCSS v4 + Radix UI
- **Backend**: NestJS + TypeORM + MySQL 8.0
- **Runtime**: Node.js 22.x

## Build/Lint/Test Commands

### Frontend (root directory)

```bash
# Development
npm run dev                    # Next.js dev server on port 5173
npm run build                  # Production build
npm run start                  # Start production server

# Testing
npm run test                   # Run tests in watch mode (Vitest)
npm run test:run               # Run tests once
npm run test:coverage          # Run tests with coverage

# Linting
npm run lint                   # ESLint (Next.js config)
```

**Running a single test:**
```bash
npx vitest run src/components/some/SingleTest.test.tsx
# or with filter
npx vitest run --reporter=verbose --testNamePattern="test name"
```

### Backend (`backend/` directory)

```bash
# Development
npm run start:dev              # NestJS watch mode

# Testing
npm run test                   # Jest unit tests
npm run test:watch             # Jest watch mode
npm run test:cov               # With coverage
npm run test:e2e               # E2E tests (REQUIRED for DB schema changes)

# Building
npm run build                  # TypeORM build

# Linting
npm run lint                   # ESLint (max-warnings 0)
```

### Full-stack local development

```bash
bash scripts/start-local.sh    # SSH tunnel + Backend :3000 + Frontend :5173
bash scripts/stop-local.sh    # Stop all
```

### Pre-push Checklist

```bash
# Frontend
npm run build && npm run test:run

# Backend
cd backend && npm run build && npm run test

# DB schema changes
cd backend && npm run test:e2e
```

---

## Code Style Guidelines

### TypeScript

- **Strict mode enforced** — `any` type is **forbidden**
- Prefer `unknown` over `any` when type is truly unknown
- Use explicit return types for public functions
- Prefer `interface` over `type` for object shapes (extensibility)

### Frontend (React/Next.js)

**Design System**: Follow `DESIGN.md` for all design decisions (colors, typography, spacing, components).

#### Components
- **Functional components + hooks only** — no class components
- Use `forwardRef` for component refs that need DOM access
- Co-locate test files: `Component.tsx` + `Component.test.tsx`

#### Imports
- Use `@/` alias for internal imports (configured in tsconfig)
- Order: React → external libs → internal (`@/`) → relative
- Named exports preferred; default exports only for pages/layouts

```typescript
import { useState, useEffect } from 'react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import type { Product } from '@/lib/api';
```

#### Styling (TailwindCSS v4)
- **Tailwind arbitrary values (`h-[123px]`) are FORBIDDEN** — use theme tokens
- Use `cn()` (classnames + tailwind-merge) for conditional classes
- shadcn/ui patterns: CVA (class-variance-authority) for component variants

```typescript
import { cn } from '@/components/ui/utils';

// Good
<div className={cn('flex gap-4', isActive && 'bg-primary')}

// Bad
<div className={`flex gap-4 ${isActive ? 'bg-primary' : ''}`}>
```

#### State & Side Effects
- All mutations must show **sonner toast feedback** (success/failure)
- No `console.log` in committed code — use Sonner or proper logging
- All `useEffect` dependencies must be exhaustive (no suppressions)

#### Accessibility
- Semantic HTML elements
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus management for modals/dialogs

### Backend (NestJS)

#### Architecture
- **Controller → Service → Entity** (Dependency Injection pattern)
- DTO-based input validation using `class-validator`
- Module structure: `src/modules/{module}/`
- Global prefix: `/api`

#### Decorator Order (Controller methods)
```
@Post('endpoint')           // 1. Route
@Public()                   // 2. Modifier (@Public, @Roles)
@HttpCode(HttpStatus.OK)    // 3. Status
async method(@Body() dto: SomeDto) { }
```

#### Exceptions
- **NestJS built-in exceptions only** — `NotFoundException`, `BadRequestException`, etc.
- No `throw new Error()` — use NestJS exceptions
- No `console.log` — use `Logger` from `@nestjs/common`

#### Type Safety
```typescript
// In guards/interceptors, always type the request
const req = context.switchToHttp().getRequest<{ user?: { id: number; role: string } }>();
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ProductCard.tsx` |
| Hooks | camelCase `use` prefix | `useAuth.ts` |
| Utils/functions | camelCase | `formatPrice.ts` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Types/Interfaces | PascalCase | `ProductResponse` |
| Enums | PascalCase members | `OrderStatus.PENDING` |
| Files (components) | PascalCase | `Button.tsx` |
| Files (hooks/utils) | camelCase | `useAuth.ts` |
| Database columns | snake_case | `created_at` |
| API endpoints | kebab-case | `/order-status` |

### Error Handling

**Frontend:**
```typescript
try {
  await submitForm(data);
  toast.success('Success message');
} catch (err) {
  toast.error(err instanceof Error ? err.message : 'Something went wrong');
}
```

**Backend:**
```typescript
// Good
throw new NotFoundException('Product not found');

// Bad
throw new Error('Product not found');
```

### Git Workflow

**Branch:** `feature/issue-{number}-{description}` from `main` only

**Commits (Korean):**
- `feat: #번호 설명`
- `fix: #번호 설명`
- `refactor:` / `docs:` / `style:` / `test:` / `chore:`

**PR:**
- Title with issue number
- Body must include `Closes #번호`
- Merge: `gh pr merge --merge --delete-branch` (no squash)

---

## Security

### Frontend Security
- Sanitize user input with `isomorphic-dompurify` or DOMPurify
- Validate all data from API (don't trust client-side validation)

### Backend Security
- **Server-side payment amount validation is mandatory**
- Log redaction: `password`, `token`, `authorization`, `credit_card`, `cvv` → `[REDACTED]`
- Environment variables: `.env` never committed, `.env.example` only key names
- CORS: `credentials: true`, no wildcard in production

---

## Architecture Patterns

### Adapter Pattern (Backend)
- **Payments**: `PaymentGateway` interface → `MockAdapter` / `TossAdapter` / `InicisAdapter`
- **Shipping**: `ShippingProvider` interface → `MockAdapter` / `CjAdapter` / `HanjinAdapter`
- **Storage**: `local` / `s3` / `r2` — selected by env var

### Guard Execution Order (Backend)
**ThrottlerGuard → JwtAuthGuard → RolesGuard**
- `RolesGuard` depends on `request.user` — must run after `JwtAuthGuard`

### Custom Decorators (Backend)
- `@Public()` — skip JWT auth
- `@CurrentUser()` — extract `request.user`
- `@Roles(...roles)` — RBAC role restriction

---

## Database Rules

- `synchronize: true` **forbidden in production**
- **TypeORM Migration CLI only** — manual SQL files forbidden
- Entity changes must **always be committed with migration file**
- DB schema changes require **E2E tests** (`npm run test:e2e`)
- Data types: `DECIMAL(12,2)` for prices, `BIGINT` for IDs, `ENUM` for statuses

---

## Project Structure

```
shop-okhwadang/
├── src/                      # Frontend (Next.js 15 App Router)
│   ├── app/                  # Pages & layouts
│   ├── components/           # Reusable UI + shadcn/ui
│   │   ├── ui/              # Base components (Button, Input, etc.)
│   │   └── ...              # Feature components
│   ├── lib/                  # API client, validators
│   ├── contexts/            # AuthContext, CartContext
│   └── hooks/               # Custom hooks
├── backend/                  # Backend (NestJS)
│   └── src/
│       ├── modules/         # Feature modules
│       ├── database/        # TypeORM migrations
│       └── common/         # Guards, pipes, interceptors
├── docs/                    # Architecture & API docs
└── scripts/                 # Dev helper scripts
```

---

## Key Files

| Purpose | File |
|---------|------|
| Frontend API client | `src/lib/api.ts` |
| Auth context | `src/contexts/AuthContext.tsx` |
| Cart context | `src/contexts/CartContext.tsx` |
| Toast notifications | Sonner (imported in layout) |
| Backend main | `backend/src/main.ts` |
| TypeORM config | `backend/src/database/typeorm.config.ts` |
