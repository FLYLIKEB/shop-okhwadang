# 어드민 가이드 기능 점검

2026-10-12 기준 코드로 확인한 기능과 안내 근거입니다. 운영 URL은 로그인 화면으로 연결되어 운영 데이터 조작은 하지 않았습니다.

## 제공 방식

- `/ko/admin/guide`, `/en/admin/guide`: 20개 기능을 5개 그룹으로 분류한 검색형 가이드.
- 각 관리 화면: 접이식 사용법. 전체 가이드와 같은 스크린샷 슬라이드를 재사용합니다.
- 상품 등록/수정은 상품 가이드, 쿠폰 규칙은 별도 가이드로 연결합니다.
- 최고관리자 전용 운영 로그는 해당 역할에만 표시합니다.
- 기존 인증 경계 안에서 읽기 전용으로 동작하며 업무 데이터는 변경하지 않습니다.

## 전체 기능 확인

아래 경로는 모두 `src/app/[locale]/admin/` 아래의 `page.tsx`를 기준으로 확인했습니다.

| 화면 | 확인한 범위 | 경로 |
| --- | --- | --- |
| 대시보드 | 매출, 주문, 회원, 상품 조회, 삭제 진행 상태를 한 화면에서 확인합니다. | `dashboard` |
| 상품 관리 | 상품 등록·수정, 노출, 이미지, 옵션, 속성과 네이버 커머스 API 가져오기를 관리합니다. | `products` |
| 카테고리 관리 | 상품 카테고리의 계층, 노출, 이미지, 정렬 순서를 관리합니다. | `categories` |
| 속성 관리 | 상품 필터와 검색에 쓰이는 속성 타입, 유효값, 표시값, 연결 상품을 관리합니다. | `attributes` |
| 주문 관리 | 주문 검색, 상태 변경, 배송 등록, 취소, 교환/반품/환불 신청, 메시지 발송 이력을 처리합니다. | `orders` |
| 회원 관리 | 회원 검색, 역할/상태 필터, 역할 변경을 관리합니다. | `members` |
| 쿠폰 관리 | 쿠폰 템플릿을 만들고, 검색/상태 필터로 관리하며, 회원에게 수동 발급합니다. | `coupons` |
| 쿠폰 자동 규칙 | 회원가입, 첫 구매, 생일, 등급 상승 같은 이벤트에 쿠폰 템플릿을 자동 발급하도록 연결합니다. | `coupons/rules` |
| 적립금 관리 | 회원별 적립금 잔액과 이력을 보고, 관리자 사유로 수동 적립/차감합니다. | `points` |
| 리뷰 관리 | 리뷰 조회, SmartStore 리뷰 가져오기, 노출/숨김, 일괄 처리, 관리자 답글을 관리합니다. | `reviews` |
| 문의 관리 | 고객 문의를 상태별로 확인하고 답변을 등록하거나 수정합니다. | `inquiries` |
| 페이지 관리 | 쇼핑몰의 소개, 이벤트, 안내 페이지를 블록으로 조립해 만들고 공개 상태를 관리합니다. | `pages` |
| 네비게이션 관리 | 상단 메뉴, 사이드바 메뉴, 푸터 메뉴와 모바일 하단 네비게이션 표시 여부를 관리합니다. | `navigation` |
| 안내 바 관리 | 쇼핑몰 상단에 노출되는 짧은 안내 문구를 다국어로 만들고 노출 순서를 정합니다. | `announcement-bars` |
| 저널 관리 | 브랜드 이야기, 사용법, 찻자리 콘텐츠 같은 저널 글을 작성하고 공개 여부를 관리합니다. | `journal` |
| FAQ 관리 | 자주 묻는 질문을 카테고리별로 등록하고 발행 여부와 표시 순서를 관리합니다. | `faqs` |
| 번역 점검 | 영문 화면에서 비어 있는 번역 항목을 한곳에서 확인하고, 수정 가능한 화면으로 이동합니다. | `localization` |
| 테마 편집 | 쇼핑몰의 라이트 색상, 다크 색상, 타이포그래피, 간격, 모서리 값을 조정합니다. | `settings/theme` |
| 사업자 정보 설정 | 푸터에 표시되는 회사, 대표자, 사업자등록번호, 주소, 연락처, 고객센터 정보를 관리합니다. | `settings/business` |
| 운영 로그 | 운영 중 발생한 일반 로그와 에러 로그를 검색하고 필요한 줄만 확인합니다. | `logs` |

