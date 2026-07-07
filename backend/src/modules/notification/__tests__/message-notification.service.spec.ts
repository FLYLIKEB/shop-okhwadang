import { MessageNotificationService } from '../message-notification.service';
import { NotificationConfig } from '../../../config/notification.config';
import { NotificationLog } from '../entities/notification-log.entity';
import { Order } from '../../orders/entities/order.entity';
import { Payment, PaymentMethod } from '../../payments/entities/payment.entity';
import { Shipping } from '../../payments/entities/shipping.entity';
import { MessageProvider } from '../interfaces/message-provider.interface';

describe('MessageNotificationService', () => {
  const baseOrder = {
    id: 10,
    userId: 20,
    orderNumber: 'ORD-1',
    recipientName: '홍길동',
    recipientPhone: '010-1234-5678',
    totalAmount: 15000,
    user: { id: 20, phone: '010-9999-0000' },
  } as Order;

  const config: NotificationConfig = {
    nodeEnv: 'test',
    provider: 'mock',
    resend: { apiKey: '', fromAddress: 'no-reply@okhwadang.com' },
    message: {
      provider: 'mock',
      senderPhone: '021234567',
      kakaoChannelId: 'pf-id',
      smsFallbackEnabled: true,
      phoneHashSalt: 'test-salt',
      templates: {
        ORDER_CREATED: 'tpl-order',
        PAYMENT_CONFIRMED: 'tpl-payment',
        SHIPPING_STARTED: 'tpl-shipping-started',
        SHIPPING_DELIVERED: 'tpl-shipping-delivered',
        ORDER_CANCELLED: 'tpl-order-cancelled',
      },
      solapi: { apiKey: '', apiSecret: '', apiBaseUrl: 'https://api.solapi.com' },
    },
  };

  const logRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const orderRepository = { findOne: jest.fn() };
  const paymentRepository = { findOne: jest.fn() };
  const shippingRepository = { findOne: jest.fn() };
  const provider: MessageProvider = {
    send: jest.fn(),
  };

  let service: MessageNotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    logRepository.findOne.mockResolvedValue(null);
    logRepository.save.mockImplementation(async (value: Partial<NotificationLog>) => value);
    orderRepository.findOne.mockResolvedValue(baseOrder);
    paymentRepository.findOne.mockResolvedValue({ id: 30, orderId: 10, amount: 15000, method: PaymentMethod.CARD } as Payment);
    shippingRepository.findOne.mockResolvedValue({ id: 40, orderId: 10, carrier: 'cj', trackingNumber: '123456' } as Shipping);
    (provider.send as jest.Mock).mockResolvedValue({
      provider: 'mock',
      providerMessageId: 'msg-1',
      channel: 'kakao_alimtalk',
      status: 'sent',
    });

    const dataSource = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Order) return orderRepository;
        if (entity === Payment) return paymentRepository;
        if (entity === Shipping) return shippingRepository;
        throw new Error('unexpected repository');
      }),
    };

    service = new MessageNotificationService(
      logRepository as never,
      dataSource as never,
      provider,
      config,
    );
  });

  it('주문 수령자 번호를 우선 사용하고 원문 전화번호 없이 성공 로그를 저장한다', async () => {
    await service.sendOrderCreated(10);

    expect(provider.send).toHaveBeenCalledWith(expect.objectContaining({
      to: '01012345678',
      templateKey: 'ORDER_CREATED',
      templateId: 'tpl-order',
    }));
    expect(logRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'order.created',
      status: 'sent',
      recipientPhoneMasked: '010****5678',
      recipientPhoneHash: expect.any(String),
    }));
    expect(JSON.stringify(logRepository.save.mock.calls[0][0])).not.toContain('01012345678');
  });

  it('수령자 번호가 없으면 사용자 번호로 fallback 한다', async () => {
    orderRepository.findOne.mockResolvedValue({ ...baseOrder, recipientPhone: '', user: { id: 20, phone: '010-2222-3333' } });

    await service.sendPaymentConfirmed(10, 'card');

    expect(provider.send).toHaveBeenCalledWith(expect.objectContaining({
      to: '01022223333',
      templateKey: 'PAYMENT_CONFIRMED',
    }));
  });

  it('전화번호가 없으면 provider 호출 없이 skipped 로그를 남긴다', async () => {
    orderRepository.findOne.mockResolvedValue({ ...baseOrder, recipientPhone: '', user: { id: 20, phone: null } });

    await service.sendOrderCreated(10);

    expect(provider.send).not.toHaveBeenCalled();
    expect(logRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      status: 'skipped',
      errorMessage: '수신 가능한 전화번호가 없습니다.',
    }));
  });

  it('이미 sent 로그가 있으면 중복 발송하지 않는다', async () => {
    logRepository.findOne.mockResolvedValue({ id: 1, status: 'sent' });

    await service.sendShippingStarted(10);

    expect(provider.send).not.toHaveBeenCalled();
    expect(logRepository.save).not.toHaveBeenCalled();
  });


  it('주문 취소 메시지를 취소 사유와 함께 발송한다', async () => {
    await service.sendOrderCancelled(10, '품절');

    expect(provider.send).toHaveBeenCalledWith(expect.objectContaining({
      to: '01012345678',
      templateKey: 'ORDER_CANCELLED',
      templateId: 'tpl-order-cancelled',
      variables: expect.objectContaining({ cancelReason: '품절' }),
      fallbackText: expect.stringContaining('품절'),
    }));
    expect(logRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'order.cancelled',
      resourceType: 'order',
      resourceId: 10,
      templateKey: 'ORDER_CANCELLED',
      status: 'sent',
    }));
  });

  it('provider 실패는 전파하지 않고 failed 로그를 저장한다', async () => {
    (provider.send as jest.Mock).mockRejectedValue(new Error('provider down'));

    await expect(service.sendShippingDelivered(10)).resolves.toBeUndefined();

    expect(logRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
      errorMessage: expect.stringContaining('provider down'),
    }));
  });
});
