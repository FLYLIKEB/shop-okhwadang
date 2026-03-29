# Architecture Overview

## 기술 스택

| 영역 | 기술 | 비고 |
|------|------|------|
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript | SSR, Vercel 배포 |
| UI | TailwindCSS v4 + Radix UI (shadcn/ui) | cn() 유틸, 테마 토큰 |
| 상태관리 | React Context | AuthContext, CartContext |
| Backend | NestJS + TypeORM + MySQL | Controller → Service → Entity |
| DB | MySQL 8.0 (Docker) | TypeORM Migration CLI |
| 인증 | JWT + OAuth (카카오/구글) | ChaLog 동일 |
| 결제 | 토스페이먼츠 (기본) | 어댑터 패턴 |
| 배송 | 택배사 API | 어댑터 패턴 |
| 캐시 | Redis | 상품 캐싱, 세션 |
| 스토리지 | S3 호환 (R2 등) | 이미지/미디어 |
| 인프라 | Docker Compose | MySQL, Redis 통합 관리 |
| Node.js | 22.x | .nvmrc 고정 |

---

## 프로젝트 구조

```
commerce-demo/
├── src/                        # 프론트엔드 (Next.js 15 App Router)
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # 루트 레이아웃
│   │   ├── (routes)/page.tsx   # 메인 홈
│   │   ├── products/           # 상품 목록 + [id] 상세 (SSR)
│   │   ├── cart/               # 장바구니
│   │   ├── checkout/           # 주문/결제
│   │   ├── login/              # 로그인
│   │   ├── register/           # 회원가입
│   │   ├── my/                 # 마이페이지
│   │   └── admin/              # 관리자
│   ├── components/             # 재사용 UI
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── ProductCard.tsx
│   │   ├── CartItem.tsx
│   │   ├── EmptyState.tsx
│   │   └── ui/                 # shadcn/ui 래퍼 + cn()
│   ├── lib/
│   │   └── api.ts              # API 클라이언트
│   ├── hooks/                  # 커스텀 훅
│   ├── contexts/               # React Context
│   │   ├── AuthContext.tsx
│   │   └── CartContext.tsx
│   ├── utils/                  # 유틸리티
│   ├── constants/              # 전역 상수
│   └── styles/                 # TailwindCSS v4 토큰 (globals.css)
├── backend/                    # 백엔드 (NestJS)
│   └── src/
│       ├── main.ts             # 부트스트랩 (CORS, ValidationPipe, :3000)
│       ├── app.module.ts       # 루트 모듈
│       ├── modules/
│       │   ├── auth/           # 인증 (JWT + OAuth)
│       │   ├── users/          # 회원
│       │   ├── products/       # 상품
│       │   ├── categories/     # 카테고리
│       │   ├── orders/         # 주문
│       │   ├── payments/       # 결제 (PG 어댑터)
│       │   ├── shipping/       # 배송 (택배사 어댑터)
│       │   ├── cart/           # 장바구니
│       │   ├── reviews/        # 리뷰
│       │   ├── coupons/        # 쿠폰/적립금
│       │   ├── wishlist/       # 위시리스트
│       │   ├── admin/          # 관리자
│       │   └── health/         # 헬스 체크
│       ├── database/
│       │   ├── typeorm.config.ts
│       │   └── migrations/
│       └── common/
│           ├── guards/
│           ├── pipes/
│           ├── interceptors/
│           └── decorators/
├── docs/                       # 문서
├── scripts/                    # 유틸리티 스크립트
├── .claude/rules/              # Claude 규칙
├── package.json                # FE + workspaces
├── next.config.ts
├── tsconfig.json
└── .nvmrc                      # Node 22.x
```

---

## API 엔드포인트 (Global prefix: `/api`)

### Auth
```
POST /api/auth/register          # 회원가입
POST /api/auth/login             # 로그인 (이메일/비밀번호)
POST /api/auth/kakao             # 카카오 로그인
POST /api/auth/google            # 구글 로그인
GET  /api/auth/profile           # 프로필 조회 (JWT 필요)
```

### Products
```
GET  /api/products               # 상품 목록 (?q=검색, ?categoryId=, ?sort=)
GET  /api/products/:id           # 상품 상세
POST /api/products               # 상품 등록 (admin)
PATCH /api/products/:id          # 상품 수정 (admin)
DELETE /api/products/:id         # 상품 삭제 (admin)
```

### Categories
```
GET  /api/categories             # 카테고리 트리
POST /api/categories             # 카테고리 생성 (admin)
PATCH /api/categories/:id        # 카테고리 수정 (admin)
DELETE /api/categories/:id       # 카테고리 삭제 (admin)
```

### Cart
```
GET    /api/cart                  # 장바구니 조회 (JWT)
POST   /api/cart                  # 장바구니 추가 (JWT)
PATCH  /api/cart/:id              # 수량 변경 (JWT)
DELETE /api/cart/:id              # 장바구니 삭제 (JWT)
```

### Orders
```
GET  /api/orders                 # 주문 내역 (JWT)
GET  /api/orders/:id             # 주문 상세 (JWT)
POST /api/orders                 # 주문 생성 (JWT)
```

### Payments
```
POST /api/payments/prepare       # 결제 준비
POST /api/payments/confirm       # 결제 승인
POST /api/payments/cancel        # 결제 취소/환불
```

### Shipping
```
GET  /api/shipping/:orderId      # 배송 상태 조회
POST /api/shipping/track         # 배송 추적
```

### Reviews
```
GET  /api/reviews?productId=     # 상품별 리뷰 목록
POST /api/reviews                # 리뷰 작성 (JWT)
PATCH /api/reviews/:id           # 리뷰 수정 (JWT)
DELETE /api/reviews/:id          # 리뷰 삭제 (JWT)
```

### Wishlist
```
GET    /api/wishlist             # 위시리스트 조회 (JWT)
POST   /api/wishlist             # 위시리스트 추가 (JWT)
DELETE /api/wishlist/:id         # 위시리스트 삭제 (JWT)
```

### Coupons
```
GET  /api/coupons                # 보유 쿠폰 목록 (JWT)
POST /api/coupons/apply          # 쿠폰 적용 (JWT)
```

### Admin
```
GET    /api/admin/dashboard      # 대시보드 통계
GET    /api/admin/products       # 상품 관리 목록
GET    /api/admin/orders         # 주문 관리 목록
PATCH  /api/admin/orders/:id     # 주문 상태 변경
GET    /api/admin/members        # 회원 목록
PATCH  /api/admin/members/:id    # 회원 역할 변경
POST   /api/admin/shipping/:orderId  # 운송장 등록
```

### Health
```
GET /api/health                  # 서버 및 DB 상태 확인
```

---

## 데이터 흐름

1. `src/lib/api.ts` (apiClient) → HTTP 통신
2. Date 문자열 자동 변환, DECIMAL prices → number
3. 에러 메시지: 백엔드 한국어 메시지, 프론트 영어→한국어 번역

## Next.js Rewrites (next.config.ts)

```
/api/:path* → ${BACKEND_URL}/api/:path*  (NestJS, 기본값: http://localhost:3000)
```

## 배포 구조

```
클라이언트 → Vercel CDN (Static Files)
          → Vercel Functions (api/proxy.ts) → AWS EC2 t3.small (NestJS :3000)
                                            → AWS Lightsail MySQL :3306
```
