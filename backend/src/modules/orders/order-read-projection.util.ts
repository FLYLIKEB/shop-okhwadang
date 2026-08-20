import { SelectQueryBuilder } from 'typeorm';
import { applyLocale } from '../../common/utils/locale.util';
import { Order } from './entities/order.entity';

export const ORDER_READ_RELATIONS = ['items', 'items.product', 'items.option'] as const;

export function applyOrderReadRelationJoins(
  queryBuilder: SelectQueryBuilder<Order>,
): SelectQueryBuilder<Order> {
  return queryBuilder
    .leftJoinAndSelect('order.items', 'item')
    .leftJoinAndSelect('item.product', 'product')
    .leftJoinAndSelect('item.option', 'option');
}

export function readOrderLocale(order: Order): 'ko' | 'en' {
  return (order as Order & { orderLocale?: 'ko' | 'en' }).orderLocale === 'en' ? 'en' : 'ko';
}

export function localizeOrderReadProjection(order: Order, locale?: string): Order {
  if (!locale || locale === 'ko') {
    return order;
  }

  const localizedItems = order.items?.map((item) => {
    const localizedProduct = item.product
      ? applyLocale(item.product, locale, ['name'])
      : item.product;
    const localizedOption = item.option
      ? applyLocale(item.option, locale, ['name', 'value'])
      : item.option;

    return {
      ...item,
      product: localizedProduct,
      option: localizedOption,
      productName: localizedProduct?.name || item.productName,
      optionName: localizedOption
        ? `${localizedOption.name}: ${localizedOption.value}`
        : item.optionName,
    };
  });

  return { ...order, items: localizedItems ?? [] };
}
