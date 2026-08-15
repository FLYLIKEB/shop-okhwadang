# Environment Variables

## 프론트엔드 / Vercel 런타임

| 변수          | 기본값                  | 설명                                                                                                                                                                                                         |
| ------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `BACKEND_URL` | `http://localhost:3000` | Next.js middleware 프록시와 SSR fetch가 공유하는 **백엔드 origin**. canonical contract는 `origin only` 이며 앱 코드가 `/api/*` 를 붙인다. 예: 로컬 `http://localhost:3000`, 운영 `https://api.ockhwadang.com` |
| `SITE_URL`    | `http://localhost:5173` | canonical 프론트엔드 origin. 메타데이터/redirect/배포 smoke test 기준 URL                                                                                                                                    |
| `NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS` | `toss,paypal,eximbay` | 체크아웃 노출 계약. 한국어는 Toss 결제위젯만, 영어는 PayPal/Eximbay를 노출 |

### 프록시 계약 메모

- 브라우저/CSR은 항상 `/api/*` 만 호출한다.
- middleware(`src/middleware.ts`)와 SSR helper(`src/lib/api-server.ts`, `src/app/[locale]/layout.tsx`)가 같은 `BACKEND_URL + /api/*` 규칙을 사용한다.
- 프론트 운영값은 `https://api.ockhwadang.com` 으로 유지하고, Cloudflare는 `Full (strict)` 로 EC2 443 origin에 연결한다.
- `BACKEND_URL`에 `/api` 를 붙여 넣는 구성이 남아 있어도 코드가 정규화하지만, 문서/환경은 **반드시 origin only** 로 정렬한다.

---

## Vercel Functions (프록시)

| 변수                 | 기본값                       | 설명                                                |
| -------------------- | ---------------------------- | --------------------------------------------------- |
| `BACKEND_URL`        | `https://api.ockhwadang.com` | 백엔드 origin URL (Cloudflare Proxied + Full (strict)) |
| `BACKEND_TIMEOUT_MS` | `10000`                      | 프록시 타임아웃 (ms)                                |
| `LOG_PROXY_REQUESTS` | `true`                       | 프록시 요청 로깅 여부                               |

---

## 백엔드 (NestJS)

### 서버

| 변수       | 기본값        | 설명                          |
| ---------- | ------------- | ----------------------------- |
| `NODE_ENV` | `development` | 환경 (development/production) |
| `PORT`     | `3000`        | 서버 포트                     |
| `BACKEND_URL` | `https://api.ockhwadang.com/api` | 백엔드 외부 기준 URL (결제 webhook/status_url, 업로드 절대 URL 생성에 사용). 프로덕션은 HTTPS만 허용 |

### 데이터베이스

| 변수                 | 기본값  | 설명                                    |
| -------------------- | ------- | --------------------------------------- |
| `DATABASE_URL`       | —       | 프로덕션 DB 연결 URL                    |
| `LOCAL_DATABASE_URL` | —       | 로컬 개발 DB 연결 URL                   |
| `TEST_DATABASE_URL`  | —       | 테스트 DB 연결 URL (DB명에 `test` 필수) |
| `DB_SYNCHRONIZE`     | `false` | TypeORM 동기화 (개발만 `true`)          |
| `DB_SSL_ENABLED`     | `false` | SSL 활성화 여부                         |

### 인증

| 변수                     | 기본값 | 설명                    |
| ------------------------ | ------ | ----------------------- |
| `JWT_SECRET`             | —      | JWT 시크릿 키           |
| `JWT_EXPIRES_IN`         | `1h`   | Access Token 만료 시간  |
| `JWT_REFRESH_EXPIRES_IN` | `7d`   | Refresh Token 만료 시간 |

### OAuth

| 변수                   | 기본값 | 설명               |
| ---------------------- | ------ | ------------------ |
| `KAKAO_CLIENT_ID`      | —      | 카카오 앱 키       |
| `KAKAO_CLIENT_SECRET`  | —      | 카카오 시크릿      |
| `GOOGLE_CLIENT_ID`     | —      | 구글 클라이언트 ID |
| `GOOGLE_CLIENT_SECRET` | —      | 구글 시크릿        |

### CORS

