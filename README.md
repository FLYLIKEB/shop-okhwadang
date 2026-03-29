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
| 캐시 | Redis | 상품 캐싱, 세션 |
| 스토리지 | AWS S3 + CloudFront | 이미지/미디어 CDN |
| 인프라 | Docker Compose | MySQL, Redis 로컬 통합 관리 |
| FE 배포 | Vercel Pro | Next.js SSR 자동 배포 |
| BE 배포 | AWS EC2 t3.small + PM2 | Nginx + Let's Encrypt SSL |
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
├── docs/                   # 문서
├── scripts/                # 유틸리티 스크립트
└── .claude/rules/          # Claude 규칙
```

## 시작하기

```bash
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

# MySQL + Redis 시작/정지
cd backend && docker compose up -d
cd backend && docker compose down -v   # DB 초기화
```

## 배포 구조

```
클라이언트 → Vercel CDN (Next.js SSR)
          → Vercel Functions (api/proxy.ts) → AWS EC2 t3.small (NestJS :3000)
                                            → AWS Lightsail MySQL :3306
```

## 구현 우선순위

| Phase | 내용 |
|-------|------|
| **Phase 1 (MVP)** | 메인, 상품 목록/상세, 장바구니, 주문/결제(Mock PG) |
| **Phase 2 (Core)** | 회원 시스템, 검색, 카테고리 필터, 마이페이지 |
| **Phase 3 (Payment)** | 실제 PG 연동 (네이버페이 필수), 배송 시스템 |
| **Phase 4 (Admin)** | 어드민 (상품/주문/배송/회원 관리) |
| **Phase 5 (CMS)** | 템플릿 시스템, 동적 페이지/네비게이션 관리 |
| **Phase 6 (Polish)** | 리뷰, 위시리스트, 쿠폰, 글로벌 스토어, 외부 연동 |
| **Phase 7 (Ops)** | CI/CD, 모니터링, 테스트 커버리지 |

## 문서

### 기술 문서

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

### 마케팅/고객 문서

| 문서 | 경로 |
|------|------|
| 목차 | [`docs/marketing/0_목차.md`](docs/marketing/0_목차.md) |
| 프로젝트 개요 | [`docs/marketing/1_프로젝트_개요.md`](docs/marketing/1_프로젝트_개요.md) |
| 견적 및 사양 | [`docs/marketing/1-1_견적_및_사양.md`](docs/marketing/1-1_견적_및_사양.md) |
| 개발 일정 (8주) | [`docs/marketing/1-2_개발_일정_8주.md`](docs/marketing/1-2_개발_일정_8주.md) |
| 기술 스택 및 아키텍처 | [`docs/marketing/2_기술_스택_및_아키텍처.md`](docs/marketing/2_기술_스택_및_아키텍처.md) |
| 어드민 커스터마이징 | [`docs/marketing/2-1_어드민_커스터마이징.md`](docs/marketing/2-1_어드민_커스터마이징.md) |
| 보안 정책 | [`docs/marketing/2-2_보안_정책.md`](docs/marketing/2-2_보안_정책.md) |
| 서버 비용 및 인프라 | [`docs/marketing/2-3_서버_비용_및_인프라.md`](docs/marketing/2-3_서버_비용_및_인프라.md) |
| 데이터 이전 가이드 | [`docs/marketing/3_데이터_이전_가이드.md`](docs/marketing/3_데이터_이전_가이드.md) |
| 유지보수 및 지원 | [`docs/marketing/3-1_유지보수_및_지원.md`](docs/marketing/3-1_유지보수_및_지원.md) |
| FAQ | [`docs/marketing/4_자주_묻는_질문.md`](docs/marketing/4_자주_묻는_질문.md) |
| 구축 사양 체크리스트 | [`docs/marketing/4-1_구축_사양_체크리스트.md`](docs/marketing/4-1_구축_사양_체크리스트.md) |

## 관련 링크

- [옥화당 스마트스토어](https://smartstore.naver.com/ockhwadang)
- [ChaLog (기술 스택 기준 프로젝트)](https://github.com/FLYLIKEB/ChaLog)
