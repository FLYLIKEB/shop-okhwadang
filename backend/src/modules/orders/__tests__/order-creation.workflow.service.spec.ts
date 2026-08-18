import { BadRequestException } from '@nestjs/common';
import { OrderCreationWorkflowService } from '../order-creation.workflow.service';
import { OrderStatus } from '../entities/order.entity';
import { CreateOrderDto } from '../dto/create-order.dto';

describe('OrderCreationWorkflowService', () => {
  const pointsService = {
    lockUserForPointChanges: jest.fn(),
    getEffectiveBalanceInTx: jest.fn(),
    deductFifo: jest.fn(),
  };
  const couponsService = {
    calculate: jest.fn(),
    useCoupon: jest.fn(),
  };
  const shippingFeeCalculator = {
    calculate: jest.fn(),
  };

  let service: OrderCreationWorkflowService;

type OrderCreationWorkflowServiceInternals = {
  clearCartItems: (userId: number, manager: unknown) => Promise<void>;
};

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OrderCreationWorkflowService(
      pointsService as never,
      couponsService as never,
      shippingFeeCalculator as never,
    );
  });

  it('rejects order creation with an empty checkout policy consent list', async () => {
    const manager = { query: jest.fn().mockResolvedValue([]) };
    await expect(service.savePolicyConsent(
      manager as never,
      null,
      { id: 10 } as never,
      { policyConsents: [] },
    )).rejects.toThrow(new BadRequestException('필수 정책 동의 정보가 없습니다.'));
  });

  it('rejects policy snapshots that do not match the current server versions', async () => {
    const manager = {
      query: jest.fn().mockResolvedValue([
        { slug: 'privacy', title: '개인정보처리방침', version: 'v2', effectiveDate: '2026-08-01' },
        { slug: 'returns', title: '반품 안내', version: 'v2', effectiveDate: '2026-08-01' },
        { slug: 'shipping', title: '배송 안내', version: 'v2', effectiveDate: '2026-08-01' },
        { slug: 'terms', title: '이용약관', version: 'v2', effectiveDate: '2026-08-01' },
      ]),
      save: jest.fn(),
    };

    await expect(service.savePolicyConsent(
      manager as never,
      null,
      { id: 10 } as never,
      { policyConsents: [
        { slug: 'privacy', version: 'v2', effectiveDate: '2026-08-01' },
        { slug: 'returns', version: 'v2', effectiveDate: '2026-08-01' },
        { slug: 'shipping', version: 'v2', effectiveDate: '2026-08-01' },
        { slug: 'terms', version: 'v1', effectiveDate: '2026-04-20' },
      ] },
    )).rejects.toThrow(new BadRequestException('정책 버전이 변경되었습니다. 최신 정책에 다시 동의해 주세요.'));
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('persists the exact current policy snapshots and explicit marketing opt-out', async () => {
    const manager = {
      query: jest.fn().mockResolvedValue([
        { slug: 'privacy', title: '개인정보처리방침', version: 'v1', effectiveDate: '2026-04-20' },
        { slug: 'returns', title: '반품 안내', version: 'v1', effectiveDate: '2026-04-20' },
        { slug: 'shipping', title: '배송 안내', version: 'v1', effectiveDate: '2026-04-20' },
        { slug: 'terms', title: '이용약관', version: 'v1', effectiveDate: '2026-04-20' },
      ]),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const dto = {
      policyConsents: [
        { slug: 'privacy', version: 'v1', effectiveDate: '2026-04-20' },
        { slug: 'returns', version: 'v1', effectiveDate: '2026-04-20' },
        { slug: 'shipping', version: 'v1', effectiveDate: '2026-04-20' },
        { slug: 'terms', version: 'v1', effectiveDate: '2026-04-20' },
      ],
      marketingConsent: false,
    };

    await service.savePolicyConsent(manager as never, 7, { id: 10 } as never, dto);

    expect(manager.save).toHaveBeenCalledWith(expect.anything(), {
      userId: 7,
      context: 'checkout',
      resourceType: 'order',
      resourceId: 10,
      policies: dto.policyConsents,
      marketingConsent: false,
    });
  });

  it('rejects guest coupon/point preview requests before any member pricing is applied', async () => {
    const manager = {};

    await expect(
      service.calculatePricing(manager as never, null, {
        zipcode: '12345',
        subtotalAmount: 20000,
        shippingItemPolicies: [{ isFreeShipping: false }],
        userCouponId: 9,
      }),
    ).rejects.toThrow(new BadRequestException('비회원은 쿠폰이나 적립금을 사용할 수 없습니다.'));

    expect(couponsService.calculate).not.toHaveBeenCalled();
    expect(pointsService.getEffectiveBalanceInTx).not.toHaveBeenCalled();
  });

  it('returns authoritative preview fields and keeps shipping/free-shipping based on pre-discount subtotal', async () => {
    const manager = {};

    pointsService.getEffectiveBalanceInTx.mockResolvedValue(50000);
    couponsService.calculate.mockResolvedValue({
      originalAmount: 50000,
      couponDiscount: 12000,
      pointsDiscount: 0,
      finalAmount: 38000,
      shippingFee: 3000,
      totalPayable: 41000,
    });
    shippingFeeCalculator.calculate.mockResolvedValue({
      subtotal: 50000,
      zipcode: '12345',
      shippingFee: 0,
      isFreeShipping: true,
      isRemoteArea: false,
      isProductFreeShipping: false,
      threshold: 50000,
      baseFee: 3000,
      remoteAreaSurcharge: 3000,
    });

    await expect(
      service.calculatePricing(manager as never, 7, {
        zipcode: '12345',
        subtotalAmount: 50000,
        shippingItemPolicies: [{ isFreeShipping: false }],
        userCouponId: 10,
        pointsToUse: 0,
      }),
    ).resolves.toEqual({
      subtotalAmount: 50000,
      couponDiscount: 12000,
      pointsDiscount: 0,
      shippingFee: 0,
      isFreeShipping: true,
      isRemoteArea: false,
      remoteAreaSurcharge: 3000,
      totalPayable: 38000,
      appliedUserCouponId: 10,
      appliedPointsUsed: 0,
      freeShippingThreshold: 50000,
    });

    expect(couponsService.calculate).toHaveBeenCalledWith(7, {
      orderAmount: 50000,
      userCouponId: 10,
      pointsToUse: 0,
    });
    expect(shippingFeeCalculator.calculate).toHaveBeenCalledWith(50000, '12345', [{ isFreeShipping: false }]);
  });

  it('persists and deducts only capped appliedPointsUsed during member order commit', async () => {
    const manager = { marker: 'tx-manager' };
    const dto: CreateOrderDto = {
      items: [{ productId: 1, quantity: 1 }],
      recipientName: '홍길동',
      recipientPhone: '010-1234-5678',
      zipcode: '12345',
      address: '서울시 강남구',
      pointsUsed: 10000,
      userCouponId: 15,
    };
    const savedOrder = {
      id: 42,
      orderNumber: 'ORD-20260725-ABCDE',
      status: OrderStatus.PENDING,
    };

    jest.spyOn(service, 'validateAndReserveStock').mockResolvedValue({
      orderItems: [{ productId: 1, quantity: 1 }],
      subtotalAmount: 10000,
      shippingItemPolicies: [{ isFreeShipping: false }],
    });
    jest.spyOn(service, 'calculatePricing').mockResolvedValue({
      subtotalAmount: 10000,
      couponDiscount: 3000,
      pointsDiscount: 7000,
      shippingFee: 3000,
      isFreeShipping: false,
      isRemoteArea: false,
      remoteAreaSurcharge: 3000,
      totalPayable: 3000,
      appliedUserCouponId: 15,
      appliedPointsUsed: 7000,
      freeShippingThreshold: 50000,
    });
    jest.spyOn(service, 'saveOrder').mockResolvedValue(savedOrder as never);
    jest.spyOn(service, 'savePolicyConsent').mockResolvedValue(undefined);
    jest.spyOn(service, 'saveOrderItems').mockResolvedValue(undefined);
    const clearCartItemsSpy = jest
      .spyOn(service as unknown as OrderCreationWorkflowServiceInternals, 'clearCartItems')
      .mockResolvedValue(undefined);
    couponsService.useCoupon.mockResolvedValue(undefined);
    pointsService.deductFifo.mockResolvedValue(0);
    pointsService.lockUserForPointChanges.mockResolvedValue(undefined);

    await expect(service.runCreateOrderTransaction(manager as never, 11, dto, 10000)).resolves.toEqual({
      savedOrder,
      totalPayable: 3000,
      recipientName: '홍길동',
    });

    expect(service.saveOrder).toHaveBeenCalledWith(manager, expect.objectContaining({
      totalAmount: 3000,
      discountAmount: 3000,
      pointsUsed: 7000,
    }));
    expect(pointsService.lockUserForPointChanges).toHaveBeenCalledWith(manager, 11);
    expect(couponsService.useCoupon).toHaveBeenCalledWith(15, 11, 42, manager);
    expect(pointsService.deductFifo).toHaveBeenCalledWith(
      manager,
      11,
      7000,
      '주문 사용 (ORD-20260725-ABCDE)',
      42,
    );
    expect(clearCartItemsSpy).toHaveBeenCalledWith(manager, 11, dto);

    clearCartItemsSpy.mockClear();
    const buyNowDto: CreateOrderDto = { ...dto, preserveCart: true };
    await service.runCreateOrderTransaction(manager as never, 11, buyNowDto, 10000);
    expect(clearCartItemsSpy).not.toHaveBeenCalled();
  });

  it('acquires the member ledger lock before reserving inventory', async () => {
    const manager = { marker: 'tx-manager' };
    const dto: CreateOrderDto = {
      items: [{ productId: 1, quantity: 1 }],
      recipientName: '홍길동',
      recipientPhone: '010-1234-5678',
      zipcode: '12345',
      address: '서울시 강남구',
    };
    let releaseLock: (() => void) | undefined;
    pointsService.lockUserForPointChanges.mockImplementation(
      () => new Promise<void>((resolve) => { releaseLock = resolve; }),
    );
    const reserveStock = jest
      .spyOn(service, 'validateAndReserveStock')
      .mockRejectedValue(new Error('stop after inventory reservation'));

    const creation = service.runCreateOrderTransaction(manager as never, 11, dto, 0);
    await Promise.resolve();

    expect(reserveStock).not.toHaveBeenCalled();
    releaseLock?.();
    await expect(creation).rejects.toThrow('stop after inventory reservation');
  });
});
