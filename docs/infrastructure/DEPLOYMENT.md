# Deployment Guide

## 도메인

- **운영 도메인**: `https://ockhwadang.com` (Cloudflare DNS → Vercel, 브라우저 진입부터 HTTPS 고정)
- **브라우저 API 경로**: 브라우저/CSR fetch는 `https://ockhwadang.com/api/*`만 호출한다.
- **SSR/Edge 백엔드 origin**: `BACKEND_URL`은 **반드시 origin only** 로 넣는다. canonical 값은 `https://api.ockhwadang.com` 이며 `/api` suffix를 붙이지 않는다. `api.ockhwadang.com` 은 Cloudflare Proxied + `Full (strict)` 로 EC2 origin 443에 연결한다.
- **프록시 계약**: Next.js middleware(`src/middleware.ts`)와 SSR helper(`src/lib/api-server.ts`, `src/app/[locale]/layout.tsx`)가 같은 `BACKEND_URL + /api/*` 규칙을 공유한다.
- **CDN 서브도메인**: `https://cdn.ockhwadang.com` → CloudFront → S3 `okhwadang-assets`

### Cloudflare DNS TXT 레코드

운영 저장소에는 Cloudflare DNS IaC가 없으므로, 아래 값이 **운영 콘솔에서 유지되어야 하는 source of truth** 다.

| Host     | Type  | Value                                        | 목적                                         |
| -------- | ----- | -------------------------------------------- | -------------------------------------------- |
| `@`      | `TXT` | `v=spf1 include:_spf.resend.com ~all`        | `EMAIL_FROM=@ockhwadang.com` 발신 도메인 SPF |
| `_dmarc` | `TXT` | `v=DMARC1; p=none; adkim=s; aspf=s; pct=100` | DMARC 초기 모니터링 정책                     |

> ⚠️ 서비스 장애 가능성: SPF 값을 교체하면서 실제 발송 provider(include)를 빠뜨리면 정상 메일도 softfail/hardfail 될 수 있다.
> ⚠️ 서비스 장애 가능성: DMARC를 `quarantine` 또는 `reject`로 바로 올리면 SPF/DKIM 정렬이 안 된 정상 메일이 스팸 처리되거나 반송될 수 있다. 우선 `p=none`으로 검증 후 단계적으로 강화한다.

#### DNS 적용/검증 절차

1. Cloudflare DNS에서 루트(`@`) TXT 레코드에 `v=spf1 include:_spf.resend.com ~all` 을 추가한다.
2. Cloudflare DNS에서 `_dmarc` TXT 레코드에 `v=DMARC1; p=none; adkim=s; aspf=s; pct=100` 을 추가한다.
3. 이미 다른 SPF 레코드가 있으면 **새 TXT를 추가하지 말고 기존 SPF 한 줄에 include를 합친다.** SPF는 도메인당 1개만 유효하다.
4. 적용 후 아래 명령으로 authoritative 응답을 확인한다.

```bash
dig +short TXT ockhwadang.com
dig +short TXT _dmarc.ockhwadang.com

nslookup -type=TXT ockhwadang.com
nslookup -type=TXT _dmarc.ockhwadang.com
```

5. 결과에 SPF/DMARC 문자열이 그대로 보이면 반영 완료다. 메일 provider가 늘어나면 `~all` 앞에 해당 provider `include:` 또는 `ip4:` 를 추가한 뒤 다시 검증한다.

## 프록시·SSR smoke test

배포 직후 또는 `BACKEND_URL`/Cloudflare/Nginx 변경 직후 아래 순서로 확인한다.

1. **프록시 헬스 체크** — `curl -i https://ockhwadang.com/api/health`
   - 기대값: `200 OK`, `status=ok`, `db.status=connected`
2. **직접 백엔드 헬스 체크** — `curl -i https://api.ockhwadang.com/api/health`
   - 기대값: 프록시와 같은 health payload
