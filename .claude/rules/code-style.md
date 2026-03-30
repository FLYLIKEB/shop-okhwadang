---
globs: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]
---
# Code Style

## Frontend
- No `any`, no `console.log`, no Tailwind arbitrary values (`h-[123px]`)
- Responsive: flex/grid, semantic HTML, ARIA, keyboard nav

## Backend
- Cursor-based pagination, Redis caching, N+1 prevention
- Decorator order: Route → Modifier → Status → Param
- Guard/Interceptor request typing: `getRequest<{ user?: { id: number; role: string } }>()`

## Common
- strict TS, no `any`, no `console.log`, composition over inheritance
