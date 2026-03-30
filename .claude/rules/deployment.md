---
globs: ["**/Dockerfile", "**/docker-compose*.yml", ".github/workflows/**", "scripts/**"]
---
# Deployment

## Infra
- Frontend: Vercel Pro (no Hobby)
- Backend: EC2 t3.small, Ubuntu 22.04, PM2, Nginx+SSL
- DB: Lightsail MySQL, 7-day backup
- Storage: S3+CloudFront

## CI/CD
- GitHub Actions: PR→lint/test, main push→SSH deploy, PM2

## Docker (Local)
- `docker compose up -d` — MySQL:3306 + Redis:6379
- `docker compose down -v` — reset (volume cleanup)

## Env Vars
- Frontend: `BACKEND_URL`
- Backend: `NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_SECRET`, `PAYMENT_GATEWAY`, `STORAGE_PROVIDER`, `REDIS_URL`
- Full ref: `docs/infrastructure/ENVIRONMENT_VARIABLES.md`