3. **SSR 경로 확인** — 브라우저 DevTools 또는 `curl -I https://ockhwadang.com/ko`
   - 기대값: 홈 SSR 응답이 200이고, 서버 컴포넌트 fetch가 `BACKEND_URL + /api/*` 계약으로만 동작
4. **사용자 보호 라우트 확인** — 로그아웃 상태에서 `https://ockhwadang.com/ko/checkout` 또는 `/ko/my`
   - 기대값: `/ko/login?redirect=...` 로 redirect
5. **관리자 보호 라우트 확인** — 로그인한 관리자 세션으로 `https://ockhwadang.com/ko/admin`
   - 기대값: 200 응답 또는 관리자 화면 진입, 비관리자 세션은 `/ko/` 로 redirect

> 로컬/프리뷰/운영 모두 동일하게 `BACKEND_URL`은 origin만 넣고, 앱 코드가 `/api/*`를 붙인다. 코드가 `/api/api/*` 또는 origin path 누락으로 동작하면 회귀다.

## 상품 이미지 캐시 정책

- 신규 업로드 S3 객체는 `Cache-Control: public, max-age=31536000, immutable` 메타데이터를 붙인다.
- 업로드 파일명은 UUID 기반이므로 이미지를 교체할 때 기존 key를 덮어쓰지 말고 새 URL을 발급한다.
- 운영 `AWS_CDN_URL`은 CloudFront 도메인 또는 `https://cdn.ockhwadang.com`을 가리켜야 한다.
- CloudFront 캐시 정책은 S3 origin의 `Cache-Control` 헤더를 존중해야 한다. 장애 대응 외에는 무효화보다 새 URL 발급을 우선한다.
- 기존 S3 객체에는 신규 코드가 소급 적용되지 않는다. 기존 상품 이미지까지 같은 정책을 적용해야 하면 AWS 콘솔/CLI로 객체 메타데이터를 일괄 교체하거나 관리자에서 이미지를 재업로드한다.
- 프론트 `next/image` 최적화 캐시는 `next.config.ts`의 `images.minimumCacheTTL`로 최소 1일을 유지한다. 신규 S3 이미지처럼 origin `Cache-Control`이 더 길면 최적화 이미지 변형도 더 긴 upstream TTL을 따를 수 있으므로, 변경된 이미지는 반드시 새 URL로 교체한다.

### 운영 origin URL

- 프론트/Vercel `BACKEND_URL=https://api.ockhwadang.com` (**origin only — `/api` suffix 금지**)
- 백엔드/EC2 `.env.production` `BACKEND_URL=https://api.ockhwadang.com/api` (결제 webhook/status_url, 업로드 절대 URL 생성에 사용)
- `api.ockhwadang.com` 은 Cloudflare **Proxied + SSL/TLS mode `Full (strict)`** 로 유지하고, EC2 nginx 443에는 Cloudflare Origin CA 또는 동등한 서버 인증서를 설치한다.
- `SITE_URL=https://ockhwadang.com`

## 배포 구조

```
클라이언트 브라우저
    │
    ├── HTTPS ──→ Cloudflare ──→ Vercel CDN (Next.js SSR, ockhwadang.com)
    │                 │
    │                 └── middleware + SSR fetch ──→ BACKEND_URL + /api/* ──→ HTTPS api.ockhwadang.com (Cloudflare Proxied)
    │                                                                                 │
    │                                                                                 └── HTTPS :443 ──→ AWS EC2 t3.small (Nginx → NestJS :3000)
    │                                                                                                     │
    │                                                                                                     └── MySQL ──→ AWS Lightsail MySQL :3306
    │                                                                                                        (캐시는 백엔드 프로세스 내 in-memory)
    └──────────────────────────────────────────────────────────────────────────────────────────
```

> 프론트엔드는 Vercel, 백엔드는 AWS EC2, DB는 AWS Lightsail MySQL로 운영.
> **CI/CD: GitHub Actions OIDC + SSM (SSH 키 없음)**

---

## 백엔드 (AWS EC2 t3.small)

### 배포 방식

