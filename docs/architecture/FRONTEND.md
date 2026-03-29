# Frontend Architecture

## 기술 스택

- Next.js 15 (App Router) + React 19 + TypeScript (SSR)
- TailwindCSS v4 + Radix UI (shadcn/ui)
- React Context (AuthContext, CartContext)
- sonner (토스트 알림)
- recharts (차트 — 어드민 대시보드)

---

## 코드 스타일

- **함수형 컴포넌트 + hooks만** 사용
- `@/` import alias → `src/` 디렉토리 참조
- `cn()` 유틸리티로 Tailwind 클래스 병합
- TypeScript strict mode — **`any` 사용 금지**
- **shadcn/ui 패턴** 준수, 3회 이상 재사용 시 컴포넌트 추출
- Tailwind **arbitrary values 지양** (`h-[123px]` 등), 테마 토큰 우선
- Mutation 시 **sonner/toast로 성공/실패 피드백** 필수
- `console.log` 커밋 금지

---

## 템플릿 시스템

페이지를 **블록(섹션) 단위 컴포넌트**로 구성하여 어드민에서 관리 가능하게 한다.

### 개념

```
페이지 = [블록1, 블록2, 블록3, ...]
블록 = { type: "product-grid", template: "3-column", config: {...} }
```

### 동작 방식

1. 어드민에서 페이지별 블록 순서, 템플릿 종류, 설정값을 **JSON으로 관리**
2. 프론트는 API에서 설정 JSON을 받아 **동적으로 렌더링**
3. 각 블록은 독립적인 템플릿 변형을 가짐 (예: 상품 그리드 2열/3열/4열)

### 블록 타입 예시

| 블록 타입 | 설명 | 템플릿 변형 |
|-----------|------|-------------|
| `hero-banner` | 히어로 배너 | 슬라이더, 풀스크린, 분할 |
| `product-grid` | 상품 그리드 | 2열, 3열, 4열 |
| `product-carousel` | 상품 캐러셀 | 기본, 대형 |
| `category-nav` | 카테고리 바로가기 | 아이콘, 이미지, 텍스트 |
| `promotion-banner` | 프로모션 배너 | 풀폭, 카드, 타이머 |
| `text-content` | 텍스트 콘텐츠 | 기본, 하이라이트 |

---

## CMS형 구조 관리

- 사이드바, GNB, 카테고리 바로가기 등 **네비게이션을 DB 관리**
- 어드민에서 메뉴 구조 CRUD (드래그 정렬)
- **동적 라우팅** — 어드민 변경이 프론트에 즉시 반영

---

## 반응형 & 모바일

- 모든 레이아웃 **flex/grid 기반**, fixed 사이즈 지양
- 데스크톱 ↔ 모바일 **컴포넌트 단위 분기** (단순 미디어쿼리가 아닌)
- 모바일 전용: 바텀 네비게이션, 햄버거 메뉴, 터치 최적화

---

## SEO & 접근성

### SEO
- Next.js Metadata API (`generateMetadata`) — 페이지별 동적 메타태그/OG 태그
- 서버 컴포넌트(RSC) SSR로 검색엔진 크롤링 최적화
- 구조화 데이터 (JSON-LD) — 상품, 리뷰
- 사이트맵 자동 생성 (`app/sitemap.ts`)
- 이미지: `next/image` (WebP 자동 변환, lazy loading, CDN 캐싱)

### 접근성
- 시맨틱 HTML 태그 사용
- ARIA 레이블
- 키보드 네비게이션 대응
- 충분한 색상 대비
