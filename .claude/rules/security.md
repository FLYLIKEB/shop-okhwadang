# Security Rules

## Security Stack (request pipeline)
CORS validation → Rate Limiting → JWT Guard → ValidationPipe → Controller

## Authentication
- JWT (Access + Refresh Token)
- RBAC: `user` / `admin` / `super_admin` with `@Roles()` decorator
- OAuth: Kakao, Google
- bcrypt hashing (salt rounds 10+)

## Rate Limiting
- Global: 200 requests/minute (ThrottlerModule, name: `global`)
- Auth endpoints: 30 requests/minute (name: `auth`)
- 엔드포인트별 오버라이드: `@Throttle({ auth: { limit: 30, ttl: 60000 } })` 데코레이터 사용

## Input Validation
- DTO-based (class-validator), ValidationPipe globally applied
- `whitelist: true`, `forbidNonWhitelisted: true`

## Payment Security
- Server-side amount validation mandatory
- PG webhook signature verification
- State transitions server-only

## Environment & Keys
- `.env` in `.gitignore` — never commit
- `.env.example` committed (key names only, no values)
- `.pem`, `.key` files must be in `.gitignore`
- SSH keys in `~/.ssh/` only

## Security Headers
- `app.use(helmet())` in main.ts — CSP, X-Frame-Options, X-Content-Type-Options 등 자동 적용

## Log Redaction
- LoggingInterceptor에서 민감 필드 자동 마스킹: `password`, `token`, `authorization`, `credit_card`, `cvv`
- 해당 필드는 로그에 `[REDACTED]`로 출력. nested object에도 재귀 적용

## CORS
- `FRONTEND_URL` — 메인 오리진. `FRONTEND_URLS` — 추가 오리진 (콤마 구분)
- dev 환경 fallback: `http://localhost:5173`
- `credentials: true` 필수 (쿠키/인증 헤더)
- No wildcard `*` in production