## 중요한 동작과 근거

- 상품 등록/수정의 이미지·옵션·속성·다국어 필드는 `src/components/shared/admin/ProductFormPage.tsx`와 `ProductOptionsEditor.tsx`에서 확인했습니다. 가져오기는 미리보기 후 적용되며 SKU 매칭이 기존 상품을 수정할 수 있습니다.
- 주문 상태 전환과 취소 제한은 `backend/src/modules/admin/admin-orders.service.ts`, 운송장과 취소 사유 입력은 `ShippingModal.tsx`, `CancelOrderModal.tsx`에서 확인했습니다.
- 메시지 이력의 수동 확인은 `MessageDeliveriesDialog.tsx`에서 발송 업체 메시지 ID와 사유를 받습니다. `backend/src/modules/notification/interfaces/message-provider.interface.ts`는 sent를 고객 단말 수신이 아닌 업체 접수로 명시합니다.
- 역할 변경은 `backend/src/modules/admin/admin-members.service.ts`에서 자기 자신, 비활성 회원, 일반 관리자의 최고관리자 변경, 마지막 최고관리자 강등을 제한합니다.
- 쿠폰 규칙의 추가 조건 판정은 `backend/src/modules/coupons/coupon-rules.service.ts`에서 현재 등급 상승의 minTier만 사용합니다. 지원하지 않는 조건을 추가해도 판정에 반영되지 않습니다.
- 적립금 수동 조정은 `backend/src/modules/points/points.service.ts`와 `dto/manual-point-adjustment.dto.ts`에서 사유·금액·잔액을 검증합니다.
- 페이지 초안 편집과 저장·공개, slug 변경 경고는 `src/components/shared/admin/page-editor/usePageEditor.ts`와 `EditorTopBar.tsx`에서 확인했습니다. 블록 목록은 `BlockPalette.tsx`를 기준으로 합니다.
- 메뉴의 영역별 편집, 하위 메뉴, 정렬과 삭제 경고는 `NavigationEditor.tsx` 및 `navigation/NavigationFormModal.tsx`에서 확인했습니다.
- FAQ 편집에는 영문 질문·답변 입력칸이 없습니다. 번역 점검 화면은 직접 번역을 저장하지 않고 누락과 수정 링크를 제공합니다.
- 테마 저장·초기화는 `settings/theme/ThemeEditor.tsx`, 사업자 정보는 `settings/business/BusinessInfoEditor.tsx`를 기준으로 안내합니다.

## 유지보수

메뉴와 작업이 바뀌면 `src/lib/admin-guide.ts` 및 `src/i18n/messages/{ko,en}.json`의 `admin.guide`를 함께 갱신합니다.
경로·번역 누락은 `src/lib/__tests__/admin-guide.test.ts`, 검색·역할·펼치기는 `AdminGuide.test.tsx`, 화면 연결은 `AdminLayout.test.tsx`에서 검사합니다.

상품 관리에서는 스마트스토어 상품 엑셀 업로드 진입을 제거하고 네이버 커머스 API만 안내합니다. 리뷰 엑셀 가져오기는 별도 기능입니다.

## 스크린샷 슬라이드

번호 목록 대신 실제 화면 스크린샷과 작업 설명을 한 장씩 표시합니다. 이전·다음 버튼과 방향키로 넘기며 자동으로 재생하지 않습니다.
이미지를 누르면 원본을 크게 볼 수 있습니다. 검색어가 특정 작업 설명에 있으면 그 슬라이드부터 표시합니다.
스크린샷은 실제 컴포넌트를 예시 데이터로 렌더한 한국어 화면이며 운영 개인정보를 포함하지 않습니다.
원본 파일과 촬영 범위는 `public/images/admin-guide/README.md`, 이미지 연결은 `ADMIN_GUIDE_SCREENSHOTS`를 참고하세요.
닫힌 도움말의 이미지는 불러오지 않습니다.
