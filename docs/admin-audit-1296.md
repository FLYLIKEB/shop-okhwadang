# 어드민 감사 38건 수정 추적 — #1296

## 범위와 현재 상태

상위 [#1296](https://github.com/FLYLIKEB/shop-okhwadang/issues/1296)의 하위 #1297–#1334, 총 38건(P1 19/P2 19)을 한 통합 변경으로 수정한다. 감사 당시 기준은 `cdc81c95792cb82709e90ce0e711e66e25995229`이며, 구현은 `feature/issue-1296-admin-audit`의 격리 worktree에서 진행한다. 이 문서는 수정 경로와 회귀 검증의 연결표다. 테스트 파일이 있다는 사실과 최종 실행 통과는 구분한다.

38건의 수정과 회귀 검증을 통합했고 독립 code-reviewer APPROVE·architect CLEAR를 받았다. SKU NULL 정규화와 CMS 저장 중 편집 보호/current read 보완도 포함한다. 변경 worktree의 로컬 서비스 health·ko/en·익명 admin 로그인 이동까지 확인했다. 커밋·PR·CI·머지·main 반영은 아직 완료 증거가 없다. 이 문서는 로컬 구현·검증 완료와 원격 배송 완료를 구분한다.

운영 DB·PG·발송·원격 스토리지 변경은 하지 않는다. 결제/알림은 mock으로 검증하고 DB 불변식은 별도 테스트 MySQL에서 검증한다. 새 의존성·DB 스키마 변경은 이번 수정에 추가하지 않는다.

## 주요 계약

- CMS는 기존 durable idempotency와 단일 transaction으로 metadata/블록/게시를 저장한다. Page 잠금 뒤 PageBlock도 current locking read를 사용하여 MySQL REPEATABLE READ의 오래된 snapshot을 피한다. 기존 블록은 직접 update하고 새 블록만 insert한다. 실패/응답 유실에서 draft와 재시도 키를 유지한다.
- 역할 변경은 공통 잠금과 transaction 안에서 현재 actor 권한·최고관리자 수를 재검증한다. 상품 옵션은 기존 ID와 cart/order FK를 보존하고, 재입고 알림은 commit 후 기존 경로를 사용한다.
- 선택값은 `undefined` 유지와 명시 삭제를 구분한다. nullable SKU는 빈 문자열을 `null`로 정규화하여 여러 상품의 UNIQUE 충돌을 막는다.
- `pending → paid`는 confirmed Payment 없이 허용하지 않는다. 새로운 수동 입금 확정 정책을 추가하지 않으며 UI도 미확정 paid 전이를 제공하지 않는다. 환불 정합화는 취소된 결제를 confirmed로 역행시키지 않는다.
- 테마 reset은 5개 테마 그룹만 대상으로 하고 사업자·브랜드·운영 설정을 보존한다. Next 설정은 `revalidate:300`의 상한을 가정하지 않고 성공한 저장/reset에서 명시 tag 무효화를 호출한다.

## 이슈 → 수정 파일 → 회귀 증거

아래 파일은 저장소 기준이다. 경로 접두어를 줄인 표기는 다음과 같다.

- `BE` = `backend/src/modules/`; `AD` = `src/app/[locale]/admin/`; `UI` = `src/components/shared/admin/`.
- `CAT-DB` = `backend/test/admin-catalog-invariants.e2e-spec.ts`; `CMS-DB` = `backend/test/admin-cms-invariants.e2e-spec.ts`.
- `CONTENT-DB` = `backend/test/admin-content-invariants.e2e-spec.ts`; `CUSTOMER-DB` = `backend/test/admin-customer-invariants.e2e-spec.ts`; `OPS-DB` = `backend/test/admin-operations-invariants.e2e-spec.ts`.
- backend 단위 테스트는 해당 모듈의 `__tests__/*.spec.ts`, 프런트 테스트는 각 기능의 `__tests__/*.test.tsx`를 사용한다. 아래는 기대 동작을 검증하는 정규 테스트이며 버그 관측을 PASS로 삼던 감사 probe와 다르다.

| 이슈 | 수정 경로 | 회귀 테스트·판정 |
|---|---|---|
| #1297 | `AD/orders/page.tsx`, `src/lib/api/admin/orders.ts` | `AD/orders/__tests__/AdminOrdersPage.test.tsx`, `OPS-DB`: 승인 후 완료·11번째 신청·지연 실패 피드백·gateway 한 번 |
| #1298 | `UI/MultiImageUploader.tsx`, `UI/ProductFormPage.tsx` | `UI/__tests__/MultiImageUploader.test.tsx`, `ProductFormPage.test.tsx`: 역순 완료·일부 실패·삭제/정렬·pending 저장 차단 |
| #1299 | `UI/ProductFormPage.tsx`, `src/lib/api/admin/products.ts`, `BE/products/dto/update-product.dto.ts`, `product-command.service.ts` | `ProductFormPage.test.tsx`, `product-command.service.spec.ts`, `CAT-DB`: 삭제/생략 구분·공개 가격·여러 빈 SKU의 NULL 저장 |
| #1300 | `BE/products/categories.service.ts` | `categories.service.spec.ts`, `CAT-DB`: 순환·4단계·하위 트리 깊이 거부 |
| #1301 | `AD/categories/page.tsx` | `AD/categories/__tests__/AdminCategoriesPage.test.tsx`: 2/3단계 형제 경계·같은 sortOrder 정규화 |
| #1302 | `BE/products/product-query.service.ts` | `product-query.service.spec.ts`, `CAT-DB`: cold/warm total 101 보존 |
| #1303 | `BE/inquiries/inquiries.service.ts` | `inquiries.service.spec.ts`, `CUSTOMER-DB`: 실제 User 관계를 id/name/email allowlist로 JSON 투영 |
| #1304 | `BE/reviews/smartstore-review-import.service.ts` | `smartstore-review-import.service.spec.ts`: 상품 재매칭 후 이전/새 상품 집계 갱신 |
| #1305 | `BE/admin/admin-members.service.ts` | `admin-members.service.spec.ts`, `CUSTOMER-DB`: 별도 MySQL connection 상호 강등·stale actor 권한 거부 |
| #1306 | `BE/admin/admin-orders.service.ts`, `UI/OrderStatusSelect.tsx` | `admin-orders.service.spec.ts`, `OrderStatusSelect.test.tsx`, `OPS-DB`: 미확정 paid 거부·confirmed 배송 허용 |
| #1307 | `BE/payments/services/payment-refund.service.ts` | `payment-refund.service.spec.ts`: 실패 환불 재정합화 반복에서 CANCELLED 유지 |
| #1308 | `BE/journal/journal.service.ts`, `BE/notices/notices.service.ts` | `journal.service.spec.ts`, `notices.service.spec.ts`, `CONTENT-DB`: 비공개 상세 404·공지 조회수 불변·관리 편집 허용 |
| #1309 | `BE/settings/settings.service.ts`, `settings.controller.ts`, `AD/settings/theme/ThemeEditor.tsx` | `settings.service.spec.ts`, `CONTENT-DB`: 테마만 초기화·사업자/브랜드/운영값과 번역 보존 |
| #1310 | `backend/src/common/multer/single-file-upload.options.ts`, `BE/upload/upload.controller.ts` | `upload.controller.spec.ts`: 실제 Nest HTTP multipart hero/promotion/journal·잘못된 kind/필드 검증, CMS/upload 집중 BE 57개 통과 |
| #1311 | `BE/pages/pages.service.ts`, `admin-pages.controller.ts`, `dto/save-page-draft.dto.ts`, `UI/page-editor/usePageEditor.ts`, `src/lib/api/admin/pages.ts` | `page-draft.spec.ts`, `usePageEditor.test.tsx`, `CMS-DB`: rollback·응답유실 replay·다른 key 동시 snapshot/current read·숫자 block ID |
| #1312 | `AD/pages/page.tsx`, `UI/page-editor/EditorTopBar.tsx`, `usePageEditor.ts` | `AdminPagesPage.test.tsx`, `usePageEditor.test.tsx`, `CMS-DB`: dirty 저장+게시 원자성·실패 draft 유지·저장 중 편집 보호 |
| #1313 | `AD/faqs/page.tsx` | `AD/journal/__tests__/content-editors.test.tsx`: FAQ 타이핑과 rerender에서 입력 유지 |
| #1314 | `AD/journal/page.tsx` | `content-editors.test.tsx`: 같은 이벤트의 원본 URL/derivatives 콜백 동시 보존 |
| #1315 | `BE/navigation/navigation.service.ts` | `navigation.service.spec.ts`: gnb/sidebar/footer 순환·다른 group·문자열 ID 검사 |
| #1316 | `AD/settings/theme/ThemeEditor.tsx` | `ThemeEditor.test.tsx`: 원래 inline style/priority 복원·없던 CSS 제거 |
| #1317 | `BE/products/categories.service.ts`, `attributes.service.ts` | `categories.service.spec.ts`, `attributes.service.spec.ts`, `CAT-DB`: 분류/속성 변경 뒤 warm list/detail/bulk 즉시 무효화 |
| #1318 | `UI/page-editor/EntitySelector.tsx`, `block-property-panel/ProductCategoryPicker.tsx` | `EntitySelector.test.tsx`: 100건 이후 admin 검색/페이지·hidden ID hydration·실패 placeholder·선택 순서 |
| #1319 | `AD/attributes/page.tsx`, `BE/products/attributes.service.ts` | `AdminAttributesPage.test.tsx`, `attributes.service.spec.ts`, `CAT-DB`: nameKo와 원본 이름 보존·수정 표시 일치 |
| #1320 | `src/components/shared/hooks/useAsyncAction.ts` | `AD/__tests__/platform-request-state.test.tsx`: 병렬 성공/실패 동안 마지막 요청까지 loading 유지 |
| #1321 | `AD/logs/page.tsx` | `platform-request-state.test.tsx`: 이전 로그 응답/오류가 현재 탭 덮어쓰지 않음 |
| #1322 | `BE/admin/admin-export.service.ts` | `admin-export.service.spec.ts`: 실제 CSV stream 수식 시작문자·선행 제어문자 중립화 |
| #1323 | `BE/admin/admin-localization.service.ts` | `admin-localization.service.spec.ts`: 50개 상품 뒤 누락 카테고리도 접근 가능 |
| #1324 | `AD/localization/page.tsx` | `platform-request-state.test.tsx`: 실패/정상 빈 결과 구분·재시도 |
| #1325 | `AD/points/page.tsx` | `AD/points/__tests__/page.test.tsx`: 회원 변경/선택 해제 후 이전 응답 무시 |
| #1326 | `BE/points/points.service.ts`, `dto/manual-point-adjustment.dto.ts` | `admin-points.service.spec.ts`, `CUSTOMER-DB`: INT overflow 거부 후 실제 MySQL 원장/감사로그 무쓰기; customer 3/3 통과 |
| #1327 | `AD/journal/page.tsx` | `content-editors.test.tsx`: 이전 본문이 빈 저널로 전파되지 않음 |
| #1328 | `AD/settings/theme/actions.ts`, `ThemeEditor.tsx`, `AD/settings/business/BusinessInfoEditor.tsx` | `actions.test.ts`, editor 테스트와 실제 production Next: warm A→backend B 중 cached A→실제 server action 200→새 SSR B 확인 |
| #1329 | `src/components/Footer.tsx` | `src/components/__tests__/Footer.test.tsx`: 11번째 루트와 자식 링크 DOM 접근 |
| #1330 | `UI/ProductOptionsEditor.tsx`, `ProductFormPage.tsx`, `src/lib/api/admin/products.ts`, `BE/products/product-command.service.ts` | `ProductFormPage.test.tsx`, `product-command.service.spec.ts`, `CAT-DB`: 기존 option ID·cart/order FK·order snapshot 보존 및 부정 ID 거부 |
| #1331 | `BE/products/product-command.service.ts`, `BE/restock-alerts/restock-alerts.service.ts` | `product-command.service.spec.ts`, `restock-alerts.service.spec.ts`, `CAT-DB`: 옵션별 commit 후 알림·다른 구독/rollback 효과 없음 |
| #1332 | `BE/reviews/admin-reviews.service.ts` | `admin-reviews.service.spec.ts`: internal 필터가 자사몰 리뷰 포함 |
| #1333 | `BE/promotions/dto/create-banner.dto.ts` | `BE/promotions/__tests__/banner-dto.spec.ts`: root-relative/https 허용·위험 scheme/우회 거부 |
| #1334 | `BE/promotions/promotions.service.ts` | `promotions.service.spec.ts`, `banner-dto.spec.ts`: 날짜 undefined 유지/null 삭제/ISO 변환 |

## 통합 검증 현황

아래는 보완 후 최종 실행 결과다. 최초 통합에서 FE 1건(CMS ID 기대값), BE 1건(cache 기대값), 기존 app e2e 16건(unpaid→paid fixture 연쇄·reset 범위 기대값)이 실패했으며 계약/fixture를 수정한 뒤 재실행해 해소했다.

| 게이트 | 현재 확인된 결과 | 남은 판정 |
|---|---|---|
| FE build / typecheck / lint | 최종 모두 통과 | 로컬 실행 |
| FE 전체 단위 테스트 | 199 files / 1,133 tests 통과 | 실제 React 렌더·deferred 응답 회귀 포함 |
| BE build / lint | 최종 모두 통과 | 로컬 실행 |
| BE 전체 단위 테스트 | 163 suites / 1,791 tests 통과 | 기존/신규 회귀 포함 |
| project guard / diff check | 통과 | 최종 통합 변경 확인 |
| 기존 MySQL e2e | app 291, 기존 concurrency 4/1/1, auth 2, coupon 12 통과 | 외부 provider mock |
| 신규 admin MySQL e2e | 5 suites / 20 tests 통과 | CMS RR/원자성/응답유실·옵션 FK·역할 경합 포함 |
| 포인트 DB 보강 | 추가 후 customer 3/3 통과 | overflow 거부·원장/감사로그 무쓰기 확인; 앞선 20건 집계와 구분 |
| 실제 multipart | Nest HTTP 및 CMS/upload 집중 BE 57개 통과 | hero/promotion/journal 및 오류 계약 |
| production cache | 실제 Next production server의 server action/SSR 검증 통과 | 별도 로컬 fake backend; 운영 설정 변경 없음 |
| 독립 통합 리뷰 | code-reviewer APPROVE / architect CLEAR | SKU·CMS 저장 freeze 보완 후 최종 판정 |
| 로컬 서비스 | 변경 worktree의 `bash scripts/start-local.sh` 성공 | API health DB connected·settings/map 200(71 keys)·ko/en HTTP 200·3000/5173 listen |
| 브라우저 smoke | 익명 `/ko/admin` → `/ko/login?redirect=...` | 재기동 후 로그인/전체 footer 정상·오류/degraded 배너 없음 |
| 원격 배송 | 커밋/PR/CI/머지/main 정리 증거 없음 | 지휘 에이전트 후속 수행 |

production cache 검증은 Next production server(5191)와 fake backend(5201)를 사용했다. 첫 SSR marker A와 backend read 1회를 확인한 뒤 backend를 B로 바꾸어도 SSR은 cached A/read 1회를 유지했다. 실제 `revalidateTheme` server action HTTP 200 이후 SSR B/read 2회로 바뀌었다. 로컬 산출물은 `.omx/qa/issue-1296-ship/production-cache-probe.json` 및 동반 스크립트이며 배포된 운영 서비스의 결과로 해석하지 않는다.

독립 역할 검토는 이 실행 환경에서 사용 가능한 transport와 설치된 역할 계약을 사용한다. typed specialist 실행 성공 여부와 논리 역할 판정을 혼동하지 않으며 구체 실행 표면은 지휘 에이전트의 최종 증거에 남긴다.

인증된 실제 브라우저의 관리 24개 화면 전수 클릭은 수행하지 않았다. 실제 PG 환불·SOLAPI 접수/단말 수신·운영 배포 효과도 이 검증으로 입증하지 않는다. 테스트 MySQL/React DOM/외부 mock의 증거를 각각 구분한다. CI·PR·머지 결과는 후속 원격 증거가 확보된 뒤 보고한다.
