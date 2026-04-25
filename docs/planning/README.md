---
title: 옥화당 기획서 홈
type: moc
status: active
tags:
  - okhwadang
  - planning
  - moc
updated: 2026-04-25
---

# 옥화당 기획서 홈

이 폴더는 `docs/marketing` 자료와 분리된 내부 기획서 모음이다.
현재 문서 기준으로 제품 범위, 기능별 정책, 구현 우선순위를 빠르게 파악하기 위한 용도이며,
코드 실구현 상태를 보증하지 않는다.

## 빠른 진입

- 전체 제품 범위: [[service-plan|서비스 기획서]]
- 기능별 정책: [[feature-policy-map|기능별 정책 지도]]
- 구현 순서: [[implementation-priority|구현 우선순위]]
- 확정 결정사항: [[decision-log|기획 결정 로그]]

## 문서 구성

| 문서 | 목적 |
|------|------|
| [[service-plan|서비스 기획서]] | 제품 목표, 사용자 범위, 화면/기능 범위 정리 |
| [[feature-policy-map|기능별 정책 지도]] | 인증, 상품, 주문, 결제, 배송, 어드민 등 기능별 정책 요약 |
| [[implementation-priority|구현 우선순위]] | MVP부터 배포까지 단계별 구현 기준과 리스크 |
| [[decision-log|기획 결정 로그]] | 결제, 재고, 글로벌, 쿠폰/포인트, 감사 로그 확정 정책 |

## 기준 문서

이 기획서 세트는 아래 문서를 기준으로 정리했다.

- [README.md](../../README.md)
- [docs/project/PRODUCT_OVERVIEW.md](../project/PRODUCT_OVERVIEW.md)
- [docs/project/ROADMAP.md](../project/ROADMAP.md)
- [docs/project/SECURITY.md](../project/SECURITY.md)
- [docs/architecture/ARCHITECTURE.md](../architecture/ARCHITECTURE.md)
- [docs/architecture/FRONTEND.md](../architecture/FRONTEND.md)
- [docs/architecture/BACKEND.md](../architecture/BACKEND.md)
- [docs/infrastructure/DATABASE.md](../infrastructure/DATABASE.md)

## 사용 원칙

- 기능 범위나 정책을 빠르게 확인할 때는 먼저 [[feature-policy-map|기능별 정책 지도]]를 본다.
- 구현 여부 판단은 이 폴더만으로 하지 말고 코드 또는 테스트와 대조한다.
- 정책이 변경되면 원문 문서와 이 폴더를 함께 갱신한다.
- `docs/marketing` 문서는 외부 설명/제안 성격으로 보고, 내부 구현 기준은 이 폴더를 우선한다.

## Obsidian 사용 팁

- 이 저장소 루트 또는 `docs` 폴더를 Obsidian vault로 열면 이 문서들이 노트로 보인다.
- Graph View에서는 `#okhwadang`, `#planning`, `#policy` 태그로 필터링한다.
- 정책 확인은 [[feature-policy-map|기능별 정책 지도]]에서 시작하고, 구현 우선순위 판단은 [[implementation-priority|구현 우선순위]]로 이동한다.
