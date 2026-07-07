import { createNotificationConfig } from '../notification.config';

describe('createNotificationConfig', () => {
  it('production에서 mock 알림 provider를 차단한다', () => {
    expect(() =>
      createNotificationConfig({
        NODE_ENV: 'production',
        NOTIFICATION_PROVIDER: 'mock',
      }),
    ).toThrow('Mock notification provider는 프로덕션에서 사용할 수 없습니다');
  });

  it('development에서는 기본 mock provider를 허용한다', () => {
    const config = createNotificationConfig({
      NODE_ENV: 'development',
    });

    expect(config.provider).toBe('mock');
    expect(config.message.provider).toBe('mock');
  });

  it('알 수 없는 provider는 에러를 던진다', () => {
    expect(() =>
      createNotificationConfig({
        NODE_ENV: 'development',
        NOTIFICATION_PROVIDER: 'legacy',
      }),
    ).toThrow('Unknown NOTIFICATION_PROVIDER: legacy');
  });

  it('production에서 거래 메시지 provider가 없고 템플릿도 없으면 배포를 차단하지 않는다', () => {
    const config = createNotificationConfig({
      NODE_ENV: 'production',
      NOTIFICATION_PROVIDER: 'resend',
    });

    expect(config.provider).toBe('resend');
    expect(config.message.provider).toBe('mock');
    expect(config.message.templates.ORDER_CREATED).toBe('');
  });

  it('production에서 mock 거래 메시지 provider와 실제 템플릿 조합은 차단한다', () => {
    expect(() =>
      createNotificationConfig({
        NODE_ENV: 'production',
        NOTIFICATION_PROVIDER: 'resend',
        MESSAGE_PROVIDER: 'mock',
        MESSAGE_TEMPLATE_ORDER_CREATED: 'tpl-order',
      }),
    ).toThrow('Mock message provider는 프로덕션 템플릿이 설정된 상태에서 사용할 수 없습니다');
  });

  it('solapi 선택 시 운영 발송 필수 값을 검증한다', () => {
    expect(() =>
      createNotificationConfig({
        NODE_ENV: 'production',
        NOTIFICATION_PROVIDER: 'resend',
        MESSAGE_PROVIDER: 'solapi',
      }),
    ).toThrow('MESSAGE_SENDER_PHONE 환경변수가 필요합니다');
  });

  it('solapi 선택 시 주문 취소 템플릿도 필수로 검증한다', () => {
    expect(() =>
      createNotificationConfig({
        NODE_ENV: 'production',
        NOTIFICATION_PROVIDER: 'resend',
        MESSAGE_PROVIDER: 'solapi',
        MESSAGE_SENDER_PHONE: '021234567',
        MESSAGE_KAKAO_CHANNEL_ID: 'pf-id',
        MESSAGE_SOLAPI_API_KEY: 'api-key',
        MESSAGE_SOLAPI_API_SECRET: 'api-secret',
        MESSAGE_TEMPLATE_ORDER_CREATED: 'tpl-order',
        MESSAGE_TEMPLATE_PAYMENT_CONFIRMED: 'tpl-payment',
        MESSAGE_TEMPLATE_SHIPPING_STARTED: 'tpl-shipping-started',
        MESSAGE_TEMPLATE_SHIPPING_DELIVERED: 'tpl-shipping-delivered',
      }),
    ).toThrow('MESSAGE_TEMPLATE_ORDER_CANCELLED 환경변수가 필요합니다');
  });

  it('solapi 필수 값이 모두 있으면 거래 메시지 설정을 반환한다', () => {
    const config = createNotificationConfig({
      NODE_ENV: 'production',
      NOTIFICATION_PROVIDER: 'resend',
      MESSAGE_PROVIDER: 'solapi',
      MESSAGE_SENDER_PHONE: '021234567',
      MESSAGE_KAKAO_CHANNEL_ID: 'pf-id',
      MESSAGE_SOLAPI_API_KEY: 'api-key',
      MESSAGE_SOLAPI_API_SECRET: 'api-secret',
      MESSAGE_TEMPLATE_ORDER_CREATED: 'tpl-order',
      MESSAGE_TEMPLATE_PAYMENT_CONFIRMED: 'tpl-payment',
      MESSAGE_TEMPLATE_SHIPPING_STARTED: 'tpl-shipping-started',
      MESSAGE_TEMPLATE_SHIPPING_DELIVERED: 'tpl-shipping-delivered',
      MESSAGE_TEMPLATE_ORDER_CANCELLED: 'tpl-order-cancelled',
    });

    expect(config.message.provider).toBe('solapi');
    expect(config.message.senderPhone).toBe('021234567');
    expect(config.message.templates.SHIPPING_DELIVERED).toBe('tpl-shipping-delivered');
    expect(config.message.templates.ORDER_CANCELLED).toBe('tpl-order-cancelled');
  });
});
