---
title: 쿠폰·포인트 운영 정책
type: policy
status: active
tags:
  - okhwadang
  - policy
  - coupons
  - points
source:
  - docs/planning/decision-log.md
  - docs/planning/feature-policy-map.md
  - backend/src/modules/coupons
  - backend/src/modules/points
  - backend/src/modules/reviews
updated: 2026-04-30
---

# 쿠폰·포인트 운영 정책

상위 문서: [[README|옥화당 기획서 홈]]
관련 문서: [[decision-log|기획 결정 로그]], [[feature-policy-map|기능별 정책 지도]]

이 문서는 이슈 #726 검증 결과로, 쿠폰·포인트 운영 정책의 코드/테스트/관리자 설정 매핑을 한 페이지에 모아 둔다.
정책 문구는 [[decision-log#쿠폰/포인트|기획 결정 로그]]가 원본이다.

## 정책 5개 조항

| # | 정책 | 코드 위치 | 테스트 |
|---|------|-----------|--------|
| 1 | 발급 쿠폰 1개 + 포인트 동시 사용 | `CalculateDiscountDto.userCouponId: number` (단수) | `coupons.service.spec.ts` — `정책 고정 — 쿠폰·포인트 동시 사용` |
| 2 | 쿠폰 적용 후 포인트 차감 순서 | `CouponsService.calculate` — `pointsDiscount = min(pointsToUse, orderAmount - couponDiscount)` | 동일 describe 블록, `쿠폰 + 포인트 동시 사용` |
| 3 | FIFO 포인트 차감 | `PointsService.deductFifo`, `getUserPointBalance` SQL 가드 (`expires_at > now`) | `points.service.spec.ts` — `정책 고정: earn ... 잔액에서 제외` |
| 4 | 기본 포인트 만료 1년 | `PointsService.addOneYear` (`365 * 24 * 60 * 60 * 1000` ms) | `points.service.spec.ts` — `정책 고정: 1년 만료는 정확히 365일` |
| 5 | 자동 발급 트리거: 회원가입 / 첫 구매 / 생일 / 등급업 | `CouponRulesService.onModuleInit` + `handleBirthdayCoupons` cron | `coupon-rules.service.spec.ts` — `자동 발급 트리거 핸들러` |

## 관리자 설정

### 자동 발급 규칙 (CouponRule)

- API: `GET/POST/PATCH/DELETE /api/admin/coupon-rules`
- Controller: `backend/src/modules/coupons/coupon-rules.controller.ts` (`AdminCouponRulesController`, `@Roles('admin', 'super_admin')`)
- 트리거 enum: `signup` / `first_purchase` / `birthday` / `tier_up`
- 조건 JSON 예시:
  - `tier_up` + `{ "minTier": "Gold" }` — 해당 티어 이상으로 등급업한 사용자에게만 발급
  - `birthday` — 매일 자정 cron `cron:birthday-coupons` 가 활성 미삭제 회원 중 오늘 생일자 조회 후 발급
- 프론트 어드민 UI: 현재 미구현. API 직접 호출 또는 추후 어드민 페이지 추가 예정.

### 리뷰 포인트 (SiteSetting)

리뷰 포인트는 `site_settings` 테이블의 두 키로 관리한다 (마이그레이션: `1782200000000-AddReviewPointSettings`).

| 키 | 그룹 | 기본값 | 설명 |
|----|------|-------|------|
| `review_point_reward` | `review` | `100` | 리뷰 작성 시 기본 적립 포인트 |
| `photo_review_bonus` | `review` | `0` | 포토 리뷰일 때 추가 보너스 포인트 |

- 합산: `earn = review_point_reward + (포토 리뷰면 photo_review_bonus, 아니면 0)`
- 만료: 적립일 + 1년 (`addOneYear(new Date())`)
- 코드: `backend/src/modules/reviews/reviews.service.ts` `create()` 메서드
- 관리: 어드민 사이트 설정 화면에서 두 값 조회/수정 가능 (`group=review` 필터)

### 쿠폰 자체 (Coupon)

- API: `GET/POST /api/admin/coupons`
- 필드: `code`, `name`, `type` (`percentage`|`fixed`), `value`, `minOrderAmount`, `maxDiscount`, `totalQuantity`, `startsAt`, `expiresAt`, `isActive`
- `expiresAt` 은 쿠폰 자체의 만료일이며, 사용자에게 발급된 시점이 아닌 쿠폰 템플릿 만료일이다.

## 비고

- 어드민에 자동 발급 규칙용 전용 화면이 아직 없다. 이슈 #726 범위는 검증과 정책 고정에 한정하며, 화면 구현은 별도 이슈로 분리한다.
- DB 캐시 무효화: `SiteSetting` 변경 시 `settings:*` in-memory 캐시가 자동 삭제된다. SQL 직접 변경 시에는 백엔드 재시작 필요.
