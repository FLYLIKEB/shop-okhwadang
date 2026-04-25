# Security Guide

## 보안 계층

```
요청 → CORS 검증 → Rate Limiting → 인증 (JWT Guard) → 검증 (ValidationPipe) → Controller
```

---

## 인증/인가

### JWT
- Access Token + Refresh Token
- JWT Guard 전역 적용 (공개 엔드포인트는 `@Public()` 데코레이터)

### RBAC (역할 기반 접근 제어)
- `user` — 일반 회원
- `admin` — 관리자
- `super_admin` — 슈퍼 관리자
- `@Roles('admin')` 데코레이터로 접근 제한

### OAuth
- 카카오, 구글 소셜 로그인 지원

---

## Rate Limiting

| 범위 | 제한 |
|------|------|
| 전역 | 기본 1분당 200회 (`THROTTLE_GLOBAL_LIMIT`) |
| 인증 엔드포인트 | 기본 1분당 30회 (`THROTTLE_AUTH_LIMIT`) |
| 비밀번호 찾기 | 기본 1분당 1회, 이메일 기준 우선 제한 (`THROTTLE_FORGOT_PASSWORD_LIMIT`) |

NestJS `ThrottlerModule`을 사용하며, 인증 사용자는 user id 기준, 비인증 사용자는 IP 기준으로 제한한다.

---

## CORS

- 허용된 Origin만 요청 허용
- Credentials 허용 (쿠키/인증 헤더)
- 프론트엔드 URL을 환경변수로 관리 (`FRONTEND_URL`, `FRONTEND_URLS`)

---

## 입력 검증

- **DTO 기반** 검증 (class-validator)
- **ValidationPipe** 전역 적용
- `whitelist: true` — DTO에 정의되지 않은 프로퍼티 자동 제거
- `forbidNonWhitelisted: true` — 정의되지 않은 프로퍼티 요청 시 에러

---

## 비밀번호

- **bcrypt** 해싱 (salt rounds: 10+)
- 평문 비밀번호 저장/로깅 금지

---

## 결제 보안

- 서버 사이드 금액 검증 필수 (클라이언트 전달 금액 신뢰하지 않음)
- PG 웹훅 서명 검증
- 결제 상태 전이는 서버에서만 관리

---

## 관리자 감사 로그

- 관리자 주문/회원/상품/쿠폰/export 액션과 주요 인증 이벤트를 감사 로그로 기록한다.
- 보관 기간은 기본 3년으로 한다. 법적 분쟁, 결제/환불 이슈, 보안 사고 조사 중인 로그는 종료 전까지 삭제하지 않는다.
- 조회 권한은 `super_admin` 전용을 원칙으로 하고, 일반 `admin`은 감사 로그 전체 조회 권한을 갖지 않는다.
- 로그에는 actor id, actor role, action, resource type/id, 변경 전후 JSON, IP, user-agent를 저장한다.
- 개인정보와 시크릿은 저장 전 마스킹한다. 비밀번호, 토큰, API key, 결제 원문 중 민감 필드는 원문 저장 금지다.
- export 로그는 다운로드 사유와 대상 범위를 남긴다.

---

## 환경 변수 관리

- `.env` 파일 `.gitignore`에 포함 — **절대 커밋 금지**
- `.env.example`에 키 목록만 기록 (값 없이)
- 프로덕션 시크릿은 배포 환경에서 직접 설정 (Vercel 환경변수, EC2 `.env` 또는 GitHub Secrets)

---

## SSH 키 관리

- SSH 키(`*.pem`, `*.key`)는 `~/.ssh/` 디렉토리에 저장
- `.gitignore`에 포함 (`*.pem`, `*.key`)
- 환경변수로 경로 관리: `SSH_KEY_PATH=~/.ssh/your-key.pem`

### 만약 실수로 커밋한 경우

1. **즉시 키 교체** — AWS 콘솔에서 새 키 생성
2. Git 히스토리에서 제거 (`git filter-branch`)
3. 강제 푸시

---

## 보안 체크리스트

- [ ] `.pem`, `.key` 파일이 `.gitignore`에 포함됨
- [ ] `.env` 파일이 `.gitignore`에 포함됨
- [ ] SSH 키가 `~/.ssh/`에 있음 (프로젝트 루트에 없음)
- [ ] 환경변수로 시크릿 관리 (하드코딩 없음)
- [x] Rate limiting 설정됨
- [x] CORS 허용 Origin 설정됨
- [x] ValidationPipe 전역 적용됨
- [x] 결제 금액 서버 사이드 검증 구현됨
- [ ] HTTPS 강제 (프로덕션 인프라에서 확인)
- [x] 보안 헤더 설정 (Helmet)
- [x] 관리자 감사 로그 기본 구조 구현됨
