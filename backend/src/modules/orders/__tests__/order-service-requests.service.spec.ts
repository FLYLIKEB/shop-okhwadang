import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ModuleRef } from '@nestjs/core';
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
import { PaymentStatus } from '../../payments/entities/payment.entity';

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

describe('OrderServiceRequestsService', () => {
  let service: OrderServiceRequestsService;
  let requestRepository: ReturnType<typeof makeRepository>;
  let orderRepository: ReturnType<typeof makeRepository>;
  let manager: ReturnType<typeof makeManager>;
  let paymentsService: jest.Mocked<Pick<PaymentsService, 'cancelPaidOrder'>>;

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

    const dataSource = {
      transaction: jest.fn((cb: (txManager: EntityManager) => Promise<unknown>) => cb(manager as unknown as EntityManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderServiceRequestsService,
        { provide: getRepositoryToken(OrderServiceRequest), useValue: requestRepository },
        { provide: getRepositoryToken(Order), useValue: orderRepository },
        { provide: DataSource, useValue: dataSource },
        { provide: NotificationService, useValue: { sendEmail: jest.fn() } },
        { provide: NotificationDispatchHelper, useValue: { dispatch: jest.fn().mockResolvedValue(undefined) } },
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
    expect(manager.update).toHaveBeenCalledWith(Order, order.id, { status: OrderStatus.CANCELLED });
  });
});
