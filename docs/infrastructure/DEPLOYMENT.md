# Deployment Guide

## 도메인

- **운영 도메인**: `https://ockhwadang.com` (Cloudflare DNS → Vercel, HTTPS는 Vercel/Cloudflare가 처리)
- **API 경로**: 브라우저는 `ockhwadang.com/api/*`만 호출. Next.js middleware(`src/middleware.ts`)가 Vercel Edge에서 `BACKEND_URL`로 런타임 프록시. Vercel Edge는 IP 직접 fetch를 금지하므로 반드시 도메인(`api.ockhwadang.com`) 경유.
- **CDN 서브도메인**: `https://cdn.ockhwadang.com` → CloudFront → S3 `okhwadang-assets`

### Vercel 환경변수
- `BACKEND_URL=http://api.ockhwadang.com` (Cloudflare Proxied → EC2 Nginx :80 → NestJS :3000, HTTP)
- `SITE_URL=https://ockhwadang.com`

## 배포 구조

```
클라이언트 브라우저
    │
    ├── HTTPS ──→ Cloudflare ──→ Vercel CDN (Next.js SSR, ockhwadang.com)
    │                 │
    │                 └── /api/* rewrites ──→ api.ockhwadang.com → AWS EC2 t3.small (NestJS :3000)
    │                                              │
    │                                              └── MySQL ──→ AWS Lightsail MySQL :3306
    │                                                 (캐시는 백엔드 프로세스 내 in-memory)
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
curl https://api.ockhwadang.com/api/health
```

---

## Nginx 설정 (EC2)

HTTPS는 Vercel(Cloudflare)에서 종료되고, EC2 nginx는 **HTTP 80 → NestJS :3000** 리버스 프록시만 담당. SSL/certbot 불필요.

```bash
sudo dnf install -y nginx
sudo cp infra/nginx/commerce.conf /etc/nginx/conf.d/commerce.conf
sudo nginx -t
sudo systemctl enable --now nginx
```

> ⚠️ EC2 보안그룹은 80 포트를 0.0.0.0/0 에 허용해야 한다. (Vercel egress IP가 동적이라 IP 화이트리스트는 비현실적)
> Vercel ↔ EC2 구간은 평문이므로, 민감 데이터가 많아지면 추후 Cloudflare Tunnel 또는 Origin Cert 도입을 검토.

자세한 설정은 [`infra/nginx/commerce.conf`](infra/nginx/commerce.conf)를 참조하세요.

---

## 데이터베이스 (AWS Lightsail MySQL)

- **인스턴스**: `okhwadang-prod-db` (MySQL 8.0, `micro_2_0` 번들, ap-northeast-2a)
- **Endpoint / 계정 / 패스워드**: `.env.secrets` 참조 (`LIGHTSAIL_DB_HOST`, `APP_DB_USER`, `APP_DB_PASSWORD`)
- **publicly accessible**: `true` (보안은 MySQL 사용자 host 제한으로 처리)
- **VPC peering**: Lightsail VPC ↔ EC2 VPC(`vpc-02836c09f4af7ddbb`) 활성
  - EC2에서 endpoint로 접속 시 private IP(`172.26.x.x`)로 라우팅됨
- **접근 통제**:
  - `dbadmin@%` — 관리용 (긴급 대응만)
  - `okhwadang_app@172.31.8.153` — 애플리케이션용, EC2 사설IP에서만 접속 허용, `commerce.*` 권한만
- **자동 백업**: 매일 18:00-18:30 KST, 7일 보관
- **유지보수 창**: 월요일 19:00-19:30 KST
- **charset**: `utf8mb4` / `utf8mb4_unicode_ci`

### 접속 경로 / 마이그레이션 실행

자세한 사용법은 [`REMOTE_DB_ACCESS.md`](./REMOTE_DB_ACCESS.md) 참조.

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
NestJS 기동 후 `Unable to connect to the database` 또는
`ERROR 1045 Access denied for user 'okhwadang_app'@'<ip>'`.

#### 확인 사항
1. Lightsail DB 상태가 `available`인지 (`aws lightsail get-relational-database`)
2. VPC peering이 `active`인지, EC2 route table에 `172.26.0.0/16` 경로가 있는지
3. EC2에서 endpoint로 접속 시 나가는 소스 IP 확인:
   ```sql
   SELECT CURRENT_USER(), USER();  -- user@<source-ip> 형태 반환
   ```
   반환된 IP가 `okhwadang_app` 계정의 host와 일치해야 함. EC2 사설IP가 바뀐 경우 `dbadmin`으로 붙어 host 갱신:
   ```sql
   CREATE USER 'okhwadang_app'@'<new-private-ip>' IDENTIFIED BY '<password>';
   GRANT ... ON commerce.* TO 'okhwadang_app'@'<new-private-ip>';
   ```
4. `DATABASE_URL` 값이 `.env.secrets`와 일치하는지 (EC2 `backend/.env.production`)

### Nginx 502 Bad Gateway

#### 원인
NestJS(PM2)가 실행되지 않은 상태에서 Nginx가 프록시 시도.

#### 해결
```bash
pm2 status                     # commerce 프로세스 확인
pm2 start dist/main.js --name commerce  # 프로세스 없으면 시작
```
