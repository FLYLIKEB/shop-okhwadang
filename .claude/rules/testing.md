---
globs: ["**/*.spec.ts", "**/*.test.ts", "**/*.e2e-spec.ts", "**/*.test.tsx"]
---
# Testing Rules

## Frontend
- `npm run build && npm run test:run` before any push
- Test runner: Vitest (via `npm run test:run`)

## Backend
- `cd backend && npm run build && npm run test` for unit tests
- `cd backend && npm run test:e2e` for E2E — **required for DB schema changes**

## When to Run E2E
- Any entity change
- Any migration file added
- Any DB-related service change
