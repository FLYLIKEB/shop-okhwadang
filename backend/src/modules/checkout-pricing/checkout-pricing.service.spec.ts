import { CheckoutPricingService } from './checkout-pricing.service';
import { CheckoutPricingPreviewDto } from './dto/checkout-pricing-preview.dto';

describe('CheckoutPricingService', () => {
  const manager = { marker: 'tx-manager' };
  const dataSource = {
    transaction: jest.fn((callback: (entityManager: typeof manager) => Promise<unknown>) => callback(manager)),
  };
  const orderCreationWorkflow = {
    assertCreatePayload: jest.fn(),
    previewPricing: jest.fn(),
  };

  let service: CheckoutPricingService;

  beforeEach(() => {
    jest.clearAllMocks();
    dataSource.transaction.mockImplementation((callback: (entityManager: typeof manager) => Promise<unknown>) => callback(manager));
    service = new CheckoutPricingService(dataSource as never, orderCreationWorkflow as never);
  });

  it('wraps preview requests in a transaction and delegates to the shared order pricing authority', async () => {
    const dto: CheckoutPricingPreviewDto = {
      items: [{ productId: 1, quantity: 2 }],
      zipcode: '12345',
      userCouponId: 10,
      pointsToUse: 1000,
      locale: 'en',
    };
    const preview = { totalPayable: 42000 };
    orderCreationWorkflow.previewPricing.mockResolvedValue(preview);

    await expect(service.preview(5, dto)).resolves.toBe(preview);

    expect(orderCreationWorkflow.assertCreatePayload).toHaveBeenCalledWith(dto);
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(orderCreationWorkflow.previewPricing).toHaveBeenCalledWith(manager, 5, dto);
  });
});
