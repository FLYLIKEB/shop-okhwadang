import { OrderCreationWorkflowService } from '../order-creation.workflow.service';
import { Product, ProductStatus } from '../../products/entities/product.entity';
import { ProductOption } from '../../products/entities/product-option.entity';

function setup(option = false) {
  const product = { id: 1, name: 'pre-order', status: ProductStatus.ACTIVE, price: 1000, stock: 2, isPreOrder: true, preOrderShippingDate: '2026-12-01' };
  const variant = { id: 7, productId: 1, name: 'size', value: 'small', stock: 2, priceAdjustment: 100 };
  const qb = { setLock: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), getOne: jest.fn() };
  const manager = { createQueryBuilder: jest.fn().mockImplementation((entity) => {
    qb.getOne.mockResolvedValue(entity === Product ? product : variant);
    return qb;
  }), update: jest.fn() };
  const service = new OrderCreationWorkflowService({} as never, {} as never, {} as never);
  const input = { items: [{ productId: 1, quantity: 2, ...(option ? { productOptionId: 7 } : {}) }] };
  return { service, manager, product, input };
}

describe('pre-order checkout authority', () => {
  it.each([false, true])('reserves the existing stock ledger and snapshots terms (option=%s)', async (option) => {
    const { service, manager, product, input } = setup(option);
    const result = await service.validateAndReserveStock(manager as never, input);
    expect(manager.update).toHaveBeenCalledTimes(1);
    expect(manager.update).toHaveBeenCalledWith(option ? ProductOption : Product, option ? 7 : 1, { stock: 0 });
    expect(result.orderItems[0]).toMatchObject({ isPreOrder: true, preOrderShippingDate: '2026-12-01', price: option ? 1100 : 1000 });
    product.preOrderShippingDate = '2027-01-01';
    expect(result.orderItems[0].preOrderShippingDate).toBe('2026-12-01');
  });

  it('includes terms in guest-compatible pricing preview without reserving stock', async () => {
    const { service, manager, input } = setup();
    jest.spyOn(service, 'calculatePricing').mockResolvedValue({} as never);
    const preview = await service.previewPricing(manager as never, null, { ...input, zipcode: '00000' });
    expect(preview.items[0]).toMatchObject({ isPreOrder: true, preOrderShippingDate: '2026-12-01' });
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('snapshots USD prices and pre-order terms together for English checkout', async () => {
    const { service, manager, product, input } = setup();
    Object.assign(product, { priceUsd: 12.5, salePriceUsd: 10 });
    const englishInput = { ...input, orderLocale: 'en' as const };
    const result = await service.validateAndReserveStock(manager as never, englishInput);
    expect(result.orderItems[0]).toMatchObject({ priceUsd: 10, isPreOrder: true, preOrderShippingDate: '2026-12-01' });
    expect(result.subtotalUsd).toBe(20);
    jest.spyOn(service, 'calculatePricing').mockResolvedValue({} as never);
    const preview = await service.previewPricing(manager as never, null, { ...englishInput, zipcode: '00000' });
    expect(preview.items[0]).toMatchObject({ unitPriceUsd: 10, isPreOrder: true, preOrderShippingDate: '2026-12-01' });
    Object.assign(product, { salePriceUsd: 9, preOrderShippingDate: '2027-01-01' });
    expect(result.orderItems[0]).toMatchObject({ priceUsd: 10, preOrderShippingDate: '2026-12-01' });
  });

  it('rejects sold-out pre-orders before writing any reservation', async () => {
    const { service, manager, product, input } = setup();
    product.stock = 0;
    await expect(service.validateAndReserveStock(manager as never, input)).rejects.toThrow('재고가 부족합니다.');
    expect(manager.update).not.toHaveBeenCalled();
  });
});
