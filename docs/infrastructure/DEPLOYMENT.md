# Deployment Guide

## 배포 구조

```
클라이언트 브라우저
    │
    ├── HTTPS ──→ Vercel CDN (Next.js SSR)
    │                 │
    │                 └── /api/* rewrites ──→ AWS EC2 t3.small (NestJS :3000)
    │                                              │
    │                                              ├── MySQL ──→ AWS Lightsail MySQL :3306
    │                                              └── Redis ──→ EC2 내장 또는 ElastiCache
    └──────────────────────────────────────────────────────────────────────────────────────────
```

> 프론트엔드는 Vercel, 백엔드는 AWS EC2, DB는 AWS Lightsail MySQL로 운영.
> **CI/CD: GitHub Actions OIDC + SSM (SSH 키 없음)**

---

## 백엔드 (AWS EC2 t3.small)

### 배포 방식
- `main` 브랜치 push 시 GitHub Actions → OIDC 인증 → SSM으로 EC2 명령어 실행
- 배포 시작 시 `migration:run:prod` 자동 실행 후 PM2 재시작

### 서버 구성
- Amazon Linux 2023
- PM2로 프로세스 관리
- Nginx (HTTP → HTTPS 리다이렉트)

### OIDC + SSM 배포 (현재 방식)

```yaml
permissions:
  id-token: write
  contents: read

- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::618647024184:role/GithubActionsEC2DeployRole
    role-session-name: github-actions-deploy
    aws-region: ap-northeast-2

- name: Deploy to EC2 via SSM
  run: |
    aws ssm send-command \
      --instance-ids i-0af729245abbb06f2 \
      --document-name AWS-RunShellScript \
      --parameters commands=[
        "cd /app/shop-okhwadang/backend",
        "git pull origin main",
        "npm ci --omit=dev",
        "npm run build",
        "npm run migration:run:prod",
        "pm2 restart commerce",
        "pm2 save"
      ]
```

자세한 내용은 [`docs/infrastructure/GITHUB_ACTIONS_OIDC.md`](./GITHUB_ACTIONS_OIDC.md)를 참조하세요.

### GitHub Secrets 설정
| Secret | 설명 |
|---|---|
| `EC2_HOST` | EC2 인스턴스 퍼블릭 IP (`3.38.168.41`) |

> **SSH_PRIVATE_KEY, EC2_USER 등 불필요** - OIDC가 대신 처리

자세한 OIDC 설정은 [`docs/infrastructure/GITHUB_ACTIONS_OIDC.md`](./GITHUB_ACTIONS_OIDC.md)를 참조하세요.

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
LOCAL_DATABASE_URL=mysql://root:__REDACTED_ROOT_PW__@127.0.0.1:3307/commerce npm run migration:run
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
