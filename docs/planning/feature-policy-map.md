---
title: 기능별 정책 지도
type: policy-map
status: draft
tags:
  - okhwadang
  - planning
  - policy
  - architecture
source:
  - docs/project/PRODUCT_OVERVIEW.md
  - docs/project/SECURITY.md
  - docs/architecture/BACKEND.md
  - docs/architecture/FRONTEND.md
  - docs/infrastructure/DATABASE.md
updated: 2026-04-25
---

# 기능별 정책 지도

상위 문서: [[README|옥화당 기획서 홈]]
관련 문서: [[service-plan|서비스 기획서]], [[implementation-priority|구현 우선순위]]

이 문서는 기존 프로젝트 문서 기준으로 기능별 정책을 한눈에 보기 위한 지도다.
실제 코드 구현 상태와 다를 수 있으므로, 구현 판단 전에는 코드와 테스트를 대조한다.

## 요약

| 기능 | 핵심 정책 | 주요 기준 문서 |
|------|-----------|----------------|
| 인증/인가 | JWT, OAuth, RBAC, 공개 엔드포인트는 명시적으로 분리 | `SECURITY.md`, `BACKEND.md` |
| 상품 | 카테고리 기반 탐색, slug, 상태값, 옵션/재고, 대표 이미지 | `DATABASE.md`, `PRODUCT_OVERVIEW.md` |
| 장바구니 | 회원 기준 저장, 동일 상품/옵션 중복 방지, 수량 변경 | `DATABASE.md`, `ARCHITECTURE.md` |
| 주문 | 주문 시점 상품 정보 스냅샷, 상태 머신, 할인/배송비/포인트 반영 | `DATABASE.md`, `PRODUCT_OVERVIEW.md` |
| 결제 | 국내 네이버페이/KG이니시스/토스페이먼츠, 글로벌 Stripe, 서버 금액 검증, 상태 전이 서버 관리 | `BACKEND.md`, `SECURITY.md`, `DATABASE.md` |
| 배송 | 배송사 어댑터, 운송장 등록, 상태 추적 | `BACKEND.md`, `PRODUCT_OVERVIEW.md` |
| 리뷰 | 구매자 리뷰, 포토 리뷰, 리뷰 포인트, 스마트스토어 리뷰 연동은 별도 이슈 | `PRODUCT_OVERVIEW.md`, `DATABASE.md` |
| 쿠폰/포인트 | 단일 쿠폰 + 포인트 동시 사용, 자동 발급 규칙, FIFO 차감 | `PRODUCT_OVERVIEW.md`, `DATABASE.md` |
| 위시리스트 | 회원별 상품 저장 | `PRODUCT_OVERVIEW.md`, `DATABASE.md` |
| 어드민 | 상품/주문/배송/회원/쿠폰/페이지/네비게이션 관리 | `PRODUCT_OVERVIEW.md`, `FRONTEND.md` |
| CMS/블록 | 페이지를 블록 JSON으로 관리, 어드민 편집 후 프론트 동적 렌더링 | `FRONTEND.md`, `PRODUCT_OVERVIEW.md` |
| 글로벌 | 한국어/영어만 지원, KRW/USD 결제, 해외 배송 고려 | `PRODUCT_OVERVIEW.md`, `README.md` |
| 보안 | CORS, rate limit, ValidationPipe, 비밀번호 해싱, 시크릿 커밋 금지 | `SECURITY.md` |

## 정책 노트 인덱스

