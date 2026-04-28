---
title: 기획 결정 로그
type: decision-log
status: active
tags:
  - okhwadang
  - planning
  - decision
updated: 2026-04-25
---

# 기획 결정 로그

상위 문서: [[README|옥화당 기획서 홈]]
관련 문서: [[feature-policy-map|기능별 정책 지도]], [[implementation-priority|구현 우선순위]]

## 결제

국내 결제는 네이버페이, KG이니시스, 토스페이먼츠를 모두 지원한다.
글로벌 결제는 Stripe를 우선 지원한다.

현재 구현은 `mock`, `toss`, `stripe` 중심이며, Stripe가 결제 DB enum에서 `INICIS` placeholder로 저장되는 코드 주석이 있다.
따라서 후속 구현에서는 `PaymentGatewayType.STRIPE` 추가, DB 마이그레이션, 네이버페이/KG이니시스 어댑터 추가가 필요하다.

## 재고

옵션이 있는 상품은 옵션 재고를 판매 가능 수량의 원장으로 삼는다.
상품 총 재고는 목록/필터/관리자 요약 표시용 집계값으로만 사용한다.

옵션이 없는 상품은 상품 재고가 원장이다.
주문 생성 시점에 트랜잭션과 pessimistic lock으로 재고를 차감한다.
결제 실패, 주문 취소, 환불 시에는 상태 전이 정책에 맞춰 재고 복구를 수행해야 한다.

## 글로벌

지원 언어는 한국어와 영어만 유지한다.
결제 통화는 KRW/USD를 우선한다.
기존 코드나 DB 필드에 일본어/중국어 확장 흔적이 있더라도 새 기능에서는 사용하지 않는다.

## 쿠폰/포인트

주문에는 발급 쿠폰 1개와 포인트를 함께 사용할 수 있다.
할인 순서는 쿠폰 적용 후 포인트 차감이다.

쿠폰 자동 발급 트리거는 회원가입, 첫 구매, 생일, 등급업을 기준으로 한다.
쿠폰별 최소 주문 금액, 만료, 사용 횟수는 쿠폰 설정으로 관리한다.

포인트는 FIFO 방식으로 차감한다.
기본 만료 기간은 적립일로부터 1년이다.
리뷰 작성 시 기본 포인트를 지급하고, 포토 리뷰 보너스는 설정값으로 조정한다.

## 리뷰 외부 연동

네이버 스마트스토어 리뷰는 내부 리뷰와 별도 테이블(`external_reviews`)로 보관하고, 상품 상세 리뷰 목록에서는 병합 표시한다.
데이터 수급은 운영자가 검증한 CSV/JSON 기반 수동 가져오기를 1차 방식으로 채택한다. 크롤링은 금지하며, 커머스API에 공식 리뷰 조회 권한이 확인되기 전까지 자동 API 동기화는 보류한다.
상품 매핑은 자사몰 `productId`를 기준으로 가져오고, 스마트스토어 상품 ID는 추적용 메타데이터로 저장한다.
내부 리뷰 정책은 구매한 주문 항목당 1개 리뷰, 취소/환불 주문 리뷰 차단, 리뷰 포인트 지급을 기준으로 한다. 외부 리뷰는 포인트/구매검증/내부 평균 평점 산정에서 제외하고, 원본 이미지 URL은 복제하지 않고 참조한다.

구현 이슈: https://github.com/FLYLIKEB/shop-okhwadang/issues/720

## 관리자 감사 로그

관리자 주문/회원/상품/쿠폰/export 액션과 주요 인증 이벤트는 감사 로그로 남긴다.
보관 기간은 기본 3년이다.
보안 사고, 결제/환불 분쟁, 법적 검토 중인 로그는 사안 종료 전 삭제하지 않는다.

감사 로그 조회 권한은 `super_admin` 전용을 원칙으로 한다.
일반 `admin`은 본인 작업 내역 요약 외에 전체 감사 로그 조회 권한을 갖지 않는다.

비밀번호, 토큰, API key, 결제 민감 원문, 개인정보 과다 노출 필드는 저장 전 마스킹한다.
export 로그는 다운로드 사유와 대상 범위를 남긴다.

## 2026-04-28 — ko/en locale policy enforcement

Issue #724 finalized the public locale surface as Korean and English only. Japanese/Chinese legacy DB columns are retained for backward-compatible reads/migrations only and are deprecated; new DTOs, admin forms, settings updates, seed data, and locale query validation must not write ja/zh locale fields.
