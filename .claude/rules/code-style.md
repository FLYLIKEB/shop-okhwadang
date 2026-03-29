# Code Style Rules

## Frontend
- Functional components + hooks only
- `@/` import alias
- `cn()` for Tailwind class merging
- TypeScript strict — **`any` is forbidden**
- shadcn/ui component patterns
- Tailwind arbitrary values (`h-[123px]`) forbidden — use theme tokens
- **All mutations must show sonner/toast feedback** (success/failure)
- `console.log` in committed code is forbidden
- Responsive: flex/grid based, component-level mobile branching
- Accessibility: semantic HTML, ARIA labels, keyboard navigation

## Backend
- Controller → Service → Entity (DI pattern)
- DTO-based input validation (class-validator)
- NestJS built-in exceptions only
- Module structure: `backend/src/modules/{module}/`
- Global prefix: `/api`
- NestJS Logger only — no `console.log`
- Cursor-based pagination for lists
- Redis caching for hot data
- N+1 prevention with TypeORM relations

## Backend Decorator Order
컨트롤러 메서드 데코레이터 순서: Route → Modifier → Status → Guard → Param
```typescript
@Post('endpoint')      // 1. Route
@Public()              // 2. Modifier (@Public, @Roles)
@HttpCode(HttpStatus.OK) // 3. Status
async method(@Body() dto: SomeDto) { }
```

## Backend Type Safety
Guard/Interceptor에서 request 접근 시 타입 명시:
```typescript
const req = context.switchToHttp().getRequest<{ user?: { id: number; role: string } }>();
```

## Common
- TypeScript strict mode everywhere
- No `any` type
- No `console.log` in committed code
- Prefer composition over inheritance
