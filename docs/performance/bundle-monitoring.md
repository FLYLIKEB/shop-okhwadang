# 번들 모니터링 가이드

## 점검 명령어

```bash
npm run audit:bundle-imports
npm run build:analyze
```

## 자동 점검 범위 (`audit:bundle-imports`)

- `react-markdown` static import 금지 검사
- `@stripe/stripe-js` static import 금지 검사
- `lucide-react` wildcard import(`import * as`) 금지 검사
- lucide 아이콘 import 10개 이상 파일 목록 출력

## 2026-04-21 기준 결과

- `react-markdown` static import: 없음
- `@stripe/stripe-js` static import: 없음
- `lucide-react` wildcard import: 없음
- 아이콘 10개 이상 import 파일:
  - `src/components/shared/admin/page-editor/BlockPalette.tsx` (10)
  - `src/components/Header.tsx` (10)

## 번들 분석 참고

- 분석 리포트 출력 경로:
  - `.next/analyze/client.html`
  - `.next/analyze/nodejs.html`
  - `.next/analyze/edge.html`
- `@stripe/stripe-js`는 `static/chunks/4511.*.js` 비초기(async) 청크로 분리됨
