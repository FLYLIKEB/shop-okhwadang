import { ProductOptionInputDto } from '../dto/create-product.dto';
import { resolveImportOptionsStock } from '../product-import-stock.util';

function option(overrides: Partial<ProductOptionInputDto> = {}): ProductOptionInputDto {
  return { name: '용량', value: '100cc', priceAdjustment: 0, stock: 0, sortOrder: 0, ...overrides };
}

describe('resolveImportOptionsStock', () => {
  it('collapses a single option into base stock and drops the option (issue #1036)', () => {
    const result = resolveImportOptionsStock(0, [option({ stock: 5 })]);

    expect(result.options).toBeUndefined();
    expect(result.stock).toBe(5);
    expect(result.optionStockTotal).toBeNull();
    expect(result.stockSource).toBe('single_option_collapsed');
  });

  it('keeps the larger of raw stock and single option stock when collapsing', () => {
    expect(resolveImportOptionsStock(8, [option({ stock: 3 })]).stock).toBe(8);
    expect(resolveImportOptionsStock(0, [option({ stock: 0 })]).stock).toBe(0);
    expect(resolveImportOptionsStock(null, [option({ stock: 4 })]).stock).toBe(4);
  });

  it('sums option stock when there are multiple real options', () => {
    const result = resolveImportOptionsStock(0, [
      option({ value: '100cc', stock: 4 }),
      option({ value: '200cc', stock: 6 }),
    ]);

    expect(result.options).toHaveLength(2);
    expect(result.stock).toBe(10);
    expect(result.optionStockTotal).toBe(10);
    expect(result.stockSource).toBe('option_stock_total');
  });

  it('uses product stock when there are no options', () => {
    const result = resolveImportOptionsStock(7, undefined);

    expect(result.options).toBeUndefined();
    expect(result.stock).toBe(7);
    expect(result.stockSource).toBe('product_stock');
  });

  it('defaults to zero stock when neither options nor product stock exist', () => {
    const result = resolveImportOptionsStock(null, undefined);

    expect(result.stock).toBe(0);
    expect(result.stockSource).toBe('default_zero');
  });
});
