# Backend Architecture

## 기술 스택

- NestJS + TypeORM + MySQL 8.0
- JWT (Access + Refresh Token) + OAuth (카카오/구글)
- Docker Compose (MySQL). 캐시는 백엔드 프로세스 내 in-memory `CacheService`

---

## 코드 스타일

- DI 패턴: `@Injectable()` + **Controller → Service → Entity**
- **DTO 기반** 입력 검증 (class-validator)
- NestJS 내장 예외 (`NotFoundException`, `BadRequestException` 등)
- 기능별 모듈: `backend/src/modules/{module}/`
- NestJS Logger 사용 — `console.log` 커밋 금지
- Global prefix: `/api`

---

## 모듈 구조

```
backend/src/
├── main.ts                     # CORS, ValidationPipe, ThrottlerModule, 포트 3000
├── app.module.ts               # 루트 모듈
├── modules/
│   ├── auth/                   # 인증
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/         # jwt.strategy.ts, local.strategy.ts
│   │   └── dto/                # register.dto.ts, login.dto.ts
│   ├── users/                  # 회원
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── entities/user.entity.ts
│   ├── products/               # 상품
│   │   ├── products.controller.ts
│   │   ├── products.service.ts
│   │   ├── entities/product.entity.ts
│   │   └── dto/
│   ├── categories/             # 카테고리
│   ├── orders/                 # 주문
│   ├── payments/               # 결제 (PG 어댑터 패턴)
│   │   ├── payments.controller.ts
│   │   ├── payments.service.ts
│   │   ├── adapters/           # toss.adapter.ts, mock.adapter.ts
│   │   └── interfaces/        # payment-gateway.interface.ts
│   ├── shipping/               # 배송 (택배사 어댑터 패턴)
│   │   ├── shipping.controller.ts
│   │   ├── shipping.service.ts
│   │   ├── adapters/           # cj.adapter.ts, hanjin.adapter.ts, mock.adapter.ts
│   │   └── interfaces/        # shipping-provider.interface.ts
│   ├── cart/                   # 장바구니
│   ├── reviews/                # 리뷰
│   ├── coupons/                # 쿠폰/적립금
│   ├── wishlist/               # 위시리스트
│   ├── admin/                  # 관리자
│   └── health/                 # 헬스 체크
├── database/
│   ├── typeorm.config.ts
│   └── migrations/
└── common/
    ├── guards/                 # JwtAuthGuard, RolesGuard
    ├── pipes/
    ├── interceptors/
    └── decorators/             # @CurrentUser, @Roles
```

---

## 인증/인가

- **JWT**: Access Token + Refresh Token
- **RBAC**: 일반회원 / 관리자 / 슈퍼관리자
- **OAuth**: 카카오, 구글 소셜 로그인
- 비밀번호 **bcrypt** 해싱
- Rate limiting 기본값: 전역 1분 200회, 인증 1분 30회, 비밀번호 찾기 1분 1회. 운영값은 환경변수로 조정한다.

---

## PG 결제 — 어댑터 패턴

```typescript
// interfaces/payment-gateway.interface.ts
interface PaymentGateway {
  prepare(orderId: string, amount: number): Promise<PrepareResult>;
  confirm(paymentKey: string): Promise<ConfirmResult>;
  cancel(paymentKey: string, reason: string): Promise<CancelResult>;
}
```

| 어댑터 | 용도 |
|--------|------|
| `MockAdapter` | 개발/테스트 환경 |
| `NaverPayAdapter` | 네이버페이 (국내 필수 대상, 구현 필요) |
| `TossAdapter` | 토스페이먼츠 |
| `InicisAdapter` | KG이니시스 (구현 필요) |
| `StripeAdapter` | 글로벌 결제 |

### 결제 상태 머신

```
PENDING → CONFIRMED → PARTIAL_CANCELLED / CANCELLED / REFUNDED
```

- 서버 사이드 금액 검증 필수
- 목표 정책: 국내 결제는 네이버페이, KG이니시스, 토스페이먼츠를 모두 지원하고 글로벌 결제는 Stripe를 우선 지원한다.
- 현재 코드 기준 환경변수 선택지는 `PAYMENT_GATEWAY=mock|toss|stripe`다. 네이버페이/KG이니시스 어댑터와 `stripe` gateway enum 정리는 후속 구현이 필요하다.

---

## 배송 — 어댑터 패턴

```typescript
// interfaces/shipping-provider.interface.ts
interface ShippingProvider {
  registerTrackingNumber(orderId: string, trackingNumber: string): Promise<void>;
  getTrackingStatus(trackingNumber: string): Promise<TrackingResult>;
}
```

| 어댑터 | 용도 |
|--------|------|
| `MockAdapter` | 개발/테스트 환경 |
| `CjAdapter` | CJ대한통운 |
| `HanjinAdapter` | 한진택배 |

### 배송 상태 머신

```
PAYMENT_CONFIRMED → PREPARING → SHIPPED → IN_TRANSIT → DELIVERED
```

---

## 미디어 관리

- 이미지 업로드 API (리사이즈, 썸네일 자동 생성)
- 스토리지 추상화: 로컬 / S3 / CloudFlare R2 전환 가능
- 환경변수로 선택: `STORAGE_PROVIDER=local|s3|r2`

---

## 성능

- 상품/게시글 목록: 커서 기반 페이지네이션
- 상품 상세/목록: in-memory 캐싱 (`CacheService`, 선택)
- DB 인덱싱 최적화
- N+1 쿼리 방지 (TypeORM relations/queryBuilder)
