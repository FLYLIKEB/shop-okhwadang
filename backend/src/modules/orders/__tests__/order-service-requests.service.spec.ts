import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ModuleRef } from '@nestjs/core';
import { validate } from 'class-validator';
import { DataSource, EntityManager } from 'typeorm';
import { OrderServiceRequestsService } from '../order-service-requests.service';
import { Order, OrderStatus } from '../entities/order.entity';
import {
  OrderServiceRequest,
  OrderServiceRequestStatus,
  OrderServiceRequestType,
} from '../entities/order-service-request.entity';
import { NotificationService } from '../../notification/notification.service';
import { NotificationDispatchHelper } from '../../notification/notification-dispatch.helper';
import type { PaymentsService } from '../../payments/payments.service';
import { Payment, PaymentStatus } from '../../payments/entities/payment.entity';
import { UpdateOrderServiceRequestDto } from '../dto/update-order-service-request.dto';

const makeOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 7,
  userId: 10,
  orderNumber: 'ORD-20260101-ABCDE',
  status: OrderStatus.PAID,
  totalAmount: 30000,
  discountAmount: 0,
  shippingFee: 0,
  recipientName: '홍길동',
  recipientPhone: '010-0000-0000',
  zipcode: '12345',
  address: '서울시',
  addressDetail: null,
  memo: null,
  pointsUsed: 1000,
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [],
  ...overrides,
} as Order);

const makeRequest = (
  order: Order,
  overrides: Partial<OrderServiceRequest> = {},
): OrderServiceRequest => ({
  id: 55,
  orderId: Number(order.id),
  userId: order.userId,
  type: OrderServiceRequestType.CANCEL,
  status: OrderServiceRequestStatus.REQUESTED,
  reason: '고객 변심',
  detail: null,
  imageUrls: null,
  useShippingAddress: true,
  pickupName: null,
  pickupPhone: null,
  pickupZipcode: null,
  pickupAddress: null,
  pickupAddressDetail: null,
  adminNote: null,
  processedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  order,
  user: { id: order.userId, email: 'user@example.com', name: '홍길동' },
  ...overrides,
} as unknown as OrderServiceRequest);

const makeRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const makeManager = () => ({
  update: jest.fn().mockResolvedValue({}),
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  increment: jest.fn().mockResolvedValue({}),
  save: jest.fn().mockResolvedValue({}),
});

describe('UpdateOrderServiceRequestDto', () => {
  it('rejects admin notes longer than the email-safe limit', async () => {
    const dto = new UpdateOrderServiceRequestDto();
    dto.status = OrderServiceRequestStatus.APPROVED;
    dto.adminNote = 'a'.repeat(501);

    const errors = await validate(dto);

    expect(errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        property: 'adminNote',
        constraints: expect.objectContaining({
          maxLength: '관리자 메모는 최대 500자까지 입력 가능합니다.',
        }),
      }),
    ]));
  });
});

