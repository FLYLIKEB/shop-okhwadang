import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaymentsService } from '../payments.service';
import { Payment } from '../entities/payment.entity';
import { Order } from '../../orders/entities/order.entity';
import { Shipping } from '../entities/shipping.entity';
import { TossPaymentAdapter } from '../adapters/toss.adapter';
import { StripePaymentAdapter } from '../adapters/stripe.adapter';
import { User } from '../../users/entities/user.entity';
import { NotificationService } from '../../notification/notification.service';

describe('PaymentsService — webhook', () => {
  let service: PaymentsService;
  const mockGateway = {
    prepare: jest.fn(),
    confirm: jest.fn(),
    cancel: jest.fn(),
    verifyWebhook: jest.fn(),
  };
  const mockRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Payment), useValue: mockRepo },
        { provide: getRepositoryToken(Order), useValue: mockRepo },
        { provide: getRepositoryToken(Shipping), useValue: mockRepo },
        { provide: getRepositoryToken(User), useValue: mockRepo },
        { provide: 'PaymentGateway', useValue: mockGateway },
        { provide: TossPaymentAdapter, useValue: mockGateway },
        { provide: StripePaymentAdapter, useValue: mockGateway },
        { provide: NotificationService, useValue: { sendPaymentConfirmed: jest.fn() } },
        { provide: DataSource, useValue: { transaction: jest.fn() } },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('유효한 서명 → 200 처리', async () => {
    mockGateway.verifyWebhook.mockReturnValue(true);
    await expect(
      service.handleWebhook(
        { eventType: 'PAYMENT_STATUS_CHANGED' },
        'valid_sig',
      ),
    ).resolves.not.toThrow();
  });

  it('잘못된 서명 → UnauthorizedException', async () => {
    mockGateway.verifyWebhook.mockReturnValue(false);
    await expect(service.handleWebhook({}, 'bad_sig')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('웹훅 로그에 민감 필드(cardNumber 등) 포함 안 됨', async () => {
    mockGateway.verifyWebhook.mockReturnValue(true);
    const logSpy = jest.spyOn(service['logger'], 'log');
    const payload = {
      orderId: 42,
      status: 'DONE',
      type: 'PAYMENT',
      cardNumber: '4111111111111111',
      accountNumber: '123456789',
    };
    await service.handleWebhook(payload, 'valid_sig');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('42'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('DONE'));
    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('4111111111111111'),
    );
    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('123456789'),
    );
  });

  it('웹훅 로그에 orderId, status, type 필드만 포함', async () => {
    mockGateway.verifyWebhook.mockReturnValue(true);
    const logSpy = jest.spyOn(service['logger'], 'log');
    const payload = { orderId: 7, status: 'CANCELLED', type: 'CANCEL' };
    await service.handleWebhook(payload, 'valid_sig');
    const logArg: string = logSpy.mock.calls[0][0] as string;
    const logged = JSON.parse(logArg.replace('Webhook received: ', '')) as Record<string, unknown>;
    expect(Object.keys(logged)).toEqual(['orderId', 'status', 'type']);
  });
});
