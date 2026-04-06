import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { WebhookPayloadDto } from '../dto/webhook-payload.dto';

describe('WebhookPayloadDto — class-validator 검증', () => {
  describe('forbidNonWhitelisted 시나리오', () => {
    it('알 수 없는 필드 포함 시 유효성 오류 발생', async () => {
      const dto = plainToInstance(WebhookPayloadDto, {
        eventType: 'PAYMENT_STATUS_CHANGED',
        unknownField: 'intrusion',
      });
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('unknownField');
    });

    it('eventType이 배열로 올 때 유효성 오류 발생', async () => {
      const dto = plainToInstance(WebhookPayloadDto, {
        eventType: ['PAYMENT_STATUS_CHANGED', 'etc'],
      } as unknown as Record<string, unknown>);
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('orderId가 숫자일 때 유효성 오류 발생 (string 기대)', async () => {
      const dto = plainToInstance(WebhookPayloadDto, {
        eventType: 'PAYMENT_STATUS_CHANGED',
        orderId: 12345,
      } as unknown as Record<string, unknown>);
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('amount가 문자열일 때 유효성 오류 발생 (number 기대)', async () => {
      const dto = plainToInstance(WebhookPayloadDto, {
        eventType: 'PAYMENT_STATUS_CHANGED',
        amount: '15000',
      } as unknown as Record<string, unknown>);
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('유효한 payload', () => {
    it('모든 필드 생략 가능 (모두 optional)', async () => {
      const dto = plainToInstance(WebhookPayloadDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('유효한 payload는 오류 없음', async () => {
      const dto = plainToInstance(WebhookPayloadDto, {
        eventType: 'PAYMENT_STATUS_CHANGED',
        orderId: 'order_123',
        status: 'DONE',
        amount: 15000,
        paymentKey: '5tqV9bRs34mXwdkz2oGv6r',
        method: 'CARD',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('method가 CARD/ACCOUNT/VIRTUAL_ACCOUNT 등 유효한 문자열 허용', async () => {
      const methods = ['CARD', 'ACCOUNT', 'VIRTUAL_ACCOUNT', 'PHONE', 'PRODUCT'];
      for (const method of methods) {
        const dto = plainToInstance(WebhookPayloadDto, { method });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      }
    });
  });
});