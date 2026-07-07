import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { OrderEmailItem } from './templates/render';

function normalizeFrontendUrl(): string | null {
  const raw = process.env.FRONTEND_URL?.trim();
  return raw ? raw.replace(/\/$/, '') : null;
}

export function buildProductUrl(productId: number, locale: 'ko' | 'en' = 'ko'): string | undefined {
  const baseUrl = normalizeFrontendUrl();
  if (!baseUrl) return undefined;
  return `${baseUrl}/${locale}/products/${productId}`;
}

export function buildOrderUrl(orderId: number, locale: 'ko' | 'en' = 'ko'): string | undefined {
  const baseUrl = normalizeFrontendUrl();
  if (!baseUrl) return undefined;
  return `${baseUrl}/${locale}/my/orders/${orderId}`;
}

export function buildOrderEmailItems(
  orderOrItems: Pick<Order, 'items'> | OrderItem[] | null | undefined,
  locale: 'ko' | 'en' = 'ko',
): OrderEmailItem[] {
  const items = Array.isArray(orderOrItems) ? orderOrItems : orderOrItems?.items;
  if (!items?.length) return [];

  return items.map((item) => ({
    productName: item.productName || `상품 #${item.productId}`,
    optionName: item.optionName ?? undefined,
    quantity: Number(item.quantity ?? 0),
    unitPrice: Number(item.price ?? 0),
    productUrl: buildProductUrl(Number(item.productId), locale),
  }));
}
