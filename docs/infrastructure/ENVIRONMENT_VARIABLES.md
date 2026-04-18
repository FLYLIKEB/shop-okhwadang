# Environment Variables

## 프론트엔드 (Next.js)

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `BACKEND_URL` | `http://localhost:3000` | NestJS 백엔드 URL (`src/middleware.ts` 런타임 프록시와 서버 컴포넌트 fetch에서 사용) |

---

## Vercel Functions (프록시)

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `BACKEND_URL` | `http://<EC2_IP>:3000` | 백엔드 서버 URL |
| `BACKEND_TIMEOUT_MS` | `10000` | 프록시 타임아웃 (ms) |
| `LOG_PROXY_REQUESTS` | `true` | 프록시 요청 로깅 여부 |

---

## 백엔드 (NestJS)

### 서버

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `NODE_ENV` | `development` | 환경 (development/production) |
| `PORT` | `3000` | 서버 포트 |

### 데이터베이스

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `DATABASE_URL` | — | 프로덕션 DB 연결 URL |
| `LOCAL_DATABASE_URL` | — | 로컬 개발 DB 연결 URL |
| `TEST_DATABASE_URL` | — | 테스트 DB 연결 URL (DB명에 `test` 필수) |
| `DB_SYNCHRONIZE` | `false` | TypeORM 동기화 (개발만 `true`) |
| `DB_SSL_ENABLED` | `false` | SSL 활성화 여부 |

### 인증

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `JWT_SECRET` | — | JWT 시크릿 키 |
| `JWT_EXPIRES_IN` | `1h` | Access Token 만료 시간 |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh Token 만료 시간 |

### OAuth

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `KAKAO_CLIENT_ID` | — | 카카오 앱 키 |
| `KAKAO_CLIENT_SECRET` | — | 카카오 시크릿 |
| `GOOGLE_CLIENT_ID` | — | 구글 클라이언트 ID |
| `GOOGLE_CLIENT_SECRET` | — | 구글 시크릿 |

### CORS

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `FRONTEND_URL` | — | 프론트엔드 URL (CORS) |
| `FRONTEND_URLS` | — | 여러 프론트엔드 URL (쉼표 구분) |

### 결제

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PAYMENT_GATEWAY` | `mock` | PG 어댑터 선택 (`mock`/`toss`/`inicis`) |
| `TOSS_SECRET_KEY` | — | 토스페이먼츠 시크릿 키 |
| `TOSS_CLIENT_KEY` | — | 토스페이먼츠 클라이언트 키 |

### 스토리지

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `STORAGE_PROVIDER` | `local` | 스토리지 (`local`/`s3`/`r2`) |
| `S3_BUCKET` | — | S3 버킷명 |
| `S3_REGION` | — | S3 리전 |
| `S3_ACCESS_KEY` | — | S3 액세스 키 |
| `S3_SECRET_KEY` | — | S3 시크릿 키 |

### 알림 (이메일)

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `NOTIFICATION_PROVIDER` | `mock` | 이메일 어댑터 (`mock`/`resend`/`ses`). 프로덕션에서는 `mock` 금지 |
| `RESEND_API_KEY` | — | Resend API 키 (`NOTIFICATION_PROVIDER=resend` 시 필수) |
| `EMAIL_FROM` | `no-reply@okhwadang.com` | 발신자 이메일 주소 |

### Cache

백엔드 프로세스 내 `CacheService`(Map+TTL)만 사용. 외부 캐시(Redis/ElastiCache) 환경변수 없음.

---

## `.env.secrets` (gitignored) — 운영 민감값

실제 endpoint·계정·패스워드는 리포지토리에 커밋하지 않고 프로젝트 루트의 `.env.secrets`에 보관합니다.
키 이름만 아래에 기재합니다. 값은 `.env.secrets`를 직접 확인하세요.

### Lightsail MySQL

| 변수 | 설명 |
|------|------|
| `LIGHTSAIL_DB_NAME` | DB 인스턴스 이름 |
| `LIGHTSAIL_DB_REGION` | 리전 (`ap-northeast-2`) |
| `LIGHTSAIL_DB_HOST` | MySQL endpoint 호스트 |
| `LIGHTSAIL_DB_PORT` | 3306 |
| `LIGHTSAIL_DB_INITIAL_SCHEMA` | 초기 스키마 (`commerce`) |
| `LIGHTSAIL_DB_MASTER_USERNAME` | 관리 계정 (`dbadmin`) |
| `LIGHTSAIL_DB_MASTER_PASSWORD` | 관리 계정 패스워드 |
| `APP_DB_USER` | 앱 계정 (`okhwadang_app`) |
| `APP_DB_PASSWORD` | 앱 계정 패스워드 |
| `DATABASE_URL` | 앱 계정 기반 완성된 URL |

### EC2 bastion (로컬 SSH 터널용)

| 변수 | 설명 |
|------|------|
| `BASTION_HOST` | EC2 public IP |
| `BASTION_USER` | SSH user (`ec2-user`) |
| `BASTION_KEY` | SSH private key 경로 (`~/okhwadang-ec2-key.pem`) |

사용법은 [`REMOTE_DB_ACCESS.md`](./REMOTE_DB_ACCESS.md) 참조.

---

## 파일 구조

```
backend/.env              # 로컬 개발 (gitignore)
backend/.env.test         # 테스트 환경 (gitignore)
backend/.env.example      # 키 목록 (커밋 O, 값 없음)
```

> **`.env` 파일은 절대 커밋하지 않습니다.** `.env.example`에 키 목록만 기록합니다.
