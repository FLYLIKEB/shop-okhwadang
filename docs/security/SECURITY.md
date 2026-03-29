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
| 전역 | 1분당 10회 |
| 인증 엔드포인트 | 1분당 5회 |

NestJS `ThrottlerModule` 사용.

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

## 환경 변수 관리

- `.env` 파일 `.gitignore`에 포함 — **절대 커밋 금지**
- `.env.example`에 키 목록만 기록 (값 없이)
- 프로덕션 시크릿은 배포 환경(Vercel, EC2)에서 직접 설정

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
- [ ] Rate limiting 설정됨
- [ ] CORS 허용 Origin 설정됨
- [ ] ValidationPipe 전역 적용됨
- [ ] 결제 금액 서버 사이드 검증 구현됨
- [ ] HTTPS 강제 (프로덕션)
- [ ] 보안 헤더 설정 (Helmet 등)
