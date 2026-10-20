# #613 시크릿·데이터 보호·입력 후속 감사 (2026-10-20)

기준: `origin/main`의 `8d9ea7711f0eb9bde59364b5dcd74d72c9fe1025`와 이 PR의 변경. 이슈 본문/댓글을 다시 읽었으며 4월 감사의 미확인 항목을 실제 취약점이나 구현된 기능으로 간주하지 않는다.

## 서버 환경변수 분리

- `backend/src/config/payment.config.ts:90`을 `STRIPE_PUBLISHABLE_KEY`로 바꿨다. 서버 시작 검증 `env-validator.ts`, backend 예시, config/Stripe adapter fixture와 인프라 문서도 같은 이름으로 맞췄다.
- `src/components/shared/checkout/PaymentGateway.tsx:728`과 루트 `.env.example`은 브라우저 공개 키인 `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`를 유지한다. publishable key라는 사실만으로 시크릿 노출이라고 판정하지 않는다.
- `createPaymentConfig`는 비어 있지 않은 `STRIPE_PUBLISHABLE_KEY`를 우선하고, 없거나 공백이면 서버 환경의 기존 `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` 별칭으로 fallback한다. `validateEnv`도 같은 규칙으로 두 이름 모두 비었을 때만 공개 키 누락으로 차단한다. 공개 키의 서버 내 별칭 호환이며 새 시크릿을 브라우저에 노출하는 변경은 아니다.
- **호환성과 이전 권고:** 기존 서버 별칭 설정을 유지하므로 이 PR 배포를 위한 env 이전은 필수가 아니다. 추후 승인된 설정 정리 시 새 이름으로 이전할 수 있다. 프론트 공개 키 설정은 별도로 유지한다. 운영 env는 읽거나 변경하지 않았다.
- `backend/scripts/verify-production-runtime.js` 및 `backend/src/config/production-runtime-preflight.ts`를 확인했다. preflight는 빌드 산출물·알림 설정·DB 연결을 확인하며 Stripe 공개 키 이름을 별도로 강제하지 않는다. 따라서 호환성 수정 대상은 config와 Nest 시작 env 검증이다. 운영 DB에 연결하는 preflight 자체는 실행하지 않았다.

## 실제 입력/출력 경로

| 점검 | 근거 및 현재 판정 |
| --- | --- |
| 생성형 AI/LLM | `backend/src`, `src`, 양쪽 package manifest에서 OpenAI/Anthropic/LangChain/Gemini, prompt/chat completion 경로를 검색하고 HTTP 호출 모듈을 대조했다. LLM SDK, 시스템 프롬프트, 에이전트 tool 실행/전용 AI endpoint를 찾지 못했다. LLM 시스템 프롬프트 분리·유출 필터·명령 탈취 탐지 로깅은 **해당 구현 기준 N/A**다. 존재하지 않는 AI 보안 기능을 추가하지 않았다. |
| 실제 기계번역 | `backend/src/modules/reviews/reviews.controller.ts:88`의 공개 `POST /api/reviews/translate`는 30/min 제한을 가진다. `TranslateReviewDto`는 문자열 1–2000자와 ko/en enum을 검증한다. 전역 `ValidationPipe`가 whitelist/forbidNonWhitelisted를 적용한다. |
| 외부 전송 | `ReviewsService.translateReviewContent`는 trim/빈값 거절 후 고정 `translate.googleapis.com/translate_a/single` URL에 `URLSearchParams`의 q로 리뷰를 전송한다. 5초 abort와 실패 502가 있다. 시스템/사용자 프롬프트 결합이나 tool 호출이 아니다. 동일 언어면 외부 요청 없이 원문을 반환한다. |
| 출력/XSS | `src/components/shared/reviews/ReviewCard.tsx:123`은 원문·번역문을 React 텍스트 자식으로 표시한다. 보강한 `ReviewList.test.tsx`는 `<img onerror>` 원문과 `<script>`/명령형 번역문을 텍스트로만 표시하고 실행 요소를 만들지 않는지 확인한다. 모든 HTML/CMS 출력 경로 전체에 대한 보증은 아니다. |
| 로그 한계 | 번역 서비스는 실패 시 `error.message`를 Logger에 기록한다. `LoggingInterceptor.buildPayload`는 요청 본문을 공통 마스킹 후 기록하지만 자유 입력 text/content 전체를 자동 개인정보 제거한다고 보증하지 않는다. 전용 프롬프트 인젝션 탐지 로그는 없으며 LLM 경로가 없어 신설하지 않았다. 번역 원문·공급자 오류의 개인정보 처리/보관 검토는 필요하다. |

## 시크릿/데이터 확인과 미확인 범위

