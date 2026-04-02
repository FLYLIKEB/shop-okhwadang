---
globs: ["backend/src/**/*.ts", "src/**/*.ts"]
---
# Security Rules

Shared security rules for both frontend and backend.

## Security Pipeline
CORS validation → Rate Limiting → JWT Guard → ValidationPipe → Controller

## Authentication
- JWT (Access + Refresh Token)
- RBAC: `user` / `admin` / `super_admin` with `@Roles()` decorator
- OAuth: Kakao, Google
- bcrypt hashing (salt rounds 10+)
- Token refresh: silent refresh via refresh token before redirect

## Frontend 401 Handling
- Global interceptor in ApiClient — no per-component 401 checks
- Auto-refresh token or redirect to login

## Rate Limiting
- Global: 200 requests/minute (ThrottlerModule, name: `global`)
- Auth endpoints: 30 requests/minute (name: `auth`)
- Override per endpoint: `@Throttle({ auth: { limit: 30, ttl: 60000 } })`

## Input Validation
- DTO-based (class-validator), ValidationPipe globally applied
- `whitelist: true`, `forbidNonWhitelisted: true`

## Environment & Keys
- `.env` in `.gitignore` — never commit
- `.env.example` committed (key names only, no values)
- `.pem`, `.key` files must be in `.gitignore`
- SSH keys in `~/.ssh/` only

## Log Redaction
- Sensitive fields masked in logs: `password`, `token`, `authorization`, `credit_card`, `cvv` → `[REDACTED]`
- Recursive for nested objects

## CORS
- `FRONTEND_URL` — primary origin. `FRONTEND_URLS` — additional origins (comma-separated)
- dev fallback: `http://localhost:5173`
- `credentials: true` required
- No wildcard `*` in production
