---
globs: ["**/Dockerfile", "**/docker-compose*.yml", ".github/workflows/**", "scripts/**"]
---
# Deployment Rules

## Infrastructure
- **Frontend**: Vercel Pro (commercial use required, Hobby plan forbidden)
- **Backend**: AWS EC2 t3.small, Amazon Linux 2023, PM2 process manager, Nginx (HTTP 80, HTTPS는 Cloudflare/Vercel 종료)
- **Database**: AWS Lightsail MySQL, 7-day auto backup
- **Storage**: AWS S3 + CloudFront for product images

## CI/CD
- GitHub Actions: PR triggers lint/test, main push triggers SSH deploy
- PM2 for process management on EC2

## Docker (Local Dev)
- `docker compose up -d` — MySQL 8.0 (host :3307 → container :3306). 캐시는 in-memory라 별도 컨테이너 불필요
- `docker compose down -v` — reset DB (volume cleanup)
- Volume deletion only with `-v` flag

## Environment Variables
- Frontend: `BACKEND_URL`
- Backend: `NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_SECRET`, `PAYMENT_GATEWAY`, `STORAGE_PROVIDER`
- Full reference: `docs/infrastructure/ENVIRONMENT_VARIABLES.md`
