import { MODULE_METADATA } from '@nestjs/common/constants';
import { createPaymentConfig } from '../../../config/payment.config';
import { GuestOrderAccessService } from '../../orders/guest-order-access.service';
import { OrdersModule } from '../../orders/orders.module';
import { getAvailableGatewaysByLocale, resolveGatewayByLocale } from '../checkout-gateway.policy';
import { GuestPaymentsController } from '../guest-payments.controller';
import { GuestPaymentsService } from '../guest-payments.service';
import { PaymentsController } from '../payments.controller';
import { PaymentsModule } from '../payments.module';
import { PaymentsService } from '../payments.service';
import { PaymentConfirmationService } from '../services/payment-confirmation.service';

describe('PaymentsModule wiring', () => {
  it('imports OrdersModule for guest payment dependencies', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, PaymentsModule) as unknown[];

    expect(imports).toEqual(expect.arrayContaining([OrdersModule]));
  });

  it('registers guest payment controller and shared confirmation providers', () => {
    const controllers = Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, PaymentsModule) as unknown[];
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, PaymentsModule) as Array<unknown>;

    expect(controllers).toEqual(expect.arrayContaining([PaymentsController, GuestPaymentsController]));
    expect(providers).toEqual(
      expect.arrayContaining([PaymentConfirmationService, PaymentsService, GuestPaymentsService]),
    );
    expect(providers).toContainEqual({ provide: 'PaymentsService', useExisting: PaymentsService });
  });

  it('keeps explicit exports for member payments surface', () => {
    const exportsList = Reflect.getMetadata(MODULE_METADATA.EXPORTS, PaymentsModule) as unknown[];

    expect(exportsList).toEqual(expect.arrayContaining([PaymentsService, 'PaymentsService']));
  });

  it('OrdersModule explicitly exports GuestOrderAccessService for guest payment flows', () => {
    const exportsList = Reflect.getMetadata(MODULE_METADATA.EXPORTS, OrdersModule) as unknown[];

    expect(exportsList).toEqual(expect.arrayContaining([GuestOrderAccessService]));
  });
});

describe('createPaymentConfig — 프로덕션 Mock 차단', () => {
  it('NODE_ENV=production, PAYMENT_GATEWAY=mock → 시작 실패', () => {
    expect(() =>
      createPaymentConfig({
        NODE_ENV: 'production',
        PAYMENT_GATEWAY: 'mock',
      }),
    ).toThrow('Mock payment gateway는 프로덕션에서 사용할 수 없습니다');
  });

  it('NODE_ENV=production, PAYMENT_GATEWAY 미설정 → 시작 실패', () => {
    expect(() =>
      createPaymentConfig({
        NODE_ENV: 'production',
      }),
    ).toThrow('Mock payment gateway는 프로덕션에서 사용할 수 없습니다');
  });

  it('NODE_ENV=development, PAYMENT_GATEWAY=mock → 정상 동작', () => {
    const config = createPaymentConfig({
      NODE_ENV: 'development',
      PAYMENT_GATEWAY: 'mock',
    });

    expect(config.gateway).toBe('mock');
  });

  it('NODE_ENV=production, PAYMENT_GATEWAY=toss → 정상 동작', () => {
    const config = createPaymentConfig({
      NODE_ENV: 'production',
      PAYMENT_GATEWAY: 'toss',
    });

    expect(config.gateway).toBe('toss');
  });

  it('PAYMENT_GATEWAY=paypal → PayPal 설정을 읽는다', () => {
    const config = createPaymentConfig({
      NODE_ENV: 'development',
      PAYMENT_GATEWAY: 'paypal',
      PAYPAL_CLIENT_ID: 'paypal-client',
      PAYPAL_CLIENT_SECRET: 'paypal-secret',
      PAYPAL_WEBHOOK_ID: 'paypal-webhook',
    });

    expect(config.gateway).toBe('paypal');
    expect(config.paypal).toMatchObject({
      clientId: 'paypal-client',
      clientSecret: 'paypal-secret',
      webhookId: 'paypal-webhook',
      apiBaseUrl: 'https://api-m.sandbox.paypal.com',
    });
  });

  it('PAYMENT_GATEWAY=eximbay → Eximbay 설정을 읽는다', () => {
    const config = createPaymentConfig({
      NODE_ENV: 'development',
      PAYMENT_GATEWAY: 'eximbay',
      EXIMBAY_MERCHANT_ID: 'eximbay-mid',
      EXIMBAY_API_KEY: 'eximbay-api-key',
      EXIMBAY_SECRET_KEY: 'eximbay-secret',
    });

    expect(config.gateway).toBe('eximbay');
    expect(config.eximbay).toMatchObject({
      merchantId: 'eximbay-mid',
      apiKey: 'eximbay-api-key',
      secretKey: 'eximbay-secret',
      apiBaseUrl: 'https://api-test.eximbay.com',
      jsSdkUrl: 'https://api-test.eximbay.com/v1/javascriptSDK.js',
    });
  });
});

describe('locale gateway policy — country-specific visibility', () => {
  it('ko → Toss 결제위젯만 노출', () => {
    expect(resolveGatewayByLocale('ko')).toBe('toss');
    expect(getAvailableGatewaysByLocale('ko')).toEqual(['toss']);
  });

  it('ko는 글로벌 게이트웨이가 함께 활성화되어도 Toss만 노출한다', () => {
    const env = { CHECKOUT_ENABLED_GATEWAYS: 'toss,paypal,eximbay' } as NodeJS.ProcessEnv;

    expect(getAvailableGatewaysByLocale('ko', env)).toEqual(['toss']);
    expect(getAvailableGatewaysByLocale('en', env)).toEqual(['paypal', 'eximbay']);
  });

  it('ko에서 Toss가 비활성화되면 결제수단을 노출하지 않는다', () => {
    const previous = process.env.CHECKOUT_ENABLED_GATEWAYS;
    process.env.CHECKOUT_ENABLED_GATEWAYS = 'paypal';

    try {
      expect(resolveGatewayByLocale('ko')).toBeUndefined();
      expect(getAvailableGatewaysByLocale('ko')).toEqual([]);
      expect(getAvailableGatewaysByLocale('en')).toEqual(['paypal']);
    } finally {
      if (previous === undefined) {
        delete process.env.CHECKOUT_ENABLED_GATEWAYS;
      } else {
        process.env.CHECKOUT_ENABLED_GATEWAYS = previous;
      }
    }
  });

  it('unknown gateway가 섞이면 모든 locale 정책 평가를 거부한다', () => {
    const env = { CHECKOUT_ENABLED_GATEWAYS: 'toss, typo-provider' } as NodeJS.ProcessEnv;

    expect(() => getAvailableGatewaysByLocale('ko', env)).toThrow(
      'Unsupported checkout gateways: typo-provider',
    );
    expect(() => getAvailableGatewaysByLocale('en', env)).toThrow(
      'Unsupported checkout gateways: typo-provider',
    );
  });

  it('en and other locales → paypal default and eximbay card', () => {
    expect(resolveGatewayByLocale('en')).toBe('paypal');
    expect(resolveGatewayByLocale('ja')).toBe('paypal');
    expect(getAvailableGatewaysByLocale('en')).toEqual(['paypal', 'eximbay']);
  });
});
