# Security Audit Snapshot (2026-04-21)

대상 이슈: #612, #613, #614, #617

## #612 인증·인가·접근 제어

### 확인 결과
- 프론트 라우트 보호 존재: `src/middleware.ts`
  - `/admin*` : accessToken + 관리자 role 검증 실패 시 리다이렉트
  - `/my*`, `/checkout*` : 비인증 접근 차단
- 백엔드 전역 가드 기반 인증/인가 존재
  - `backend/src/common/guards/jwt-auth.guard.ts`
  - `backend/src/common/guards/roles.guard.ts`
- 공개 엔드포인트는 `@Public()` 명시 패턴 유지 (`backend/src/modules/auth/auth.controller.ts` 등)
- 비밀번호 재설정 API
  - 계정 존재 여부 비노출 설명/구현 존재 (`forgot-password`)
  - rate limit 설정 존재 (`@Throttle`)
- OAuth state 검증 로직은 프론트/백엔드에서 명시적으로 확인되는 구현 증거를 현재 코드 탐색에서 찾지 못함 (추가 검증 필요)
- MFA 정책/구현은 현재 코드상 확인되지 않음

### 우선순위 제안
- P1: OAuth state 파라미터 검증 경로 명시/테스트 추가
- P2: MFA 정책 결정 및 도입 여부 확정

## #613 시크릿·데이터 보호·AI 입력 보안

### 확인 결과
- `.gitignore`에 `.env`, `*.pem`, `*.key` 제외 규칙 존재 (`.gitignore`)
- `console.log`는 런타임 코드가 아닌 seed/스크립트 경로에만 존재 (`backend/src/database/seeds/**`)
- 민감정보 마스킹 로그 인터셉터 테스트 다수 통과 (`backend/src/common/interceptors/logging.interceptor.spec.ts`)
- 주의사항: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`가 백엔드에서도 참조됨
  - `backend/src/modules/payments/adapters/stripe.adapter.ts`
  - publishable key라 치명 시크릿은 아니지만, 서버 측 변수 명명 분리 권장
- AI 프롬프트 인젝션 방어 체계(시스템 프롬프트 분리/출력 필터/탐지 로깅)는 코드 내 명시적 전용 계층 확인 어려움 (추가 점검 필요)

### 우선순위 제안
- P1: AI 입력 보안 정책/필터/로깅 경로 문서화 및 테스트
- P2: 서버 변수명에서 `NEXT_PUBLIC_*` 네이밍 분리

## #617 IMDS SSRF 노출

### 코드 기반 확인 결과
- 앱 코드에서 `169.254.169.254` 직접 호출 흔적 없음
- 미들웨어 백엔드 프록시는 런타임 `BACKEND_URL` 기반 forward (`src/middleware.ts`)
  - 현재 코드상 private/link-local 차단 로직은 명시적으로 없음
- 외부 HTTP 호출 어댑터 존재 (`backend/src/modules/**/adapters/*`)
  - 호스트 allowlist/사설대역 차단 유틸은 코드에서 명시적으로 확인되지 않음

### 운영 환경 확인 필요(리포지토리 밖)
- EC2 IMDSv2 강제(`HttpTokens=required`)
- IAM Role 최소권한
- SG/NACL/egress에서 metadata 접근 차단
- 이상 아웃바운드 탐지 로깅

### 우선순위 제안
- P1: 백엔드 outbound 요청 공통 SSRF 방어 유틸(사설/link-local 차단, redirect 재검증) 도입
- P1: 운영 계정에서 IMDSv2/IAM/egress 설정 증빙 캡처

## #614 인프라·모니터링·비용 보안

리포지토리만으로는 아래 항목의 실제 설정 여부를 확정할 수 없음.

- CloudWatch/GuardDuty/WAF/알림 채널
- IAM 권한, Security Group, S3 공개 정책
- 비용 알림(AWS/OpenAI/Stripe), usage cap

### 상태
- **Blocked (infra console 접근 필요)**
- 코드 저장소 외부 증빙(스크린샷/정책 JSON/알림 규칙) 확보 후 체크리스트 완료 가능
