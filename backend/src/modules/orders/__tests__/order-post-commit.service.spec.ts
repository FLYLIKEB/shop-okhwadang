import { OrderPostCommitService } from '../order-post-commit.service';
import { Order } from '../entities/order.entity';
import type { OrderPostCommitPayload } from '../order-creation.workflow.service';

describe('OrderPostCommitService', () => {
  let service: OrderPostCommitService;
  const orderRepository = {
    findOne: jest.fn(),
  };
  const notificationService = {
    sendOrderConfirmed: jest.fn().mockResolvedValue(undefined),
  };
  const messageNotificationService = {
    sendOrderCreated: jest.fn().mockResolvedValue(undefined),
  };
  const notificationDispatchHelper = {
    dispatch: jest.fn().mockResolvedValue(undefined),
  };

  const originalFrontendUrl = process.env.FRONTEND_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FRONTEND_URL = 'https://shop.example.com';

    service = new OrderPostCommitService(
      orderRepository as never,
      notificationService as never,
      messageNotificationService as never,
      notificationDispatchHelper as never,
    );
  });

  afterAll(() => {
    process.env.FRONTEND_URL = originalFrontendUrl;
  });

  it('dispatches guest order-created notifications to the explicit recipient with locale-aware guest lookup CTA and no member message branch', async () => {
    const payload: OrderPostCommitPayload = {
      savedOrder: {
        id: 41,
        orderNumber: 'ORD-GUEST-41',
        userId: null,
      } as unknown as Order,
      totalPayable: 54000,
      recipientName: 'Guest Buyer',
    };

    orderRepository.findOne.mockResolvedValue({
      id: 41,
      orderNumber: 'ORD-GUEST-41',
      userId: null,
      guestEmailNormalized: 'guest@example.com',
      orderLocale: 'en',
      items: [
        {
          productId: 7,
          productName: 'Tea Cup',
          optionName: null,
          quantity: 2,
          price: 27000,
        },
      ],
    } as unknown as Order);

    await service.dispatchOrderCreated(null, payload);

    expect(notificationDispatchHelper.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'order.confirmed',
        resourceId: 41,
        mode: 'fire-and-forget',
        recipient: {
          email: 'guest@example.com',
          name: 'Guest Buyer',
        },
      }),
    );
    expect(messageNotificationService.sendOrderCreated).not.toHaveBeenCalled();

    const dispatchArg = notificationDispatchHelper.dispatch.mock.calls[0][0] as {
      send: (recipient: { email: string; name: string }) => Promise<void>;
    };
    await dispatchArg.send({ email: 'guest@example.com', name: 'Guest Buyer' });

    expect(notificationService.sendOrderConfirmed).toHaveBeenCalledWith(
      'guest@example.com',
      expect.objectContaining({
        recipientName: 'Guest Buyer',
        orderNumber: 'ORD-GUEST-41',
        totalAmount: 54000,
        locale: 'en',
        orderUrl: 'https://shop.example.com/en/order/lookup',
      }),
    );
  });

  it('keeps member order-created notifications on userId dispatch and member message notification branch', async () => {
    const payload: OrderPostCommitPayload = {
      savedOrder: {
        id: 42,
        orderNumber: 'ORD-MEMBER-42',
        userId: 9,
      } as unknown as Order,
      totalPayable: 12000,
      recipientName: 'Member Buyer',
    };

    orderRepository.findOne.mockResolvedValue({
      id: 42,
      orderNumber: 'ORD-MEMBER-42',
      userId: 9,
      orderLocale: 'ko',
      items: [
        {
          productId: 3,
          productName: 'Tea',
          optionName: null,
          quantity: 1,
          price: 12000,
        },
      ],
    } as unknown as Order);

    await service.dispatchOrderCreated(9, payload);
    await Promise.resolve();

    expect(notificationDispatchHelper.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'order.confirmed',
        resourceId: 42,
        mode: 'fire-and-forget',
        userId: 9,
      }),
    );
    expect(messageNotificationService.sendOrderCreated).toHaveBeenCalledWith(42);

    const dispatchArg = notificationDispatchHelper.dispatch.mock.calls[0][0] as {
      send: (recipient: { email: string; name: string }) => Promise<void>;
    };
    await dispatchArg.send({ email: 'member@example.com', name: 'Member Buyer' });

    expect(notificationService.sendOrderConfirmed).toHaveBeenCalledWith(
      'member@example.com',
      expect.objectContaining({
        recipientName: 'Member Buyer',
        orderNumber: 'ORD-MEMBER-42',
        totalAmount: 12000,
        locale: 'ko',
        orderUrl: 'https://shop.example.com/ko/my/orders/42',
      }),
    );
  });
});
