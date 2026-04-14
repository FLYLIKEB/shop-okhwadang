# EC2 초기 설정 가이드 (2026-04-12)

> **EC2에 백엔드를 최초로 배포하기 위한 전체 가이드**
> **IAM Role, S3, CloudFront, OIDC 설정 완료 후 실행**

---

## 민감정보 관리

**실제 값은 다음에서 확인:**
- 로컬 개발: `backend/.env`
- EC2 서버: `/app/shop-okhwadang/backend/.env.production`

**문서에서는 `backend/.env.example`의 변수명을 참조합니다.**

---

## 현재 인프라 상태

| 리소스 | 상태 | 확인 방법 |
|--------|------|-----------|
| S3 버킷 (okhwadang-assets) | ✅ 완료 | `aws s3 ls` |
| CloudFront 배포 | ✅ 완료 | `aws cloudfront list-distributions` |
| OAC (Origin Access Control) | ✅ 완료 | `aws cloudfront list-origin-access-controls` |
| IAM Role (OIDC) | ✅ 완료 | AWS Console → IAM |
| IAM Role (S3) | ✅ 완료 | AWS Console → IAM |
| EC2 Instance (t3.small) | ✅ 실행 중 | AWS Console → EC2 |
| EC2 SSH 접근 | ✅ 가능 | 119.192.158.63:22 허용 |

**리소스 확인 명령어:**
```bash
# EC2 Public IP
aws ec2 describe-instances \
    --instance-ids i-0af729245abbb06f2 \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text

# CloudFront Domain
aws cloudfront get-distribution --id E29I3J84769W08 \
    --query Distribution.DomainName --output text
```

---

## 1. EC2 접속

```bash
ssh -i ~/okhwadang-ec2-key.pem ec2-user@3.38.168.41
```

**키 파일 위치:** `~/okhwadang-ec2-key.pem` (로컬에 다운로드済み)

---

## 2. 기본 패키지 설치

```bash
sudo dnf update -y
sudo dnf install -y git nginx certbot python3-certbot-nginx
```

---

## 3. Node.js + PM2 확인

```bash
node --version  # 22.x 확인
npm --version
pm2 --version   # 없으면: sudo npm install -g pm2
```

---

## 4. 프로젝트 디렉토리 설정

```bash
# 디렉토리 생성
sudo mkdir -p /app/shop-okhwadang
sudo chown ec2-user:ec2-user /app/shop-okhwadang

# Git 클론
cd /app/shop-okhwadang
git init
git remote add origin https://github.com/FLYLIKEB/shop-okhwadang.git
git checkout -b main
git pull origin main
```

---

## 5. .env.production 생성

```bash
cd /app/shop-okhwadang/backend
nano .env.production
```

**아래 템플릿 참고 (실제 값은 `.env.example` 참조):**

```env
NODE_ENV=production
PORT=3000
BACKEND_URL=http://3.38.168.41:3000

DB_SYNCHRONIZE=false
DB_SSL_ENABLED=false
# Lightsail MySQL (endpoint/user/password는 .env.secrets 참조)
DATABASE_URL=mysql://okhwadang_app:<APP_DB_PASSWORD>@<LIGHTSAIL_DB_HOST>:3306/commerce

JWT_SECRET=<openssl rand -hex 32로 생성>
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
JWT_REFRESH_SECRET=<openssl rand -hex 32로 생성>

REDIS_URL=redis://:your-redis-password@localhost:6379

PAYMENT_GATEWAY=mock

STORAGE_PROVIDER=s3
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET_NAME=okhwadang-assets
AWS_CDN_URL=https://dt24i8idwxww1.cloudfront.net
```

**자세한 변수 목록:** `backend/.env.example` 참조

```bash
# 파일 권한 설정
chmod 600 .env.production
chown ec2-user:ec2-user .env.production
```

---

## 6. Redis 설정

```bash
# Redis 설치 및 시작
sudo dnf install -y redis
sudo systemctl start redis
sudo systemctl enable redis

# 비밀번호 설정 (선택)
sudo nano /etc/redis/redis.conf
# requirepass 원하는_비밀번호

sudo systemctl restart redis
```

---

## 7. 의존성 설치 및 빌드

```bash
cd /app/shop-okhwadang/backend
npm ci --omit=dev
npm run build
npm run migration:run:prod
```

---

## 8. PM2 설정

```bash
# 로그 디렉토리 생성
sudo mkdir -p /var/log/pm2
sudo chown ec2-user:ec2-user /var/log/pm2

# ecosystem.config.js 확인 (이미 프로젝트에 있음)
cat ecosystem.config.js

# PM2 시작
pm2 start ecosystem.config.js --env production
pm2 status

# 부팅 시 자동 시작
pm2 save
pm2 startup
```

---

## 9. Nginx 설정

```bash
sudo nano /etc/nginx/conf.d/commerce.conf
```

```nginx
server {
    listen 80;
    server_name 3.38.168.41;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
sudo nginx -t
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## 10. 헬스 체크 확인

```bash
curl http://localhost:3000/api/health
curl http://3.38.168.41:3000/api/health
```

---

## 11. GitHub Actions 연동

### GitHub Secrets 설정
```
EC2_HOST = 3.38.168.41
```

자세한 내용은 [`docs/infrastructure/GITHUB_ACTIONS_OIDC.md`](./GITHUB_ACTIONS_OIDC.md)를 참조하세요.

### 첫 번째 배포
```bash
git add .
git commit -m "feat: initial EC2 deployment"
git push origin main
```

GitHub Actions → Deploy Backend 워크플로우 실행 확인

---

## 12. 트러블슈팅

```bash
# PM2 상태/로그
pm2 status
pm2 logs commerce --lines 50

# DB 마이그레이션
npm run migration:show

# Nginx 상태
sudo systemctl status nginx
sudo nginx -t
```

---

## 빠른 체크리스트

```bash
# 1. SSH 접속
ssh -i ~/okhwadang-ec2-key.pem ec2-user@3.38.168.41

# 2. Node/npm 버전
node --version && npm --version

# 3. Redis 실행
redis-cli ping

# 4. 프로젝트 빌드
cd /app/shop-okhwadang/backend
npm ci --omit=dev && npm run build

# 5. PM2 시작
pm2 start ecosystem.config.js --env production
pm2 status

# 6. Nginx 시작
sudo systemctl start nginx
curl http://localhost:3000/api/health
```
