import { ProductOptionInputDto } from './dto/create-product.dto';

export type SmartStoreImportStockSource =
  | 'product_stock'
  | 'option_stock_total'
  | 'single_option_collapsed'
  | 'default_zero';

export interface ResolvedImportOptionsStock {
  options: ProductOptionInputDto[] | undefined;
  stock: number;
  optionStockTotal: number | null;
  stockSource: SmartStoreImportStockSource;
}

/**
 * 커머스 임포트(네이버 커머스 API / 스마트스토어 엑셀)에서 옵션과 재고를 정규화한다. (issue #1036)
 *
 * 정책:
 *   - 옵션이 2개 이상: 옵션 재고 합계를 상품 재고로 사용한다.
 *   - 옵션이 정확히 1개: 고객이 선택할 수 있는 실제 옵션이 아니므로 옵션을 제거하고
 *     상품 기본 재고로 흡수한다. 이때 재고는 원 재고와 단일 옵션 재고 중 큰 값으로 세팅해
 *     원본이 옵션에만 재고를 넣고 상품 재고를 0으로 내려보내는 경우에도 품절로 오인되지 않게 한다.
 *   - 옵션이 없음: 상품 기본 재고를 그대로 사용한다.
 */
export function resolveImportOptionsStock(
  rawStock: number | null,
  options: ProductOptionInputDto[] | undefined,
): ResolvedImportOptionsStock {
  const optionStockTotal = sumOptionStock(options);

  if (options && options.length === 1) {
    const singleOptionStock = options[0].stock ?? 0;
    const stock = Math.max(rawStock ?? 0, singleOptionStock);
    return {
      options: undefined,
      stock,
      optionStockTotal: null,
      stockSource: 'single_option_collapsed',
    };
  }

  if (optionStockTotal !== null) {
    return { options, stock: optionStockTotal, optionStockTotal, stockSource: 'option_stock_total' };
  }

  if (rawStock !== null) {
    return { options, stock: rawStock, optionStockTotal: null, stockSource: 'product_stock' };
  }

  return { options, stock: 0, optionStockTotal: null, stockSource: 'default_zero' };
}

function sumOptionStock(options: ProductOptionInputDto[] | undefined): number | null {
  if (!options || options.length === 0) return null;
  return options.reduce((sum, option) => sum + (option.stock ?? 0), 0);
}