- `main` 브랜치 push 시 GitHub Actions → OIDC 인증 → SSM으로 EC2 명령어 실행
- 배포 시작 시 `npm run build` 후 `dist/main.js` 존재 여부와 `npm run preflight:prod` DB 연결 사전 점검을 통과해야 `migration:run:prod` 및 PM2 재시작을 진행

### 서버 구성

- Amazon Linux 2023
- PM2로 프로세스 관리
- Nginx (443 TLS origin + 80 → 443 redirect)

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
        "test -f dist/main.js",
        "NODE_ENV=production npm run preflight:prod",
        "NODE_ENV=production npm run migration:run:prod",
        "pm2 restart ecosystem.config.js --env production --update-env || pm2 start ecosystem.config.js --env production",
        "pm2 save"
      ]
```

자세한 내용은 [`docs/infrastructure/GITHUB_ACTIONS_OIDC.md`](./GITHUB_ACTIONS_OIDC.md)를 참조하세요.

### GitHub Secrets 설정

| Secret     | 설명                                   |
| ---------- | -------------------------------------- |
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

### PM2 실행 경로

백엔드 프로세스는 항상 `backend/ecosystem.config.js`로 시작/재시작한다. 이 파일이 `cwd: __dirname`과 `script: './dist/main.js'`를 함께 관리하므로 다른 작업 디렉터리에서 PM2 명령을 실행해도 엔트리포인트가 흔들리지 않는다.

```bash
cd /app/shop-okhwadang/shop-okhwadang/backend
npm run build
test -f dist/main.js
NODE_ENV=production npm run preflight:prod
pm2 start ecosystem.config.js --env production
pm2 save
curl -s http://127.0.0.1:3000/api/health | jq '.db.status'
```

기존 PM2 dump가 예전 `dist/main.js` 직접 실행 경로를 들고 있으면 1회에 한해 정리한다.

```bash
pm2 delete commerce
pm2 start ecosystem.config.js --env production
pm2 save
```

### 헬스 체크 수동 확인

```bash
curl https://api.ockhwadang.com/api/health
```

정상 응답은 `status=ok`와 `db.status=connected`를 포함한다. 스토리지(S3) 확인이 실패해도 DB 상태와 분리되어 `storage=disconnected` / `storageReason`으로 표시되며, DB 연결 실패만 `db.status=disconnected`와 503 응답으로 배포 smoke test를 실패시킨다.

### CMS / settings 정합성 스모크 체크
```bash
curl -s https://api.ockhwadang.com/api/pages/home?locale=ko | jq '{slug, blockCount: (.blocks | length)}'
curl -s https://api.ockhwadang.com/api/settings/map?locale=ko | jq '{business_company_name, business_ceo, business_address, business_registration_number, business_mail_order_number, mobile_bottom_nav_visible}'
```

- `/api/health` 가 503 이거나 `db.status=disconnected` 면 런타임/인프라 장애다.
- `/api/pages/home` 가 404 이거나 `blockCount=0` 이면 홈 CMS 데이터 정합성 문제다.
- `/api/settings/map` 에서 필수 사업자 정보 키(`business_company_name`, `business_ceo`, `business_address`, `business_registration_number`, `business_mail_order_number`)가 비어 있으면 셸은 i18n 기본값으로 degraded mode fallback 한다.
- 홈 CMS 데이터를 복구해야 하면 `scripts/run-seed.sh` 실행 또는 어드민에서 slug=`home` 페이지 블록을 재게시한 뒤 다시 확인한다.

---

## Nginx 설정 (EC2)

EC2 nginx는 `api.ockhwadang.com` origin에서 TLS를 종료하고, 복호화된 요청만 `127.0.0.1:3000` NestJS로 전달한다. Cloudflare는 `Full (strict)` 모드여야 하며, 443 인증서는 Cloudflare Origin CA 또는 동등한 서버 인증서를 사용한다.

```bash
sudo dnf install -y nginx
sudo install -d -m 700 /etc/ssl/cloudflare
# origin.crt / origin.key 는 Cloudflare Origin CA(또는 동등한 서버 인증서)로 별도 배치
sudo cp "$(git rev-parse --show-toplevel)/infra/nginx/commerce.conf" /etc/nginx/conf.d/commerce.conf
sudo nginx -t
sudo systemctl enable --now nginx
```

> ⚠️ EC2 보안그룹은 443만 Cloudflare IP range에서 허용한다. 80은 steady-state 에서 닫고, HTTP → HTTPS redirect 또는 인증서 발급 검증이 꼭 필요할 때만 임시로 연다.
> ⚠️ 운영 전환 후 `http://api.ockhwadang.com` 직접 응답이 남아 있으면 안 된다. 허용되는 결과는 `301/308` HTTPS redirect 또는 명시적 차단뿐이다.

