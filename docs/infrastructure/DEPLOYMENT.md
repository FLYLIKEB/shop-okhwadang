# Deployment Guide

## 배포 구조

```
클라이언트 브라우저
    │
    ├── HTTPS ──→ Vercel CDN (Next.js SSR)
    │                 │
    │                 └── /api/* rewrites ──→ AWS EC2 t3.small (NestJS :3000)
    │                                              │
    │                                              └── MySQL ──→ AWS Lightsail MySQL :3306
    └──────────────────────────────────────────────────────────────────────────────────────────
```

> 프론트엔드는 Vercel, 백엔드는 AWS EC2, DB는 AWS Lightsail MySQL로 운영.

---

## 백엔드 (AWS EC2 t3.small)

### 배포 방식
- `main` 브랜치 push 시 GitHub Actions (`deploy.yml`) → EC2 SSH 배포 자동 실행
- 배포 시작 시 `migration:run:prod` 자동 실행 후 서버 기동

### 서버 구성
- Ubuntu 22.04 LTS
- PM2로 프로세스 관리
- Nginx + Let's Encrypt SSL (HTTPS)

```bash
pm2 start dist/main.js --name commerce
pm2 save && pm2 startup
```

### 빌드 (`backend/Dockerfile`)
- Node.js 22 Alpine 멀티스테이지 빌드
- `npm ci --omit=dev` — devDependencies 제외

### 환경 변수 (EC2 환경 또는 GitHub Secrets)
| 변수 | 값 |
|---|---|
| `DATABASE_URL` | `mysql://user:password@<lightsail-private-ip>:3306/commerce` |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `JWT_SECRET` | `openssl rand -hex 32` 로 생성 |
| `JWT_EXPIRES_IN` | `1h` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `FRONTEND_URL` | Vercel 배포 URL |
| `PAYMENT_GATEWAY` | `mock` |
| `STORAGE_PROVIDER` | `local` |

### MySQL 연결
- AWS Lightsail MySQL과 EC2 간 내부 IP로 직접 연결
- `DATABASE_URL`이 Lightsail 내부 IP를 가리킴
- TypeORM 설정: `process.env.DATABASE_URL` 우선 사용

---

## GitHub Actions CI/CD

### PR (`.github/workflows/ci.yml`)
- `main` 브랜치 PR 시 트리거
- 프론트엔드: lint + test
- 백엔드: lint + build + unit test + e2e test

### 배포 (`.github/workflows/deploy.yml`)
- `main` 브랜치 push 시 트리거
- EC2에 SSH 접속하여 배포 실행

```yaml
- name: Deploy to EC2
  uses: appleboy/ssh-action@v1
  with:
    host: ${{ secrets.EC2_HOST }}
    username: ${{ secrets.EC2_USER }}
    key: ${{ secrets.SSH_PRIVATE_KEY }}
    script: |
      cd /app/shop-okhwadang/backend
      git pull origin main
      npm ci --omit=dev
      npm run build
      npm run migration:run:prod
      pm2 reload commerce --update-env
```

### GitHub Secrets 설정
| Secret | 설명 |
|---|---|
| `EC2_HOST` | EC2 인스턴스 퍼블릭 IP 또는 도메인 |
| `EC2_USER` | SSH 사용자 (예: `ubuntu`) |
| `SSH_PRIVATE_KEY` | EC2 접속용 SSH 프라이빗 키 |
| `DATABASE_URL` | Lightsail MySQL 연결 문자열 |
| `JWT_SECRET` | JWT 시크릿 키 |

---

## 데이터베이스 마이그레이션

### 배포 시 자동 실행
배포 스크립트에 포함되어 있어 별도 실행 불필요:
```bash
npm run migration:run:prod   # dist/database/migrations/*.js 적용
```

### 로컬에서 원격 DB 직접 접근 (SSH 터널)
```bash
bash scripts/start-local.sh   # SSH 터널 포함 전체 스택 기동
LOCAL_DATABASE_URL=mysql://root:changeme_root_password@127.0.0.1:3307/commerce npm run migration:run
```

---

## 모니터링

### PM2 대시보드
```bash
pm2 status          # 프로세스 상태 확인
pm2 logs commerce   # 실시간 로그
pm2 monit           # CPU/메모리 모니터링
```

### 헬스 체크 수동 확인
```bash
curl https://api.your-domain.com/api/health
```

---

## Nginx + HTTPS 설정 (EC2)

Nginx 설정 파일은 `infra/nginx/commerce.conf`에서 버전 관리됩니다.

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo certbot --nginx -d api.your-domain.com

# 버전 관리된 설정 파일을 Nginx 설정 디렉토리에 복사
sudo cp infra/nginx/commerce.conf /etc/nginx/sites-available/commerce.conf
sudo ln -s /etc/nginx/sites-available/commerce.conf /etc/nginx/sites-enabled/commerce.conf
sudo nginx -t
sudo systemctl reload nginx
```

자세한 설정은 [`infra/nginx/commerce.conf`](infra/nginx/commerce.conf)를 참조하세요.

---

## 데이터베이스 (AWS Lightsail MySQL)

- Lightsail MySQL 인스턴스로 관리형 DB 운영
- EC2에서 내부 IP로 직접 연결 (SSH 터널 불필요)
- `DATABASE_URL=mysql://user:password@<lightsail-private-ip>:3306/commerce`
- 7일 자동 백업 포함

---

## 트러블슈팅

### EC2 — PM2 프로세스 비정상 종료

#### 증상
배포 후 `pm2 status`에서 프로세스가 `errored` 상태.

#### 해결
```bash
pm2 logs commerce --lines 50   # 에러 로그 확인
pm2 restart commerce           # 재시작
pm2 reload commerce            # 무중단 재시작
```

### Lightsail MySQL 연결 실패

#### 증상
NestJS 기동 후 `Unable to connect to the database`.

#### 확인 사항
1. EC2 보안그룹에서 Lightsail MySQL 포트(3306) 허용 여부
2. `DATABASE_URL`의 호스트가 Lightsail 내부 IP인지 확인
3. Lightsail 네트워킹에서 EC2 IP 화이트리스트 등록 여부

### Nginx 502 Bad Gateway

#### 원인
NestJS(PM2)가 실행되지 않은 상태에서 Nginx가 프록시 시도.

#### 해결
```bash
pm2 status                     # commerce 프로세스 확인
pm2 start dist/main.js --name commerce  # 프로세스 없으면 시작
```
