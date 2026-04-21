# 옥화당 자사몰

> 자사호·보이차·다구 전문 브랜드 **옥화당**의 D2C 독립 쇼핑몰.
> 스마트스토어에서 독립하여 브랜드 스토리텔링, 데이터 소유, 글로벌 판매를 실현한다.

## 핵심 기능

| 기능 | 설명 |
|------|------|
| **글로벌 스토어** | 한국어/영어 다국어, KRW/USD 이중 가격 |
| **작가·산지 스토리텔링** | 자사호별 작가 소개, 산지·흙·제작 과정 전용 페이지 |
| **블록 빌더 어드민** | 코드 없이 메인 페이지 블록 조립, 테마 컬러 변경 |
| **네이버페이 결제** | 필수 적용 + 토스페이먼츠/이니시스 어댑터 |
| **스마트스토어 리뷰 연동** | 기존 리뷰를 자사몰에 표시 |
| **인스타그램 쇼핑** | Instagram Shopping 연동 SNS 판매 |
| **인플루언서 쿠폰** | 쿠폰 코드 발급·관리 |
| **알림 발송** | 카카오톡/SMS 주문 알림 |

## 기술 스택

| 영역 | 기술 | 비고 |
|------|------|------|
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript | SSR |
| UI | TailwindCSS v4 + Radix UI (shadcn/ui) | cn() 유틸, 테마 토큰 |
| 상태관리 | React Context | AuthContext, CartContext |
| Backend | NestJS + TypeORM + MySQL | Controller → Service → Entity |
| DB | MySQL 8.0 (Docker) | TypeORM Migration CLI |
| 인증 | JWT + OAuth (카카오/구글) | |
| 결제 | 네이버페이 + 토스페이먼츠 | 어댑터 패턴으로 PG 교체 가능 |
| 배송 | 택배사 API 연동 | 어댑터 패턴으로 택배사 교체 가능 |
| 캐시 | In-memory (CacheService) | 설정/상품 핫 데이터, TTL 기반 |
| 스토리지 | AWS S3 + CloudFront | 이미지/미디어 CDN |
| 인프라 | Docker Compose | 로컬 MySQL 관리 |
| FE 배포 | Vercel Pro | Next.js SSR 자동 배포 |
| BE 배포 | AWS EC2 t3.small + PM2 | Nginx (HTTP), HTTPS는 Cloudflare/Vercel 종료 |
| DB 호스팅 | AWS Lightsail MySQL | 7일 자동 백업 |
| 테스트 | Vitest (FE) + Jest E2E (BE) | |
| Node.js | 22.x | .nvmrc로 고정 |

## 프로젝트 구조

```
shop-okhwadang/
├── src/                    # 프론트엔드 (Next.js 15 App Router)
│   ├── app/                # Next.js App Router (layout, pages, route groups)
│   ├── components/         # 재사용 UI
│   ├── components/ui/      # shadcn/ui 래퍼 + cn()
│   ├── lib/api.ts          # API 클라이언트
│   ├── hooks/              # 커스텀 훅
│   ├── contexts/           # React Context (Auth, Cart)
│   ├── utils/              # 유틸리티
│   ├── constants/          # 전역 상수
│   └── styles/             # TailwindCSS v4 토큰
├── backend/                # 백엔드 (NestJS)
│   └── src/modules/        # auth, users, products, orders, payments, shipping, admin...
├── docs/                   # 기술 문서
├── scripts/                # 유틸리티 스크립트
└── .claude/rules/          # Claude AI 규칙
```

## 시작하기

```bash
# (권장) 워크트리 최초 진입 시 부트스트랩 + Git hook 설정
bash scripts/setup-git-hooks.sh
make bootstrap

# 풀스택 로컬 개발 (SSH Tunnel + Backend + Frontend)
bash scripts/start-local.sh

# 프론트엔드만 개발 서버
npm run dev

# 프론트엔드 빌드 + 테스트
npm run build && npm run test:run

# 백엔드 빌드 + 테스트
cd backend && npm run build && npm run test

# 백엔드 E2E 테스트 (DB 스키마 변경 시 필수)
cd backend && npm run test:e2e

# MySQL 시작/정지
cd backend && docker compose up -d
cd backend && docker compose down -v   # DB 초기화
```

### 워크트리 안정화 루틴

```bash
# 의존성/venv/code-review-graph/.env 선행 준비
make bootstrap

# 선행 준비 + FE/BE 기본 검증
make verify

# 선행 준비 후 로컬 서버 시작
make up
```

- `post-checkout` hook 이 설정되어 있으면 (`bash scripts/setup-git-hooks.sh`) 새 워크트리 첫 체크아웃 시 bootstrap이 자동 실행됩니다.

### Claude Code에서 Codex (Vibe Proxy) 사용

```bash
# 1) 자동 설정 파일 생성 + 연결 확인
bash scripts/setup-codex-vibe.sh --check

# 2) Codex 호출 (OMC)
bash scripts/setup-codex-vibe.sh omc ask codex "간단한 테스트 응답만 해줘"

# 3) 현재 셸에 환경변수 적용 후 직접 사용
eval "$(bash scripts/setup-codex-vibe.sh --print-env | sed -n '/^export /p')"
omc ask codex "리팩토링 포인트 3개만 알려줘"
```

- 설정 파일: `.env.codex.vibe.local` (최초 실행 시 자동 생성)
- 기본 URL: `~/.cli-proxy-api/merged-config.yaml`의 `host/port` 자동 감지 (미감지 시 `http://127.0.0.1:8317`)
- 기본 API Key: `dummy-not-used` (Vibe Proxy OpenAI 호환 모드)

## 배포 구조

```
클라이언트 → Vercel CDN (Next.js SSR)
          → Vercel Functions (api/proxy.ts) → AWS EC2 t3.small (NestJS :3000)
                                            → AWS Lightsail MySQL :3306
```

## 기술 문서

| 문서 | 경로 |
|------|------|
| 아키텍처 | [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md) |
| 백엔드 설계 | [`docs/architecture/BACKEND.md`](docs/architecture/BACKEND.md) |
| 프론트엔드 설계 | [`docs/architecture/FRONTEND.md`](docs/architecture/FRONTEND.md) |
| 서비스 기획서 | [`docs/project/PRODUCT_OVERVIEW.md`](docs/project/PRODUCT_OVERVIEW.md) |
| 프로젝트 로드맵 | [`docs/project/ROADMAP.md`](docs/project/ROADMAP.md) |
| 보안 가이드 | [`docs/project/SECURITY.md`](docs/project/SECURITY.md) |
| Git 워크플로우 | [`docs/project/GIT_WORKFLOW.md`](docs/project/GIT_WORKFLOW.md) |
| 배포 가이드 | [`docs/infrastructure/DEPLOYMENT.md`](docs/infrastructure/DEPLOYMENT.md) |
| DB 스키마 | [`docs/infrastructure/DATABASE.md`](docs/infrastructure/DATABASE.md) |
| Docker 설정 | [`docs/infrastructure/DOCKER.md`](docs/infrastructure/DOCKER.md) |
| 환경 변수 | [`docs/infrastructure/ENVIRONMENT_VARIABLES.md`](docs/infrastructure/ENVIRONMENT_VARIABLES.md) |

## 관련 프로젝트

- [ChaLog](https://github.com/FLYLIKEB/ChaLog) — 기술 스택 기준 프로젝트