| 변수            | 기본값 | 설명                            |
| --------------- | ------ | ------------------------------- |
| `FRONTEND_URL`  | —      | 프론트엔드 URL (CORS)           |
| `FRONTEND_URLS` | —      | 여러 프론트엔드 URL (쉼표 구분) |

### 결제

체크아웃 노출 계약의 단일 소스는 `backend/src/config/checkout-gateway-contract.ts`입니다. 게이트웨이 추가/제거 시 아래 변수와 `next.config.ts` CSP가 함께 갱신됩니다.

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `CHECKOUT_ENABLED_GATEWAYS` | `toss,paypal,eximbay` | 백엔드 체크아웃 노출 계약. 한국어는 Toss 결제위젯만 허용 |
| `NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS` | `toss,paypal,eximbay` | 프론트 체크아웃 노출 계약. Vercel 빌드 시 CSP 허용 목록도 이 값 기준으로 계산 |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | — | Toss 결제위젯 클라이언트 키. 운영 배포 전에 문서용 테스트 키를 실제 상점 키로 교체 |
| `TOSS_CLIENT_KEY` | — | 백엔드가 결제 준비 응답으로 전달하는 Toss 결제위젯 클라이언트 키 |
| `TOSS_SECRET_KEY` | — | Toss 승인·취소 API 시크릿 키. 클라이언트 키와 같은 상점 키 쌍을 사용 |
| `PAYMENT_GATEWAY` | `mock` | 백엔드 기본 PG 어댑터 (`mock`/`toss`/`stripe`/`inicis`/`naverpay`/`paypal`/`eximbay`). `mock`은 프로덕션 차단 |
| `NAVERPAY_PARTNER_ID` | — | NaverPay partner ID (프로덕션 체크아웃 필수) |
| `NAVERPAY_CLIENT_ID` | — | NaverPay client ID (프로덕션 체크아웃 필수) |
| `NAVERPAY_CLIENT_SECRET` | — | NaverPay client secret (프로덕션 체크아웃 필수) |
| `NAVERPAY_CHAIN_ID` | — | NaverPay chain ID (프로덕션 체크아웃 필수) |
| `PAYPAL_CLIENT_ID` | — | PayPal REST API client ID (프로덕션 체크아웃 필수) |
| `PAYPAL_CLIENT_SECRET` | — | PayPal REST API client secret (프로덕션 체크아웃 필수) |
| `PAYPAL_WEBHOOK_ID` | — | PayPal webhook signature verification ID |
| `PAYPAL_API_BASE_URL` | sandbox/prod default | PayPal REST API base URL override |
| `PAYPAL_KRW_PER_USD` | `1350` | PayPal USD 결제를 위한 KRW→USD 환산 기준 |
| `EXIMBAY_MERCHANT_ID` | — | Eximbay merchant ID (프로덕션 체크아웃 필수) |
| `EXIMBAY_API_KEY` | — | Eximbay Payment Preparation/Verify API key (프로덕션 체크아웃 필수) |
| `EXIMBAY_SECRET_KEY` | — | Eximbay API secret key (프로덕션 체크아웃 필수) |
| `EXIMBAY_WEBHOOK_SECRET` | — | Eximbay webhook HMAC secret |
| `EXIMBAY_API_BASE_URL` | `https://api-test.eximbay.com` | Eximbay API base URL (production 계약 후 교체) |
| `EXIMBAY_JS_SDK_URL` | `https://api-test.eximbay.com/v1/javascriptSDK.js` | Eximbay hosted payment page SDK URL |
| `EXIMBAY_CURRENCY` | `KRW` | Eximbay 결제 통화 (`USD` 사용 시 `EXIMBAY_KRW_PER_USD`로 환산) |
| `EXIMBAY_LANG` | locale 기반 | Eximbay 결제창 언어 강제 override (`KR`/`EN`) |
| `EXIMBAY_SHOP_NAME` | `Okhwadang` | Eximbay 결제창 상점명 |
| `EXIMBAY_KRW_PER_USD` | `1350` | Eximbay USD 결제를 위한 KRW→USD 환산 기준 |
| `TOSS_SECRET_KEY` | — | Toss adapter 시크릿 키 (기본 어댑터/레거시 결제 재시도용) |
| `TOSS_CLIENT_KEY` | — | Toss adapter 클라이언트 키 |
| `STRIPE_SECRET_KEY` | — | Stripe adapter 시크릿 키 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | — | Stripe 공개 키 |
| `STRIPE_WEBHOOK_SECRET` | — | Stripe 웹훅 서명 키 |
| `INICIS_MID` | — | KG Inicis MID |
| `INICIS_SIGN_KEY` | — | KG Inicis sign key |
| `INICIS_API_KEY` | — | KG Inicis API key |
| `INICIS_CLIENT_KEY` | — | KG Inicis client key |