- `git ls-files '*env*' '*.pem' '*.key'`로 추적 파일을 확인했다. 실제 env/PEM/key 파일은 없으며 예시·설정 코드만 추적된다. `.gitignore`는 env/PEM/key를 제외한다. 이것은 **전체 Git 히스토리에 시크릿이 전혀 없었다는 증거가 아니다**.
- GitHub repository API를 2026-10-20 조회한 결과 secret scanning/push protection은 enabled, 반환된 open secret alert는 0건이다. 설정 활성/미탐지 상태는 과거 유출 부재나 실제 키 교체의 증명이 아니다. 알림 원문·시크릿 값은 출력하지 않았다.
- `TokenIssuerService.issueTokens` payload는 sub/email/role 및 tokenType/access jti다. password/카드/전체 사용자 객체는 넣지 않지만 email 최소화 필요성은 별도 검토 대상이다. `auth.config.ts`는 access 1h/refresh 7d 기본값, `auth.module.ts`는 RS256 access 서명을 설정한다. `env-validator.ts`의 secret 존재 검사는 강도·실제 운영 키 교체까지 보장하지 않는다.
- `src/content/legal/privacy-policy.mdx`/영문 문서에는 보유/파기와 국외 공급자 고지가 있다. 실제 파기 실행, 공급자 계약, 번역 원문 외부 전송에 대한 고지·동의 적정성까지 증명하지 않는다. 법률 준수 판정은 이 문서의 결론이 아니다.
- 구조화 로그 마스킹 결함 #1341과 CSP #1277은 다른 담당자 범위다. 그 파일을 수정하거나 해당 수정/배포가 완료됐다고 간주하지 않는다. 런타임 자유문자열 로그까지 개인정보가 없다고 주장하지 않는다.

## 실행 증거

- `cd backend && npm test -- --runInBand config/__tests__/payment.config.spec.ts config/__tests__/env-validator.spec.ts modules/payments/__tests__/stripe.adapter.spec.ts modules/reviews/__tests__/reviews.service.spec.ts` — 호환성 보완 후 4 suites / 69 tests 통과. 보완 전 신규 회귀 7개 실패를 확인했다. 새 이름 우선, 새 이름 미설정/빈값/공백일 때 기존 별칭 사용, 두 이름 모두 빈 경우 거절을 검사했다.
- `npx vitest run src/components/shared/reviews/__tests__/ReviewList.test.tsx` — 1 file / 10 tests 통과.
- 백엔드 build 및 변경 백엔드 파일 ESLint 통과.
- 독립 `npm run typecheck`, 변경 프론트 파일 ESLint, project guard, diff check 통과. 서버의 `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` 참조는 기존 배포 설정 호환을 위한 공개 키 별칭으로 유지한다.
- 프론트 build는 컴파일·타입 검사 후 백엔드 `ECONNREFUSED`로 prerender 실패했다. 서비스는 재시작하지 않았다. DB E2E, 실제 Stripe/Google 번역 호출, 빌드 JS의 실제 운영 시크릿 대조/전체 역사 스캔은 수행하지 않았다.
- `make bootstrap`은 Node 의존성·개발 설정 준비 후 선택 `code-review-graph`의 PyPI 배포본 부재로 최종 실패했다. 지정된 PyPI 환경변수를 적용했으며 새 의존성을 추가하지 않았다.

## 잔여 blocker와 종료 판단

| 우선순위 | 담당/필요 증거 |
| --- | --- |
| P1 운영 | #1341 수정 검증/배포 및 자유문자열 로그·번역 원문/오류의 개인정보 보관 경로 검토. 로그 보관 정책 문서와 실제 수집/접근/삭제 설정을 대조해야 한다. |
| P2 운영 | 운영 키 90일 교체 정책과 실제 교체 이력, 전체 Git 역사/배포 번들 스캔 근거. 이번 조회의 open alert 0만으로 대체하지 않는다. Stripe 서버 변수 이전은 권고이며 배포 blocker가 아니다. |
| P2 개인정보 책임자 | 실제 개인정보 파기 실행, 번역 서비스 외부 전송 고지/처리 근거, 침해 대응 담당자·신고 절차 및 훈련/운영 증거. 이슈의 “72시간”을 모든 상황에 적용되는 법률 요건으로 단정하지 않는다. |
| 검증 | 백엔드가 있는 격리 환경의 전체 프론트 build 및 통합 확인. |

서버 이름 분리와 실제 리뷰 출력 회귀 검증, LLM 항목의 N/A 근거는 제공했다. **#613 전체 종료는 제안하지 않는다.** 위 운영/정책 증거와 별도 로그 수정 검증이 남아 있다.
