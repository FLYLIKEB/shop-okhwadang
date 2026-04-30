import { EntityManager } from 'typeorm';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { ProductOption } from '../products/entities/product-option.entity';

/**
 * 주문 취소·환불 시 재고 복구 유틸리티 (issue #723).
 *
 * 정책:
 *   - 옵션이 있는 주문 항목: `product_option.stock` 만 복구한다.
 *     상품 총 재고는 원장이 아니므로 건드리지 않는다.
 *   - 옵션이 없는 주문 항목: `product.stock` 을 복구한다.
 *
 * 멱등성:
 *   호출자(주문 상태 전이 정책)가 cancelled/refunded → cancelled/refunded 전이를
 *   차단하기 때문에 같은 주문에 대해 이 함수가 두 번 실행되지 않는 것이 보장된다.
 *   본 유틸리티 자체는 호출 횟수에 비례해 재고를 더하므로, 멱등성은 호출 측에서 보장해야 한다.
 */
export async function restoreOrderStock(
  manager: EntityManager,
  orderId: number,
): Promise<void> {
  const items = await manager.find(OrderItem, { where: { orderId } });

  for (const item of items) {
    if (item.productOptionId !== null) {
      await manager.increment(
        ProductOption,
        { id: item.productOptionId },
        'stock',
        item.quantity,
      );
    } else {
      await manager.increment(
        Product,
        { id: item.productId },
        'stock',
        item.quantity,
      );
    }
  }
}
