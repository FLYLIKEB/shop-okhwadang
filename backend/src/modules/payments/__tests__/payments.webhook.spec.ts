import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentsService } from '../payments.service';
import { Payment } from '../entities/payment.entity';
import { Order } from '../../orders/entities/order.entity';
import { Shipping } from '../entities/shipping.entity';

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
        { provide: 'PaymentGateway', useValue: mockGateway },
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
});
