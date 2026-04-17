import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService, EMAIL_PROVIDER_TOKEN } from '../notification.service';
import { MockEmailAdapter } from '../adapters/mock.adapter';
import { sanitizeContext } from '../templates/sanitize';
import {
  renderInquiryAnswered,
  renderOrderConfirmed,
  renderPaymentConfirmed,
  renderShippingUpdate,
} from '../templates/render';

describe('sanitizeContext', () => {
  it('drops password-like keys from the context', () => {
    const result = sanitizeContext({
      name: 'Alice',
      password: 'secret',
      refreshToken: 'rt',
      access_token: 'at',
      order: { amount: 1000, cvv: '123' },
    });
    expect(result).toEqual({
      name: 'Alice',
      order: { amount: 1000 },
    });
  });

  it('preserves Date values', () => {
    const now = new Date();
    const result = sanitizeContext({ when: now });
    expect(result.when).toBe(now);
  });
});

describe('render helpers', () => {
  it('renders Korean order confirmation by default', () => {
    const email = renderOrderConfirmed({
      recipientName: '홍길동',
      orderNumber: 'ORD-20260417-AB12CD34',
      totalAmount: 15000,
    });
    expect(email.subject).toContain('옥화당');
    expect(email.subject).toContain('ORD-20260417-AB12CD34');
    expect(email.text).toContain('홍길동');
    expect(email.html).toContain('<h2>');
  });

  it('renders English payment confirmation when locale is en', () => {
    const email = renderPaymentConfirmed({
      recipientName: 'Alice',
      orderNumber: 'ORD-X',
      amount: 1000,
      method: 'card',
      locale: 'en',
    });
    expect(email.subject).toContain('Okhwadang');
    expect(email.text).toContain('Alice');
  });

  it('renders shipping update with carrier + tracking', () => {
    const email = renderShippingUpdate({
      recipientName: '홍길동',
      orderNumber: 'ORD-Y',
      carrier: 'cj',
      trackingNumber: '1234567890',
    });
    expect(email.text).toContain('cj');
    expect(email.text).toContain('1234567890');
  });

  it('renders inquiry answered with answer body', () => {
    const email = renderInquiryAnswered({
      recipientName: '홍길동',
      inquiryTitle: '배송 문의',
      answer: '내일 발송됩니다.',
    });
    expect(email.text).toContain('배송 문의');
    expect(email.text).toContain('내일 발송됩니다.');
  });

  it('escapes HTML in user-supplied fields', () => {
    const email = renderInquiryAnswered({
      recipientName: '<script>alert(1)</script>',
      inquiryTitle: 'hi',
      answer: 'x',
    });
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
  });
});

describe('NotificationService', () => {
  let service: NotificationService;
  let mockAdapter: MockEmailAdapter;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        MockEmailAdapter,
        {
          provide: EMAIL_PROVIDER_TOKEN,
          useExisting: MockEmailAdapter,
        },
        NotificationService,
      ],
    }).compile();

    service = moduleRef.get(NotificationService);
    mockAdapter = moduleRef.get(MockEmailAdapter);
    mockAdapter.clear();
  });

  it('sends order confirmation via the provider', async () => {
    await service.sendOrderConfirmed('user@example.com', {
      recipientName: '홍길동',
      orderNumber: 'ORD-1',
      totalAmount: 10000,
    });
    const sent = mockAdapter.getSent();
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('user@example.com');
    expect(sent[0].subject).toContain('ORD-1');
  });

  it('skips send when recipient is empty', async () => {
    await service.sendEmail({ to: '', subject: 's', html: 'h' });
    expect(mockAdapter.getSent()).toHaveLength(0);
  });

  it('swallows provider errors (fire-and-forget)', async () => {
    const failing = {
      send: jest.fn().mockRejectedValue(new Error('boom')),
    };
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: EMAIL_PROVIDER_TOKEN, useValue: failing },
        NotificationService,
      ],
    }).compile();
    const svc = moduleRef.get(NotificationService);
    await expect(
      svc.sendEmail({ to: 'x@y.z', subject: 's', html: 'h' }),
    ).resolves.toBeUndefined();
    expect(failing.send).toHaveBeenCalled();
  });
});
