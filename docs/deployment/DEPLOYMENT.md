# Deployment Guide

## 배포 구조

### 현재 (데모 경량 배포 — Railway)

```
클라이언트 브라우저
    │
    └── HTTPS ──→ Railway (NestJS :3000 + MySQL)
                    │
                    ├── commerce-demo 서비스 (NestJS)
                    │     URL: https://commerce-demo-production.up.railway.app
                    │
                    └── COMMERCE-MySQL 서비스 (MySQL 8.0)
                          내부 호스트: mysql.railway.internal:3306
```

> **데모 목적으로 프론트엔드·백엔드·DB 모두 Railway에서 운영.**
> 포크 후 실서비스 전환 시 → [프로덕션 전환 가이드](#포크-후-프로덕션-전환-vercelec2) 참고.

---

## 백엔드 (Railway)

### 배포 방식
- `main` 브랜치 push 시 GitHub Actions (`deploy.yml`) → `railway up` 자동 실행
- 배포 시작 시 `migration:run:prod` 자동 실행 후 서버 기동

### 서비스 설정 (`backend/railway.json`)
```json
{
  "deploy": {
    "startCommand": "npm run migration:run:prod && node dist/main",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 60,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### 빌드 (`backend/Dockerfile`)
- Node.js 22 Alpine 멀티스테이지 빌드
- `npm ci --omit=dev` — devDependencies 제외

### 환경 변수 (Railway 대시보드 → Variables)
| 변수 | 값 |
|---|---|
| `DATABASE_URL` | MySQL 서비스 연결 시 자동 주입 (`mysql://...mysql.railway.internal:3306/railway`) |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `JWT_SECRET` | `openssl rand -hex 32` 로 생성 |
| `JWT_EXPIRES_IN` | `1h` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `FRONTEND_URL` | Railway 프론트 URL 또는 Vercel URL |
| `PAYMENT_GATEWAY` | `mock` |
| `STORAGE_PROVIDER` | `local` |

### MySQL 연결
- Railway 프로젝트 내 `COMMERCE-MySQL` 서비스와 내부 네트워크로 연결
- `DATABASE_URL`이 `mysql.railway.internal`을 가리키며 자동 주입됨
- TypeORM 설정: `process.env.DATABASE_URL` 우선 사용

---

## GitHub Actions CI/CD

### PR (`.github/workflows/ci.yml`)
- `main` 브랜치 PR 시 트리거
- 프론트엔드: lint + test
- 백엔드: lint + build + unit test + e2e test

### 배포 (`.github/workflows/deploy.yml`)
- `main` 브랜치 push 시 트리거
- `railway up --service backend --detach` 실행

```yaml
- name: Deploy to Railway
  env:
    RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
  run: railway up --service backend --detach
```

### GitHub Secrets 설정
| Secret | 설명 |
|---|---|
| `RAILWAY_TOKEN` | Railway 대시보드 → Account Settings → API Tokens에서 생성 |

---

## 데이터베이스 마이그레이션

### 배포 시 자동 실행
배포 startCommand에 포함되어 있어 별도 실행 불필요:
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

### Railway 대시보드
- 서비스 로그: Railway → commerce-demo → Deployments → 최신 배포 → Logs
- 헬스 체크: `/api/health` 자동 모니터링

### 헬스 체크 수동 확인
```bash
curl https://commerce-demo-production.up.railway.app/api/health
```

---

## 포크 후 프로덕션 전환 (Vercel/EC2)

이 레포를 포크해 실서비스를 구축할 때는 아래 구조로 전환한다:

```
클라이언트 브라우저
    │
    ├── HTTPS ──→ Vercel CDN (Next.js SSR)
    │                 │
    │                 └── /api/* rewrites ──→ AWS EC2 (NestJS :3000)
    │                                              │
    │                                              └── MySQL ──→ AWS Lightsail Docker MySQL :3306
    └──────────────────────────────────────────────────────────────────────────────────────────
```

### 전환 체크리스트

#### 1. 프론트엔드 → Vercel
- Vercel 프로젝트 생성, GitHub 저장소 연결
- 환경 변수 설정:
  ```
  BACKEND_URL=https://api.your-domain.com
  ```
- `next.config.ts`의 rewrites가 `BACKEND_URL`을 자동으로 참조함 (수정 불필요)

#### 2. 백엔드 → AWS EC2
- EC2 인스턴스 생성 (Ubuntu 22.04 LTS 권장)
- PM2 설치 및 설정:
  ```bash
  npm install -g pm2
  pm2 start dist/main.js --name commerce
  pm2 save && pm2 startup
  ```
- `backend/railway.json` 제거 또는 무시, GitHub Actions 배포 워크플로우로 교체:
  ```yaml
  - name: Deploy to EC2
    uses: appleboy/ssh-action@v1
    with:
      host: ${{ secrets.EC2_HOST }}
      username: ${{ secrets.EC2_USER }}
      key: ${{ secrets.SSH_PRIVATE_KEY }}
      script: |
        cd /app/commerce-demo/backend
        git pull origin main
        npm ci --omit=dev
        npm run build
        npm run migration:run:prod
        pm2 reload commerce --update-env
  ```
- GitHub Secrets 추가: `EC2_HOST`, `EC2_USER`, `SSH_PRIVATE_KEY`, `DATABASE_URL`, `JWT_SECRET`

#### 3. 데이터베이스 → AWS Lightsail MySQL
- Lightsail Docker MySQL 컨테이너 기동
- EC2에서 SSH 터널 없이 내부 IP로 직접 연결
- `DATABASE_URL=mysql://user:password@<lightsail-private-ip>:3306/commerce`

#### 4. Nginx + HTTPS (EC2)
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo certbot --nginx -d api.your-domain.com
```

#### 5. `deploy.yml` 교체
Railway 배포 대신 EC2 SSH 배포로 워크플로우 수정.

---

## 트러블슈팅

### Railway — Service Unavailable (503)

#### 증상
배포 성공(Deployment successful)인데 `https://commerce-demo-production.up.railway.app` 접속 시 503 반환.

#### 원인 1: Railway가 루트 `package.json`으로 Next.js를 배포

**현상**: `railway logs`에서 `next start`가 실행됨. `backend/railway.json`이 있어도 루트 디렉토리 기준으로 빌드.

**해결**: Railway 대시보드 → `commerce-demo` 서비스 → **Settings → Root Directory = `backend`** 로 설정 후 Deploy.

> `railway up`을 `backend/` 디렉토리에서 실행해도 Railway가 Railpack 자동감지를 사용하면 루트 `package.json`을 바라볼 수 있음. 대시보드에서 Root Directory를 반드시 지정해야 함.
>
> Root Directory 입력 시 `/backend`(슬래시 포함) 입력하면 "Could not find root directory: /backend" 오류 발생 → **`backend`** (슬래시 없이) 입력.

#### 원인 2: MySQL `root@%` 접근 거부 (`ER_ACCESS_DENIED_ERROR`)

**현상**: NestJS 기동 후 `Unable to connect to the database` 반복. 로그에 `Access denied for user 'root'@'10.x.x.x'`.

**원인**: Railway MySQL은 기본적으로 `root@localhost`만 허용. 내부 네트워크(`100.64.x.x`, `10.x.x.x`)에서의 `root` 접근이 거부됨. `MYSQL_ROOT_HOST=%` 환경변수를 추가해도 기존 컨테이너에는 소급 적용 안 됨.

**해결**: Railway 대시보드 → `COMMERCE-MySQL` 서비스 → **Database 탭** → SQL 입력창에서 순서대로 실행:

```sql
-- 1. root@% 권한 부여
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;

-- 2. 비밀번호 설정 (MYSQL_ROOT_PASSWORD 값으로)
ALTER USER 'root'@'%' IDENTIFIED BY '<MYSQL_ROOT_PASSWORD값>';
```

실행 후 `commerce-demo` 서비스 재배포.

> SQL 입력창에서 `Enter` 키로 실행. `Cmd+Enter`는 다른 동작을 유발할 수 있음.

#### 원인 3: `DATABASE_URL` Railway 자동 오버라이드

**현상**: `commerce-demo` 서비스의 `DATABASE_URL`을 Public URL로 바꿔도 앱이 내부 URL(`mysql.railway.internal`)로 접속.

**원인**: Railway MySQL 서비스가 같은 프로젝트에 존재하면 `DATABASE_URL`을 내부 URL로 자동 주입함. CLI로 설정한 값을 덮어씀.

**해결**: 위의 MySQL 권한 부여 방법으로 내부 URL 접속이 가능하도록 수정하는 것이 근본 해결책.
