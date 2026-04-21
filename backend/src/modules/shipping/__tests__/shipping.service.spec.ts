import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ShippingService } from '../shipping.service';
import { Shipping, ShippingStatus } from '../../payments/entities/shipping.entity';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { NotificationService } from '../../notification/notification.service';
import { NotificationDispatchHelper } from '../../notification/notification-dispatch.helper';
import { MockShippingAdapter } from '../adapters/mock-shipping.adapter';
import { CjShippingAdapter } from '../adapters/cj-shipping.adapter';
import { ShippingFeeCalculatorService } from '../services/shipping-fee-calculator.service';

const makeOrder = (overrides: Partial<Order> = {}): Order =>
  ({ id: 1, userId: 10, status: OrderStatus.PAID, ...overrides } as unknown as Order);

const makeShipping = (overrides: Partial<Shipping> = {}): Shipping =>
  ({
    id: 1,
    orderId: 1,
    carrier: 'mock',
    trackingNumber: null,
    status: ShippingStatus.PAYMENT_CONFIRMED,
    shippedAt: null,
    deliveredAt: null,
    ...overrides,
  } as unknown as Shipping);

describe('ShippingService', () => {
  let service: ShippingService;

  const mockShippingRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const mockOrderRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const mockAdapter = {
    registerTrackingNumber: jest.fn(),
    getTrackingStatus: jest.fn().mockImplementation((trackingNumber: string) =>
      Promise.resolve({
        trackingNumber,
        status: 'in_transit',
        steps: [{ status: 'in_transit', description: '배송 중', timestamp: new Date().toISOString() }],
      })),
  };
  const mockCjAdapter = {
    registerTrackingNumber: jest.fn(),
    getTrackingStatus: jest.fn().mockResolvedValue({
      trackingNumber: '12345',
      status: 'in_transit',
      steps: [{ status: 'in_transit', description: '배송 중', timestamp: new Date().toISOString() }],
    }),
  };
  const mockCalculator = {
    calculate: jest.fn().mockResolvedValue({
      subtotal: 10000,
      zipcode: '12345',
      shippingFee: 3000,
      isFreeShipping: false,
      isRemoteArea: false,
      threshold: 50000,
      baseFee: 3000,
      remoteAreaSurcharge: 3000,
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingService,
        { provide: getRepositoryToken(Shipping), useValue: mockShippingRepo },
        { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
        { provide: NotificationService, useValue: { sendShippingUpdate: jest.fn() } },
        { provide: NotificationDispatchHelper, useValue: { dispatch: jest.fn().mockResolvedValue(undefined) } },
        { provide: MockShippingAdapter, useValue: mockAdapter },
        { provide: CjShippingAdapter, useValue: mockCjAdapter },
        { provide: ShippingFeeCalculatorService, useValue: mockCalculator },
      ],
    }).compile();
    service = module.get<ShippingService>(ShippingService);
  });

  describe('validateTransition', () => {
    it('payment_confirmed → preparing 전이 성공', () => {
      expect(() =>
        service.validateTransition(ShippingStatus.PAYMENT_CONFIRMED, ShippingStatus.PREPARING),
      ).not.toThrow();
    });

    it('preparing → shipped 전이 성공', () => {
      expect(() =>
        service.validateTransition(ShippingStatus.PREPARING, ShippingStatus.SHIPPED),
      ).not.toThrow();
    });

    it('shipped → in_transit 전이 성공', () => {
      expect(() =>
        service.validateTransition(ShippingStatus.SHIPPED, ShippingStatus.IN_TRANSIT),
      ).not.toThrow();
    });

    it('in_transit → delivered 전이 성공', () => {
      expect(() =>
        service.validateTransition(ShippingStatus.IN_TRANSIT, ShippingStatus.DELIVERED),
      ).not.toThrow();
    });

    it('DELIVERED → PREPARING 역방향 전이 → BadRequestException(유효하지 않은 배송 상태 변경입니다.)', () => {
      expect(() =>
        service.validateTransition(ShippingStatus.DELIVERED, ShippingStatus.PREPARING),
      ).toThrow(
        new BadRequestException(
          '상태 전이가 허용되지 않습니다: delivered → preparing',
        ),
      );
    });

    it('shipped → preparing 역방향 전이 → BadRequestException', () => {
      expect(() =>
        service.validateTransition(ShippingStatus.SHIPPED, ShippingStatus.PREPARING),
      ).toThrow(BadRequestException);
    });
  });

  describe('getByOrderId', () => {
    it('orderId 없음 → 404 배송 정보를 찾을 수 없습니다.', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);
      await expect(service.getByOrderId(999, 10)).rejects.toThrow(
        new NotFoundException('배송 정보를 찾을 수 없습니다.'),
      );
    });

    it('타인 주문 접근 → 403 접근 권한이 없습니다.', async () => {
      mockOrderRepo.findOne.mockResolvedValue(makeOrder({ userId: 99 }));
      await expect(service.getByOrderId(1, 10)).rejects.toThrow(
        new ForbiddenException('접근 권한이 없습니다.'),
      );
    });

    it('shipping 없음 → 404 배송 정보를 찾을 수 없습니다.', async () => {
      mockOrderRepo.findOne.mockResolvedValue(makeOrder());
      mockShippingRepo.findOne.mockResolvedValue(null);
      await expect(service.getByOrderId(1, 10)).rejects.toThrow(
        new NotFoundException('배송 정보를 찾을 수 없습니다.'),
      );
    });

    it('tracking_number 없음 → tracking null 반환', async () => {
      mockOrderRepo.findOne.mockResolvedValue(makeOrder());
      mockShippingRepo.findOne.mockResolvedValue(makeShipping());
      const result = await service.getByOrderId(1, 10);
      expect(result.tracking).toBeNull();
      expect(result.tracking_number).toBeNull();
    });

    it('tracking_number 있음 → tracking 정보 반환', async () => {
      mockOrderRepo.findOne.mockResolvedValue(makeOrder());
      mockShippingRepo.findOne.mockResolvedValue(
        makeShipping({ trackingNumber: '1234567890', status: ShippingStatus.IN_TRANSIT }),
      );
      const result = await service.getByOrderId(1, 10);
      expect(result.tracking).not.toBeNull();
      expect(result.tracking?.trackingNumber).toBe('1234567890');
    });
  });

  describe('registerTracking', () => {
    const dto = { carrier: 'mock' as const, trackingNumber: '9999999' };

    it('주문 없음 → 404 주문 정보를 찾을 수 없습니다.', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);
      await expect(service.registerTracking(999, dto)).rejects.toThrow(
        new NotFoundException('주문 정보를 찾을 수 없습니다.'),
      );
    });

    it('shipping 없음 → 404 배송 정보를 찾을 수 없습니다.', async () => {
      mockOrderRepo.findOne.mockResolvedValue(makeOrder());
      mockShippingRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.registerTracking(1, dto)).rejects.toThrow(
        new NotFoundException('배송 정보를 찾을 수 없습니다.'),
      );
    });

    it('이미 preparing 상태에서 preparing 전이 시도 → BadRequestException(유효하지 않은 배송 상태 변경입니다.)', async () => {
      mockOrderRepo.findOne.mockResolvedValue(makeOrder());
      mockShippingRepo.findOne.mockResolvedValueOnce(
        makeShipping({ status: ShippingStatus.PREPARING }),
      );
      await expect(service.registerTracking(1, dto)).rejects.toThrow(
        new BadRequestException(
          '상태 전이가 허용되지 않습니다: preparing → preparing',
        ),
      );
    });

    it('payment_confirmed 상태에서 운송장 등록 성공', async () => {
      mockOrderRepo.findOne.mockResolvedValue(makeOrder());
      mockShippingRepo.findOne
        .mockResolvedValueOnce(makeShipping())
        .mockResolvedValueOnce(makeShipping({ status: ShippingStatus.PREPARING, trackingNumber: '9999999' }));
      mockShippingRepo.update.mockResolvedValue({});
      mockOrderRepo.update.mockResolvedValue({});
      const result = await service.registerTracking(1, dto);
      expect(mockShippingRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ status: ShippingStatus.PREPARING, trackingNumber: '9999999' }),
      );
      expect(mockOrderRepo.update).toHaveBeenCalledWith(1, { status: OrderStatus.PREPARING });
      expect(result?.status).toBe(ShippingStatus.PREPARING);
    });
  });

  describe('track', () => {
    it('MockShippingAdapter.getTrackingStatus() → TrackingResult 반환', async () => {
      const result = await service.track({ carrier: 'mock', trackingNumber: '12345' });
      expect(result.carrier).toBe('mock');
      expect(result.trackingNumber).toBe('12345');
      expect(result.status).toBe('in_transit');
      expect(Array.isArray(result.steps)).toBe(true);
    });
  });

  describe('quote', () => {
    it('subtotal + zipcode로 배송비를 계산한다', async () => {
      const result = await service.quote(10000, '12345');

      expect(mockCalculator.calculate).toHaveBeenCalledWith(10000, '12345');
      expect(result.shippingFee).toBe(3000);
    });
  });
});
