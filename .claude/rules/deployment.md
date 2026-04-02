---
globs: ["**/Dockerfile", "**/docker-compose*.yml", ".github/workflows/**", "scripts/**"]
---
# Deployment Rules

## Infrastructure
- **Frontend**: Vercel Pro (commercial use required, Hobby plan forbidden)
- **Backend**: AWS EC2 t3.small, Ubuntu 22.04, PM2 process manager, Nginx + Let's Encrypt SSL
- **Database**: AWS Lightsail MySQL, 7-day auto backup
- **Storage**: AWS S3 + CloudFront for product images

## CI/CD
- GitHub Actions: PR triggers lint/test, main push triggers SSH deploy
- PM2 for process management on EC2

## Docker (Local Dev)
- `docker compose up -d` — MySQL 8.0 (:3306) + Redis 7 (:6379)
- `docker compose down -v` — reset DB (volume cleanup)
- Volume deletion only with `-v` flag

## Environment Variables
- Frontend: `BACKEND_URL`
- Backend: `NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_SECRET`, `PAYMENT_GATEWAY`, `STORAGE_PROVIDER`, `REDIS_URL`
- Full reference: `docs/infrastructure/ENVIRONMENT_VARIABLES.md`