### 전환 후 smoke check

1. `curl -sS https://api.ockhwadang.com/api/health | jq '.status, .db.status'`
2. `curl -I http://api.ockhwadang.com/api/health` → `301/308` redirect 또는 연결 거부
3. 브라우저 DevTools Network 에서 로그인 후 `GET /api/auth/me` 가 HTTPS 로만 호출되고, 응답 `Set-Cookie` 에 `Secure; HttpOnly; SameSite=Strict` 가 유지되는지 확인
4. 주문/결제 smoke: `POST /api/orders` 와 `POST /api/payments/prepare` 가 HTTPS 로만 성공하고, PG webhook/status URL 이 `https://api.ockhwadang.com/api/...` 로 남아 있는지 확인
5. 관리자 smoke: `PUT /api/admin/settings` 저장이 HTTPS 로 2xx 응답하는지 확인

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

## 환경변수 추가 시 작업 순서

> 2026-04-18 장애 재발 방지용. 새 env 키를 추가할 때 반드시 이 순서를 따를 것.

1. **`backend/.env.example` 수정** — 새 키 추가, 프로덕션 필수 키면 끝에 `# REQUIRED` 주석 추가
2. **로컬 `backend/.env` 업데이트** — 개발 값 설정
3. **`backend/.env.production` 업데이트** — 운영 값 설정 (민감값은 `.env.secrets` 오버라이드 활용)
4. **원격 동기화**: `bash scripts/remote-env-sync.sh push`
5. **검증**: `bash scripts/remote-env-sync.sh verify` — 원격 `.env`에 REQUIRED 키가 모두 있는지 확인
6. **배포** — deploy.yml이 Step 2-1에서 REQUIRED 키를 재검증. 누락 시 배포 중단.

> **`# REQUIRED` 규칙**: `.env.example` 의 키 라인 끝에 `# REQUIRED` 주석을 붙이면
> `deploy.yml`(Step 2-1)과 `remote-env-sync.sh verify`가 자동으로 해당 키를 필수 항목으로 인식한다.
> NestJS bootstrap 전 `src/config/env-validator.ts`도 동일 목록을 검증하므로,
> 새 필수 키 추가 시 `REQUIRED_PROD_ENV_KEYS` 배열도 함께 업데이트한다.

---

## 트러블슈팅

### EC2 — PM2 프로세스 비정상 종료

#### 증상

배포 후 `pm2 status`에서 프로세스가 `errored` 상태.

#### 해결

```bash
pm2 logs commerce --lines 50   # 에러 로그 확인
pm2 restart ecosystem.config.js --env production --update-env  # 재시작
```

### DB SSL / 재시도 설정

- `DB_SSL_ENABLED=true`이면 `DB_SSL_CA_PATH`가 실제 CA 파일 경로를 가리켜야 하며, 배포 preflight와 TypeORM migration/app runtime 모두 같은 CA 파일을 읽는다.
- 운영 TypeORM은 PM2 로그에서 연결 문제를 좁힐 수 있도록 `logging: ['error', 'warn']`, `DB_RETRY_ATTEMPTS`(기본 5), `DB_RETRY_DELAY_MS`(기본 3000)를 사용한다.

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
pm2 start ecosystem.config.js --env production  # 프로세스 없으면 시작
```
