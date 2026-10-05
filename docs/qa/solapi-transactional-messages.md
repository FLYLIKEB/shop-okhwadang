# SOLAPI 거래 알림 운영 확인

## 활성화 전

1. SOLAPI에서 발신번호를 등록하고 사용할 API Key의 출발지 IP 허용 범위를 확인한다.
2. `MESSAGE_CHANNEL=alimtalk`이면 카카오 채널과 `ORDER_CREATED`, `PAYMENT_CONFIRMED`, `SHIPPING_STARTED`, `SHIPPING_DELIVERED`, `ORDER_CANCELLED` 템플릿을 승인받는다. 템플릿 변수명은 `message-templates.ts`의 이름을 `#{customerName}`처럼 감싼 형태와 일치해야 한다.
3. 문자만 사용하면 `MESSAGE_CHANNEL=sms`로 설정한다. 이 모드에는 카카오 채널·템플릿 ID가 필요하지 않으며 본문 길이에 따라 SOLAPI가 SMS/LMS를 판별한다.
4. 운영 환경에 `MESSAGE_PROVIDER=solapi`, 등록된 `MESSAGE_SENDER_PHONE`, `MESSAGE_SOLAPI_API_KEY`, `MESSAGE_SOLAPI_API_SECRET`을 설정한다. 알림톡 모드에서는 카카오 채널과 템플릿 ID도 설정한다. 비밀값은 저장소나 Issue에 기록하지 않는다.
5. `backend/.env.production`을 기준으로 `bash scripts/remote-env-sync.sh set-secret`과 `bash scripts/remote-env-sync.sh push`를 실행한다. 운영 사전 검증은 메시지 공급자가 mock이거나 필수 설정이 없으면 배포를 막는다.

## 실발송 확인

- 승인된 테스트 수신번호로 회원·비회원 주문 접수, 결제 완료, 운송장 등록, 배송 완료와 주문 취소를 각각 확인한다.
- 같은 결제 웹훅 또는 상태 변경을 다시 처리해도 동일 이벤트 문자가 중복 수신되지 않는지 확인한다.
- 알림톡 모드에서 대체 문자 정책을 켰다면 알림톡 실패 시 SMS/LMS 결과를 확인한다. 문자 전용 모드에서는 알림톡 요청이 없어야 한다.
- 관리자 주문 화면의 발송 이력에서 `sent`는 **SOLAPI 접수**를 뜻한다. 단말 수신 완료는 SOLAPI 발송 내역의 최종 상태로 별도 확인한다.
- 결과 불명확 건은 공급자 메시지 ID와 최종 상태를 먼저 확인한다. 관리자 수동 확인에는 확인 근거를 기록하며, 제공자 접수 여부를 모른 채 다시 발송하지 않는다.

## 장애 확인

- `message_effect_outbox`의 `FAILED`는 다음 시각에 자동 재시도되고 `MANUAL_REVIEW`는 자동 재발송하지 않는다.
- `notification_logs`에는 원문 수신번호 대신 해시와 마스킹 번호만 저장한다.
- `MESSAGE_PROVIDER`와 `MESSAGE_CHANNEL`을 변경할 때는 `backend/src/config/notification.config.ts`의 조건부 필수값을 먼저 검증한다.

참고: [SOLAPI 발송 API](https://solapi.com/developers/api/messages), [메시지 조회](https://solapi.com/developers/api/msg-getList).