describe('OrderServiceRequestsService', () => {
  let service: OrderServiceRequestsService;
  let requestRepository: ReturnType<typeof makeRepository>;
  let orderRepository: ReturnType<typeof makeRepository>;
  let manager: ReturnType<typeof makeManager>;
  let paymentsService: jest.Mocked<Pick<PaymentsService, 'cancelPaidOrder'>>;
  let notificationService: jest.Mocked<Pick<NotificationService, 'sendEmail'>>;
  let notificationDispatchHelper: jest.Mocked<Pick<NotificationDispatchHelper, 'dispatch'>>;

  beforeEach(async () => {
    requestRepository = makeRepository();
    orderRepository = makeRepository();
    manager = makeManager();
    paymentsService = {
      cancelPaidOrder: jest.fn().mockResolvedValue({
        paymentId: 100,
        status: PaymentStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: '관리자 승인',
      }),
    };
    notificationService = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    notificationDispatchHelper = { dispatch: jest.fn().mockResolvedValue(undefined) };

    const dataSource = {
      transaction: jest.fn((cb: (txManager: EntityManager) => Promise<unknown>) => cb(manager as unknown as EntityManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderServiceRequestsService,
        { provide: getRepositoryToken(OrderServiceRequest), useValue: requestRepository },
        { provide: getRepositoryToken(Order), useValue: orderRepository },
        { provide: DataSource, useValue: dataSource },
        { provide: NotificationService, useValue: notificationService },
        { provide: NotificationDispatchHelper, useValue: notificationDispatchHelper },
        { provide: ModuleRef, useValue: { get: jest.fn().mockReturnValue(paymentsService) } },
      ],
    }).compile();

    service = module.get<OrderServiceRequestsService>(OrderServiceRequestsService);
  });

  it('paid cancel request completion routes through shared payment cancellation in the same transaction', async () => {
    const order = makeOrder({ status: OrderStatus.PAID });
    const request = makeRequest(order);
    const updated = makeRequest(order, {
      status: OrderServiceRequestStatus.COMPLETED,
      adminNote: '관리자 승인',
    });
    requestRepository.findOne
      .mockResolvedValueOnce(request)
      .mockResolvedValueOnce(updated);
    manager.findOne.mockResolvedValue(order);

    await service.updateForAdmin(request.id, {
      status: OrderServiceRequestStatus.COMPLETED,
      adminNote: '관리자 승인',
    });

    expect(paymentsService.cancelPaidOrder).toHaveBeenCalledWith(
      order.id,
      '관리자 승인',
    );
    expect(manager.update).toHaveBeenCalledWith(
      OrderServiceRequest,
      request.id,
      expect.objectContaining({
        status: OrderServiceRequestStatus.COMPLETED,
        adminNote: '관리자 승인',
        processedAt: expect.any(Date),
      }),
    );
    expect(manager.update).not.toHaveBeenCalledWith(
      Order,
      order.id,
      { status: OrderStatus.CANCELLED },
    );
  });

  it('pending cancel request completion keeps the local unpaid cancellation path', async () => {
    const order = makeOrder({ status: OrderStatus.PENDING, pointsUsed: 0 });
    const request = makeRequest(order);
    const updated = makeRequest(order, { status: OrderServiceRequestStatus.COMPLETED });
    requestRepository.findOne
      .mockResolvedValueOnce(request)
      .mockResolvedValueOnce(updated);
    manager.findOne.mockResolvedValue(order);

    await service.updateForAdmin(request.id, {
      status: OrderServiceRequestStatus.COMPLETED,
    });

    expect(paymentsService.cancelPaidOrder).not.toHaveBeenCalled();
    expect(manager.update).toHaveBeenCalledWith(Order, order.id, expect.objectContaining({
      status: OrderStatus.CANCELLED,
      cancelReason: request.reason,
      cancelledAt: expect.any(Date),
    }));
    expect(manager.update).toHaveBeenCalledWith(
      Payment,
      { orderId: order.id, status: PaymentStatus.PENDING },
      expect.objectContaining({ status: PaymentStatus.CANCELLED, cancelReason: request.reason }),
    );
  });

  it('pending cancel request is completed immediately by the user without admin approval', async () => {
    const order = makeOrder({ status: OrderStatus.PENDING, pointsUsed: 0 });
    const request = makeRequest(order, { id: 77, status: OrderServiceRequestStatus.REQUESTED, reason: '단순 변심' });
    const completed = makeRequest(order, {
      id: 77,
      status: OrderServiceRequestStatus.COMPLETED,
      reason: '단순 변심',
      adminNote: '결제대기 주문 사용자 즉시 취소',
      processedAt: new Date(),
    });
    orderRepository.findOne.mockResolvedValue(order);
    requestRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(completed);
    requestRepository.create.mockReturnValue(request);
    manager.save.mockResolvedValue(completed);
    manager.findOne.mockResolvedValue(order);

    const result = await service.create(order.id, order.userId, {
      type: OrderServiceRequestType.CANCEL,
      reason: '단순 변심',
      useShippingAddress: true,
    });

    expect(result).toBe(completed);
    expect(requestRepository.save).not.toHaveBeenCalled();
    expect(manager.save).toHaveBeenCalledWith(OrderServiceRequest, expect.objectContaining({
      status: OrderServiceRequestStatus.COMPLETED,
      adminNote: '결제대기 주문 사용자 즉시 취소',
      processedAt: expect.any(Date),
    }));
    expect(manager.update).toHaveBeenCalledWith(Order, order.id, expect.objectContaining({
      status: OrderStatus.CANCELLED,
      cancelReason: '단순 변심',
      cancelledAt: expect.any(Date),
    }));
    expect(manager.update).toHaveBeenCalledWith(
      Payment,
      { orderId: order.id, status: PaymentStatus.PENDING },
      expect.objectContaining({ status: PaymentStatus.CANCELLED, cancelReason: '단순 변심' }),
    );
    expect(paymentsService.cancelPaidOrder).not.toHaveBeenCalled();
  });


  it('pending immediate cancellation rechecks pending status inside the transaction', async () => {
    const order = makeOrder({ status: OrderStatus.PENDING, pointsUsed: 0 });
    const request = makeRequest(order, { id: 78, status: OrderServiceRequestStatus.REQUESTED, reason: '단순 변심' });
    orderRepository.findOne.mockResolvedValue(order);
    requestRepository.findOne.mockResolvedValueOnce(null);
    requestRepository.create.mockReturnValue(request);
    manager.findOne.mockResolvedValueOnce(makeOrder({ status: OrderStatus.PAID }));

    await expect(service.create(order.id, order.userId, {
      type: OrderServiceRequestType.CANCEL,
      reason: '단순 변심',
      useShippingAddress: true,
    })).rejects.toThrow('결제 상태가 변경되었습니다. 새로고침 후 다시 시도해주세요.');

    expect(manager.save).not.toHaveBeenCalled();
    expect(manager.update).not.toHaveBeenCalledWith(Order, order.id, expect.any(Object));
  });

  it('escapes HTML-like recipient names in received request notification email HTML', async () => {
    const order = makeOrder();
    const request = makeRequest(order);
    notificationDispatchHelper.dispatch.mockImplementation(async (params) => {
      await params.send({
        id: request.userId,
        email: 'user@example.com',
        name: '<img src=x onerror=alert(1)>',
      });
    });

    await (service as unknown as {
      notifyRequestReceived: (request: OrderServiceRequest, order: Order) => Promise<void>;
    }).notifyRequestReceived(request, order);

    expect(notificationService.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.not.stringContaining('<img'),
    }));
    expect(notificationService.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining('&lt;img src=x onerror=alert(1)&gt;'),
    }));
  });

  it('escapes HTML-like recipient names and admin notes in status notification email HTML', async () => {
    const order = makeOrder();
    const request = makeRequest(order, {
      status: OrderServiceRequestStatus.APPROVED,
      adminNote: '<a href="https://evil.test">확인</a> & "추적"',
    });
    notificationDispatchHelper.dispatch.mockImplementation(async (params) => {
      await params.send({
        id: request.userId,
        email: 'user@example.com',
        name: '홍<script>alert(1)</script>',
      });
    });

    await (service as unknown as {
      notifyRequestStatusChanged: (request: OrderServiceRequest) => Promise<void>;
    }).notifyRequestStatusChanged(request);

    expect(notificationService.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.not.stringContaining('<script>'),
    }));
    expect(notificationService.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.not.stringContaining('<a href='),
    }));
    expect(notificationService.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining('홍&lt;script&gt;alert(1)&lt;/script&gt;'),
    }));
    expect(notificationService.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining('&lt;a href=&quot;https://evil.test&quot;&gt;확인&lt;/a&gt; &amp; &quot;추적&quot;'),
    }));
  });
});
