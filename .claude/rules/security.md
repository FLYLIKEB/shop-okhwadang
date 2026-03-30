---
globs: ["backend/src/**/*.ts", "src/**/*.ts"]
---
# Security

## Pipeline
CORS → Rate Limiting → JWT Guard → ValidationPipe → Controller

## Auth
- JWT (Access+Refresh), RBAC: user/admin/super_admin, OAuth: Kakao/Google
- bcrypt salt 10+

## Rate Limiting
- Global: 200/min, Auth: 30/min
- Override: `@Throttle({ auth: { limit: 30, ttl: 60000 } })`

## Validation
- DTO + class-validator, `whitelist: true`, `forbidNonWhitelisted: true`

## Payment
- Server-side amount validation, PG webhook signature verify, server-only state transitions

## Keys
- `.env` gitignored, `.env.example` committed (names only)
- `.pem`/`.key` gitignored, SSH keys in `~/.ssh/` only

## Headers & Logging
- helmet() in main.ts
- LoggingInterceptor redacts: password, token, authorization, credit_card, cvv → `[REDACTED]`

## CORS
- `FRONTEND_URL` + `FRONTEND_URLS` (comma-separated), `credentials: true`, no wildcard in prod