### 스토리지

| 변수               | 기본값  | 설명                         |
| ------------------ | ------- | ---------------------------- |
| `STORAGE_PROVIDER` | `local` | 스토리지 (`local`/`s3`/`r2`) |
| `S3_BUCKET`        | —       | S3 버킷명                    |
| `S3_REGION`        | —       | S3 리전                      |
| `S3_ACCESS_KEY`    | —       | S3 액세스 키                 |
| `S3_SECRET_KEY`    | —       | S3 시크릿 키                 |

### 알림 (이메일)

| 변수                    | 기본값                    | 설명                                                                                   |
| ----------------------- | ------------------------- | -------------------------------------------------------------------------------------- |
| `NOTIFICATION_PROVIDER` | `mock`                    | 이메일 어댑터 (`mock`/`resend`/`ses`). 프로덕션에서는 `mock` 금지                      |
| `RESEND_API_KEY`        | —                         | Resend API 키 (`NOTIFICATION_PROVIDER=resend` 시 필수)                                 |
| `EMAIL_FROM`            | `no-reply@ockhwadang.com` | 발신자 이메일 주소. 운영 DNS(`ockhwadang.com`)의 SPF/DMARC 정책과 동일 도메인으로 유지 |

### Cache

백엔드 프로세스 내 `CacheService`(Map+TTL)만 사용. 외부 캐시(Redis/ElastiCache) 환경변수 없음.

---

## `.env.secrets` (gitignored) — 운영 민감값

실제 endpoint·계정·패스워드는 리포지토리에 커밋하지 않고 프로젝트 루트의 `.env.secrets`에 보관합니다.
키 이름만 아래에 기재합니다. 값은 `.env.secrets`를 직접 확인하세요.

### Lightsail MySQL

| 변수                           | 설명                      |
| ------------------------------ | ------------------------- |
| `LIGHTSAIL_DB_NAME`            | DB 인스턴스 이름          |
| `LIGHTSAIL_DB_REGION`          | 리전 (`ap-northeast-2`)   |
| `LIGHTSAIL_DB_HOST`            | MySQL endpoint 호스트     |
| `LIGHTSAIL_DB_PORT`            | 3306                      |
| `LIGHTSAIL_DB_INITIAL_SCHEMA`  | 초기 스키마 (`commerce`)  |
| `LIGHTSAIL_DB_MASTER_USERNAME` | 관리 계정 (`dbadmin`)     |
| `LIGHTSAIL_DB_MASTER_PASSWORD` | 관리 계정 패스워드        |
| `APP_DB_USER`                  | 앱 계정 (`okhwadang_app`) |
| `APP_DB_PASSWORD`              | 앱 계정 패스워드          |
| `DATABASE_URL`                 | 앱 계정 기반 완성된 URL   |

### EC2 bastion (로컬 SSH 터널용)

| 변수           | 설명                                             |
| -------------- | ------------------------------------------------ |
| `BASTION_HOST` | EC2 public IP                                    |
| `BASTION_USER` | SSH user (`ec2-user`)                            |
| `BASTION_KEY`  | SSH private key 경로 (`~/okhwadang-ec2-key.pem`) |

사용법은 [`REMOTE_DB_ACCESS.md`](./REMOTE_DB_ACCESS.md) 참조.

---

## 파일 구조

```
backend/.env              # 로컬 개발 (gitignore)
backend/.env.test         # 테스트 환경 (gitignore)
backend/.env.example      # 키 목록 (커밋 O, 값 없음)
```

> **`.env` 파일은 절대 커밋하지 않습니다.** `.env.example`에 키 목록만 기록합니다.
