import { GuestOrderCreationWorkflowService } from '../guest-order-creation.workflow.service';
import { CreateGuestOrderDto } from '../dto/create-guest-order.dto';
import { OrderStatus } from '../entities/order.entity';

describe('GuestOrderCreationWorkflowService', () => {
  const dto: CreateGuestOrderDto = {
    items: [{ productId: 1, quantity: 2 }],
    guestEmail: '  Guest@Example.COM ',
    recipientName: '홍길동',
    recipientPhone: '010-1234-5678',
    zipcode: '12345',
    address: '서울특별시 강남구',
    addressDetail: '101동 101호',
    memo: '부재 시 문 앞',
    orderLocale: 'en',
    policyConsents: [{ slug: 'terms', version: 'v1', effectiveDate: '2026-07-22' }],
    marketingConsent: true,
  };

  it('persists guest-safe order fields while delegating pricing authority to the shared workflow', async () => {
    const manager = { marker: 'tx-manager' };
    const savedOrder = {
      id: 321,
      orderNumber: 'ORD-20260722-ABCDE',
      status: OrderStatus.PENDING,
    };
    const orderItems = [{ productId: 1, quantity: 2, productName: '상품' }];
    const shippingItemPolicies = [{ isFreeShipping: false }];

    const sharedWorkflow = {
      assertCreatePayload: jest.fn(),
      validateAndReserveStock: jest.fn().mockResolvedValue({
        orderItems,
        subtotalAmount: 42000,
        shippingItemPolicies,
      }),
      calculatePricing: jest.fn().mockResolvedValue({
        subtotalAmount: 42000,
        couponDiscount: 0,
        pointsDiscount: 0,
        shippingFee: 3000,
        isFreeShipping: false,
        isRemoteArea: false,
        remoteAreaSurcharge: 3000,
        totalPayable: 45000,
        appliedPointsUsed: 0,
        freeShippingThreshold: 50000,
      }),
      saveOrder: jest.fn().mockResolvedValue(savedOrder),
      savePolicyConsent: jest.fn().mockResolvedValue(undefined),
      saveOrderItems: jest.fn().mockResolvedValue(undefined),
    };

    const service = new GuestOrderCreationWorkflowService(sharedWorkflow as never);

    const result = await service.runCreateOrderTransaction(manager as never, dto);

    expect(sharedWorkflow.validateAndReserveStock).toHaveBeenCalledWith(manager, dto);
    expect(sharedWorkflow.calculatePricing).toHaveBeenCalledWith(manager, null, {
      zipcode: dto.zipcode,
      subtotalAmount: 42000,
      shippingItemPolicies,
    });
    expect(sharedWorkflow.saveOrder).toHaveBeenCalledWith(manager, {
      userId: null,
      totalAmount: 45000,
      discountAmount: 0,
      shippingFee: 3000,
      pointsUsed: 0,
      guestEmailNormalized: 'guest@example.com',
      orderLocale: 'en',
      recipientName: dto.recipientName,
      recipientPhone: dto.recipientPhone,
      zipcode: dto.zipcode,
      address: dto.address,
      addressDetail: dto.addressDetail,
      memo: dto.memo,
    });
    expect(sharedWorkflow.savePolicyConsent).toHaveBeenCalledWith(manager, null, savedOrder, dto);
    expect(sharedWorkflow.saveOrderItems).toHaveBeenCalledWith(manager, orderItems, 321);
    expect(result).toEqual({
      savedOrder,
      totalPayable: 45000,
      recipientName: dto.recipientName,
      guestEmailNormalized: 'guest@example.com',
      orderLocale: 'en',
    });
  });

  it('delegates payload validation to the shared workflow preflight check', () => {
    const sharedWorkflow = {
      assertCreatePayload: jest.fn(),
    };
    const service = new GuestOrderCreationWorkflowService(sharedWorkflow as never);

    service.assertCreatePayload(dto);

    expect(sharedWorkflow.assertCreatePayload).toHaveBeenCalledWith(dto);
  });
});
