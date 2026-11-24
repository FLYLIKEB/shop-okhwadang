# 토스 체크아웃 상점 설정 및 검증

이슈 #1445의 코드 수정과 상점 운영 설정은 별도로 검증한다.

## 코드 동작

배송 정보와 필수 동의를 입력하고 주문 준비 버튼을 누르면 서버가 주문과 결제를 준비한다. 그 응답의 상점 클라이언트 키와 회원 customerKey(비회원 ANONYMOUS)로 결제위젯을 표시한다. 구매자는 결제수단을 선택한 다음 결제 버튼을 눌러 결제창을 연다. 위젯 준비 완료만으로 결제를 요청하지 않는다. 체크아웃 진입만으로 주문을 생성하지 않는다.

주문 준비 중·완료 후 배송 정보와 할인 입력을 고정하고, 결제 금액은 서버 prepare 응답을 사용한다. 위젯 자체의 금액 변경은 기존 인스턴스의 setAmount를 사용한다. 10,000,000원 초과 차단은 이슈의 계약팀 안내에 따른 옥화당 정책이며 모든 토스 결제수단의 공통 한도를 뜻하지 않는다. 정확히 10,000,000원은 허용한다.

## 운영 설정 체크리스트

- 토스 개발자센터에서 옥화당 상점의 클라이언트·시크릿 키를 확인한다. 같은 상점, 같은 테스트/라이브 환경의 키 쌍을 backend TOSS_CLIENT_KEY 및 TOSS_SECRET_KEY에 설정하고 재시작한다. 실제 키는 문서나 로그에 기록하지 않는다.
- 결제 UI에서 카드를 첫 번째로 배치하고 미계약 수단을 제외한다. 재방문 고객의 이전 선택은 복원될 수 있다.
- 커스텀 UI를 사용하면 NEXT_PUBLIC_TOSS_PAYMENT_VARIANT_KEY와 NEXT_PUBLIC_TOSS_AGREEMENT_VARIANT_KEY를 설정하고 프론트를 재빌드한다. 약관 키를 비우면 기본 국문 UI가 사용된다.
- 위젯의 상점 MID가 문서용 tgen_docs가 아닌 실제 옥화당 MID인지 확인한다. 라이브 키에서 테스트 경고가 사라지는지 확인한다.
- 비회원과 회원 각각 카드/다른 수단을 고르고 명시적으로 결제 버튼을 눌렀을 때 고른 수단의 결제창이 열리는지 확인한다.
- 별도 승인된 테스트 거래로 승인 API 및 success/fail 반환을 검증한다. 단위 테스트 통과는 실제 결제 승인 증거가 아니다.

상점 키·MID·계약 설정·실제 거래가 검증되기 전에는 이슈 전체를 완료 처리하지 않는다.

## 공식 근거

- [결제위젯 SDK](https://docs.tosspayments.com/sdk/v2/js/payment-widget)
- [연동 가이드](https://docs.tosspayments.com/guides/v2/payment-widget/integration)
- [어드민 가이드](https://docs.tosspayments.com/guides/v2/payment-widget/admin)
- [오류 코드](https://docs.tosspayments.com/sdk/v2/error-codes)
- [API 키](https://docs.tosspayments.com/reference/using-api/api-keys)