- [[feature-policy-map#인증/인가|인증/인가]]
- [[feature-policy-map#상품/카테고리|상품/카테고리]]
- [[feature-policy-map#장바구니|장바구니]]
- [[feature-policy-map#주문|주문]]
- [[feature-policy-map#결제|결제]]
- [[feature-policy-map#배송|배송]]
- [[feature-policy-map#리뷰/위시리스트/쿠폰|리뷰/위시리스트/쿠폰]]
- [[feature-policy-map#어드민/CMS|어드민/CMS]]
- [[feature-policy-map#보안/운영|보안/운영]]

## 인증/인가

### 정책

- JWT Access Token과 Refresh Token을 사용한다.
- OAuth 제공자는 카카오와 구글을 기준으로 한다.
- 권한은 `user`, `admin`, `super_admin` 역할 기반으로 분리한다.
- 인증이 필요한 API는 JWT Guard로 보호하고, 공개 엔드포인트는 명시적으로 분리한다.
- 비밀번호는 bcrypt로 해싱하며 평문 저장/로깅을 금지한다.

### 확인 필요

- Refresh Token 저장 방식과 회전 정책.
- `admin`과 `super_admin`의 실제 권한 차이.
- OAuth 토큰 암호화/보관 정책의 실제 구현 여부.

## 상품/카테고리

### 정책

- 상품은 카테고리에 속할 수 있고, 카테고리는 parent-child 트리를 지원한다.
- 상품 URL 식별자는 `slug`를 사용한다.
- 상품 상태는 `draft`, `active`, `soldout`, `hidden` 기준이다.
- 상품은 옵션, 이미지, 대표 이미지, 재고, SKU, 추천 노출 여부를 가진다.
- 상품 상세는 브랜드 스토리텔링을 위해 작가, 산지, 제작 과정 콘텐츠를 포함하는 방향이다.

### 확인 필요

- 재고 정책: 옵션이 있는 상품은 옵션 재고를 판매 가능 수량의 원장으로 삼고, 상품 총 재고는 목록/필터 표시용 집계값으로만 관리한다. 옵션이 없는 상품은 상품 재고가 원장이다.
- 재고 차감 시점: 주문 생성 트랜잭션에서 pessimistic lock으로 차감한다. 결제 실패/주문 취소/환불 시 복구 정책은 주문 상태 전이와 함께 구현해야 한다.
- 글로벌 정책: 언어는 한국어/영어만 지원한다. 기존 코드의 일본어/중국어 필드는 새 기능에서 사용하지 않는다.

## 장바구니

### 정책

- 장바구니는 회원 기준으로 저장한다.
- 같은 회원의 같은 상품/옵션 조합은 중복 row가 아니라 수량으로 관리한다.
- 수량 변경과 삭제 API를 제공한다.

### 확인 필요

- 비회원 장바구니 지원 여부.
- 품절/재고 부족 상품이 장바구니에 남아 있을 때 처리 방식.
- 가격 변경 시 장바구니 표시 가격과 주문 가격의 기준.

## 주문

### 정책

- 주문 번호는 고유해야 한다.
- 주문 상태는 `pending`, `paid`, `preparing`, `shipped`, `delivered`, `cancelled`, `refunded` 기준이다.
- 주문 상품은 주문 시점의 상품명, 옵션명, 단가를 스냅샷으로 저장한다.
- 총액은 할인, 배송비, 포인트 사용을 반영한다.
- 주문에는 배송 수령자 정보와 배송 메모를 저장한다.

### 확인 필요

- 주문 생성 시 재고 예약 또는 차감 정책.
- 주문 취소 시 재고 복구 정책.
- 주문 상태 전이를 누가, 어떤 조건에서 수행하는지.

## 결제

### 정책

- 결제는 PG 어댑터 패턴을 따른다.
- 개발/테스트는 Mock, 운영은 실제 PG를 사용한다.
- 국내 결제는 네이버페이, 토스페이먼츠, KG이니시스를 모두 지원한다.
- 글로벌 결제는 Stripe를 우선 지원한다.
- 결제 금액은 서버에서 검증하며 클라이언트 전달 금액을 신뢰하지 않는다.
- 결제 상태는 `pending`, `confirmed`, `partial_cancelled`, `cancelled`, `refunded`, `failed` 기준이다.
- PG 웹훅 서명 검증이 필요하다.

### 확인 필요

- 현재 코드의 결제 gateway enum은 Stripe를 명시적으로 표현하지 못하고 `INICIS` placeholder로 저장하므로 마이그레이션이 필요하다.
- 네이버페이/KG이니시스 어댑터는 후속 구현이 필요하다.
- 부분 취소는 금액 기준으로 시작하고, 주문 아이템 단위 환불은 별도 확장으로 둔다.
- 웹훅 재시도와 멱등성 처리.

## 배송

### 정책

- 배송은 배송사 어댑터 패턴을 따른다.
- 후보 배송사는 CJ대한통운, 한진 등이다.
- 배송 상태는 결제완료 이후 준비, 배송중, 배송완료 흐름을 따른다.
- 어드민에서 운송장을 등록하고 배송 조회를 제공한다.
- 해외 배송을 고려한다.

### 확인 필요

- 배송비 산정 기준.
- 국내/해외 배송 분기 기준.
- 배송 상태와 주문 상태 동기화 규칙.

## 리뷰/위시리스트/쿠폰

### 정책

- 리뷰는 상품 기준으로 표시하며 구매한 주문 항목에 대해서만 작성할 수 있다.
- 주문 항목당 리뷰는 1개만 허용한다.
- 취소/환불 주문은 리뷰 작성 대상에서 제외한다.
- 리뷰 작성 시 기본 포인트를 지급하고, 포토 리뷰 보너스는 설정값으로 조정한다.
- 스마트스토어 리뷰 연동은 별도 GitHub 이슈로 분리한다: https://github.com/FLYLIKEB/shop-okhwadang/issues/720
- 위시리스트는 회원별 상품 저장 기능이다.
- 주문에는 발급 쿠폰 1개와 포인트를 함께 사용할 수 있다. 할인 순서는 쿠폰 적용 후 포인트 차감이다.
- 쿠폰 자동 발급 트리거는 회원가입, 첫 구매, 생일, 등급업을 기준으로 한다.
- 포인트는 FIFO 방식으로 차감하고, 기본 만료 기간은 적립일로부터 1년이다.

### 확인 필요

- 스마트스토어 리뷰 데이터 동기화 방식은 별도 이슈에서 설계한다.
- 쿠폰별 최소 주문 금액, 만료, 사용 횟수는 쿠폰 설정으로 관리한다.
- 회원 등급별 포인트 적립률은 멤버십 등급 설정으로 관리한다.

## 어드민/CMS

### 정책

- 어드민은 상품, 주문, 배송, 회원, 쿠폰, 페이지, 네비게이션을 관리한다.
- 페이지는 블록 단위 JSON 설정으로 구성한다.
- 블록 타입은 히어로, 상품 그리드, 상품 캐러셀, 카테고리 내비게이션, 프로모션 배너, 텍스트 콘텐츠를 기준으로 한다.
- 네비게이션과 카테고리 바로가기는 DB 기반 관리가 목표다.

### 확인 필요

- 블록 JSON 스키마.
- 페이지 발행/임시저장/미리보기 정책.
- 관리자 변경 이력은 감사 로그로 남긴다.

## 보안/운영

### 정책

- 요청은 CORS, rate limit, 인증, ValidationPipe, Controller 순서로 방어한다.
- rate limit 기본값은 전역 1분 200회, 인증 1분 30회, 비밀번호 찾기 1분 1회다. 운영값은 환경변수로 조정한다.
- DTO 기반 입력 검증을 사용하고, 정의되지 않은 필드는 거부한다.
- `.env`, `.pem`, `.key`는 커밋 금지다.
- 프로덕션 DB에서 TypeORM `synchronize: true`는 금지다.
- DB 변경은 TypeORM Migration CLI를 사용한다.

### 확인 필요

- 감사 로그 보관 기간은 기본 3년이며, 조회 권한은 `super_admin` 전용을 원칙으로 한다.
- Helmet 보안 헤더는 적용되어 있다.
- 백업/복구 훈련 주기.

## 다음에 같이 볼 노트

- 제품 범위와 화면 기준: [[service-plan|서비스 기획서]]
- MVP와 단계별 실행 기준: [[implementation-priority|구현 우선순위]]
