# #612 인증·인가 후속 감사 (2026-10-20)

기준: `origin/main`의 `8d9ea7711f0eb9bde59364b5dcd74d72c9fe1025`와 이 PR의 변경. 이슈 본문과 2026-04-21 마지막 댓글을 재확인했다. 과거 `security-audit-2026-04-21.md`의 “state 구현 증거 없음”, “checkout 비인증 차단”을 현재 결론으로 사용하지 않는다.

## 확인 및 수정

| 항목 | 현재 근거와 판정 |
| --- | --- |
| OAuth state 생성 | `src/contexts/AuthContext.tsx:33`의 `generateState()`는 `crypto.getRandomValues` 32바이트를 사용한다. `loginWithKakao`/`loginWithGoogle`은 state를 sessionStorage에 저장하고 authorize URL에 넣는다. |
| 콜백 검증 | `src/components/shared/auth/OAuthCallbackHandler.tsx:22`는 code 누락, state 누락, 브라우저 저장값 누락, 불일치를 API 호출 전에 거절한다. 일치하면 API 호출 전에 저장값을 지운다. `src/lib/api/auth.ts`는 백엔드로 code만 보낸다. |
| 검증 경계 | `backend/src/modules/auth/dto/oauth-callback.dto.ts:4`에 명시된 대로 state 비교는 브라우저 경계다. 백엔드가 state를 재검증한다거나 PKCE를 사용한다고 주장하지 않는다. `OAuthService.exchangeKakaoToken`/`exchangeGoogleToken`의 redirect URI는 서버 설정값이며 요청 본문에서 받지 않는다. 공급자 콘솔의 실제 콜백 등록 목록은 미확인이다. |
| 비밀번호 재설정 | `backend/src/modules/auth/auth.service.ts:34`의 발급 TTL이 60분이어서 이슈의 15분 이내 기준과 달랐다. 15분으로 수정했고 저장 만료 시각과 메일 안내를 함께 검사한다. `resetPassword`는 만료/사용 토큰 거절과 `usedAt IS NULL` 조건부 소비를 수행한다. 기존 발급 토큰의 만료 시각은 소급 변경하지 않는다. |
| 재설정 응답 | `AuthService.forgotPassword`는 미존재/비활성 계정에도 같은 응답을 반환한다. `AuthController.forgotPassword`에 1분당 1회 제한이 있다. 메일 전송 실패까지 동일 응답이라고 보증하지 않는다. |
| 관리자/회원 경로 | `src/middleware.ts:243` 이후 `/admin*` role 검증과 회원 경로 검증을 수행한다. `/checkout`은 현재 공개 구매 경로다. `src/app`에서 독립 `/dashboard`, `/internal` 페이지는 찾지 못했고 관리자 dashboard는 `/admin/dashboard`다. |
| 서버 권한 | `backend/src/app.module.ts`의 전역 throttler → JWT → roles guard, `JwtStrategy.validate`의 활성/이메일인증/블랙리스트 검사, `RolesGuard`의 역할 검사를 확인했다. API 프록시는 최종 권한 판단을 백엔드에 위임한다. 모든 API의 전수 동적 검증은 이번 범위가 아니다. |
| IDOR 표본 | `OrdersService.findOne`의 소유권 검사 및 `orders.service.spec.ts`의 다른 회원 거절/비회원 주문 거절 테스트를 실행했다. 전체 리소스의 IDOR 부재로 확대 해석하지 않는다. |
| 로그아웃/만료 | `AuthService.logout`은 access jti 블랙리스트와 refresh 해제를 수행한다. `JwtStrategy`는 RS256 및 만료 검증을 사용한다. 미들웨어의 서명만으로 로그아웃 차단을 보증하지 않으며 최종 API는 블랙리스트를 검사한다. |
| 세션/동시 로그인 | `backend/src/config/auth.config.ts`의 기본 access 1시간/refresh 7일, `TokenIssuerService.issueAndPersistRefresh`의 사용자별 단일 refresh 해시를 확인했다. 새 로그인은 이전 refresh를 대체하지만 기존 access 전체를 즉시 폐기하는 동시 로그인 금지 정책은 아니다. |
| 로그인 제한 | `AuthController`의 auth 30/min, `AuthLoginPolicyService`의 5회/10회/15회 잠금 분기와 관련 테스트를 확인했다. |
| MFA | `backend/src`, `src`, `docs/project`, `docs/planning`에서 MFA/TOTP/WebAuthn/2FA 설정·challenge·복구 정책을 찾지 못했다. `docs/marketing/2-2_보안_정책.md:35`의 MFA 지원 문구를 실제 상태로 정정했다. 도입 의무나 예외를 임의로 만들지 않는다. |

## 실행 증거

- 프론트: `npx vitest run src/components/__tests__/OAuthCallbackHandler.test.tsx src/components/__tests__/AuthContext.test.tsx src/__tests__/middleware.test.ts` — 3 files / 42 tests 통과. state 누락/저장값 누락을 두 공급자에서 거절하고, 불일치 API 미호출, 소비 후 재호출 거절을 보강했다.
- 백엔드: `npm test -- --runInBand modules/auth common/guards/roles.guard.spec.ts common/guards/jwt-auth.guard.spec.ts modules/orders/__tests__/orders.service.spec.ts` — 10 suites / 120 tests 통과. 실제 현재 경로의 OAuth, reset, blacklist, JWT, 잠금, 주문 소유권 테스트다.
- `cd backend && npm run build`와 변경 백엔드 파일 ESLint 통과.
- 독립 실행한 `npm run typecheck`, 변경 프론트 파일 ESLint, `bash scripts/codex-project-guard.sh`, `git diff --check` 통과.
- 프론트 `npm run build`는 컴파일·타입 검사 후 prerender에서 백엔드 `ECONNREFUSED`로 실패했다. 공유 서비스 재시작 금지 조건을 지켰다. 빌드 성공을 주장하지 않는다.
- 두 종류 Node 의존성·개발 설정 준비 후 선택 Python 도구 `code-review-graph` 배포본을 찾지 못해 `make bootstrap` 최종 단계는 실패했다. 지정된 PyPI 환경변수를 적용했다. DB E2E/실제 OAuth 공급자 로그인은 실행하지 않았다.

## 잔여 항목과 종료 판단

1. **P2 정책 blocker — 운영 책임자:** 관리자 MFA 적용 대상, 필수 여부, 분실/복구 절차 또는 도입하지 않는다는 명시적 위험 수용 결정과 승인 기록이 없다. 이 PR은 해당 정책을 승인하지 않는다.
2. **외부 증거 — OAuth 앱 관리자:** Kakao/Google 콘솔의 실제 허용 callback URI 목록 및 테스트 계정 로그인/로그아웃 증거가 필요하다. 코드의 고정 설정과 콘솔 실설정은 다른 증거다.
3. **검증 gap:** 백엔드에 연결 가능한 격리 환경에서 프론트 전체 빌드와 DB E2E를 완료해야 한다. 공유 서비스를 조작하지 않았다.

따라서 state 검증 경로·테스트 보완과 reset TTL 결함 수정은 완료했지만 **#612 전체 종료는 제안하지 않는다**. MFA 결정과 외부/통합 증거 확보 전에는 OPEN 유지가 정확하다.
