# Frontend Design Rules (Issues #643 ~ #650)

## 1) Spacing / Grid Rhythm (#643)
- 페이지 래퍼: `layout-container`, `layout-page`
- 섹션 리듬: `layout-section`, `layout-stack-md`
- 본문 가독 폭: `text-readable`
- 홈/상품리스트/상품상세/장바구니/체크아웃에 동일 토큰 적용

## 2) CTA Hierarchy (#644)
- 버튼 체계: `primary(default) / secondary / ghost / destructive / outline`
- 최소 터치 높이 44px 이상(`min-h-11`)
- Primary CTA는 단계별 핵심 행동(주문/결제)에만 사용

## 3) Cart / Checkout Visual Hierarchy (#645)
- 요약 카드에서 최종 금액(`typo-h2`)을 최상위로 강조
- 배송비 임계 배너 + 진행 바를 요약 영역에 공통 적용
- 모바일 장바구니/체크아웃 하단 Sticky CTA 적용

## 4) Admin Information Design (#646)
- 관리자 표면/헤더/row 밀도 토큰:
  - `admin-surface`
  - `admin-table-head`
  - `admin-row`, `admin-row-compact`
- `StatusBadge`는 상태 점(dot)+색+경계선 조합으로 통일

## 5) A11y Baseline (#647)
- 전역 `prefers-reduced-motion` 대응 추가
- 버튼 최소 터치 타깃 및 시각 포커스 링 유지

## 6) Commerce Conversion Patterns (#648)
- 장바구니/체크아웃에 무료배송 임계 진행 패턴 통일
- 주문 흐름(배송 → 결제 → 완료) 스텝 표시 추가

## 7) Performance-Oriented Design (#649)
- Hero 이미지에 `fetchPriority="high"` 적용
- Hero 높이 arbitrary value 제거, 토큰 클래스 사용

## 8) Mobile Interaction Standard (#650)
- 모바일 하단 고정 CTA:
  - PDP(기존 유지)
  - Cart/Checkout(신규 적용)
- 하단 네비게이션 표시 여부(`MobileNavContext`)에 맞춰 offset 조정
