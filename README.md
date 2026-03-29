# Commerce Demo

> 쇼핑몰에 들어갈 공통 기능을 정의하고, 다양한 쇼핑몰 외주에 **재사용 가능한 보일러플레이트**를 만든다.
> 실제 PG 결제 연동과 배송 추적을 포함한 실무 수준의 완성된 구조를 갖추어
> 새 프로젝트 시작 시 즉시 포크하여 커스터마이징할 수 있는 기반을 목표로 한다.

## 핵심 설계 원칙

| 원칙 | 설명 |
|------|------|
| **ChaLog 통일** | 기술 스택, 코드 스타일, Git 워크플로우, 배포 구조를 ChaLog와 맞춤 |
| **템플릿 기반** | 모든 UI 조형 요소는 하드코딩이 아닌 템플릿으로 관리 |
| **DB 드리븐 UI** | 카테고리, 사이드바, 네비게이션 등 프론트 구조를 DB로 관리 |
| **반응형 우선** | 모든 화면이 데스크톱/모바일에서 깨지지 않는 flex 기반 UI |
| **보안 우선** | 어드민, 인증, PG 연동 등 전 영역에 보안 고려 |
| **Docker 기반 인프라** | MySQL, Redis 등 모든 서비스를 Docker Compose로 통합 관리 |
| **재사용성** | 외주 프로젝트마다 포크하여 빠르게 커스터마이징 가능한 구조 |

## 기술 스택

| 영역 | 기술 | 비고 |
|------|------|------|
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript | SSR |
| UI | TailwindCSS v4 + Radix UI (shadcn/ui) | cn() 유틸, 테마 토큰 |
| 상태관리 | React Context | AuthContext, CartContext |
| Backend | NestJS + TypeORM + MySQL | Controller → Service → Entity |
| DB | MySQL 8.0 (Docker) | TypeORM Migration CLI |
| 인증 | JWT + OAuth (카카오/구글) | |
| 결제 | 토스페이먼츠 (기본) | 어댑터 패턴으로 PG 교체 가능 |
| 배송 | 택배사 API 연동 | 어댑터 패턴으로 택배사 교체 가능 |
| 캐시 | Redis | 상품 캐싱, 세션 |
| 스토리지 | S3 호환 (R2 등) | 이미지/미디어 |
| 인프라 | Docker Compose | MySQL, Redis 로컬 통합 관리 |
| FE 배포 | Vercel | Next.js SSR 자동 배포 |
| BE 배포 | AWS EC2 + PM2 | |
| DB 호스팅 | AWS Lightsail Docker MySQL | |
| 테스트 | Vitest (FE) + Jest E2E (BE) | |
| Node.js | 22.x | .nvmrc로 고정 |

## 프로젝트 구조

```
commerce-demo/
├── src/                    # 프론트엔드 (Next.js 15 App Router)
│   ├── app/                # Next.js App Router (layout, pages, route groups)
│   ├── components/         # 재사용 UI
│   ├── components/ui/      # shadcn/ui 래퍼 + cn()
│   ├── lib/api.ts          # API 클라이언트
│   ├── hooks/              # 커스텀 훅
│   ├── contexts/           # React Context
│   ├── utils/              # 유틸리티
│   ├── constants/          # 전역 상수
│   └── styles/             # TailwindCSS v4 토큰
├── backend/                # 백엔드 (NestJS)
│   └── src/modules/        # auth, users, products, orders, payments, shipping, admin...
├── docs/                   # 문서
├── .claude/rules/          # Claude 규칙
└── scripts/                # 유틸리티 스크립트
```

## 시작하기

```bash
# 프론트엔드 개발 서버
npm run dev

# 풀스택 로컬 개발 (SSH Tunnel + Backend + Frontend)
npm run dev:local

# 프론트엔드 빌드 + 테스트
npm run build && npm run test:run

# 백엔드 빌드 + 테스트
cd backend && npm run build && npm run test

# 백엔드 E2E 테스트 (DB 스키마 변경 시 필수)
cd backend && npm run test:e2e
```

## 배포 구조

```
클라이언트 → Vercel CDN (Static Files)
          → Vercel Functions (api/proxy.ts) → AWS EC2 (NestJS :3000)
                                            → Lightsail Docker MySQL :3306
```

## 구현 우선순위

| Phase | 내용 |
|-------|------|
| **Phase 1 (MVP)** | 메인, 상품 목록/상세, 장바구니, 주문/결제(Mock PG) |
| **Phase 2 (Core)** | 회원 시스템, 검색, 카테고리 필터, 마이페이지 |
| **Phase 3 (Payment)** | 실제 PG 연동, 배송 시스템 구축 |
| **Phase 4 (Admin)** | 어드민 (상품/주문/배송/회원 관리) |
| **Phase 5 (CMS)** | 템플릿 시스템, 동적 페이지/네비게이션 관리 |
| **Phase 6 (Polish)** | 리뷰, 위시리스트, 쿠폰, 성능 최적화 |
| **Phase 7 (Ops)** | CI/CD, 모니터링, 테스트 커버리지 |

## 관련 문서

- [상세 기획 (Issue #1)](https://github.com/FLYLIKEB/commerce-demo/issues/1)
- [ChaLog (기술 스택 기준 프로젝트)](https://github.com/FLYLIKEB/ChaLog)
