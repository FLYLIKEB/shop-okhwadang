---
globs: ["**/*.spec.ts", "**/*.test.ts", "**/*.e2e-spec.ts", "**/*.test.tsx"]
---
# Testing

- Frontend: `npm run build && npm run test:run` (Vitest)
- Backend unit: `cd backend && npm run build && npm run test`
- Backend E2E: `cd backend && npm run test:e2e` — required for entity/migration/DB service changes
