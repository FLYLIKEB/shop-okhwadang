import { Order } from '../entities/order.entity';
import {
  localizeOrderReadProjection,
  readOrderLocale,
} from '../order-read-projection.util';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 11,
    orderNumber: 'ORD-20260722-ABCDE',
    userId: 1,
    orderLocale: 'ko',
    items: [
      {
        productName: '기본 상품명',
        optionName: '색상: 빨강',
        product: {
          name: '기본 상품명',
          nameEn: 'English Product',
        },
        option: {
          name: '색상',
          nameEn: 'Color',
          value: '빨강',
          valueEn: 'Red',
        },
      },
    ],
    ...overrides,
  } as Order;
}

describe('order read projection', () => {
  it('returns the original order reference for korean locale', () => {
    const order = makeOrder();

    expect(localizeOrderReadProjection(order, 'ko')).toBe(order);
    expect(localizeOrderReadProjection(order)).toBe(order);
  });

  it('projects equivalent member and guest item names for english locale', () => {
    const memberOrder = makeOrder({ userId: 7 });
    const guestOrder = makeOrder({ userId: null });

    const memberProjection = localizeOrderReadProjection(memberOrder, 'en');
    const guestProjection = localizeOrderReadProjection(guestOrder, 'en');

    expect(memberProjection.items[0].product?.name).toBe('English Product');
    expect(memberProjection.items[0].productName).toBe('English Product');
    expect(memberProjection.items[0].option?.name).toBe('Color');
    expect(memberProjection.items[0].option?.value).toBe('Red');
    expect(memberProjection.items[0].optionName).toBe('Color: Red');
    expect(guestProjection.items[0]).toMatchObject({
      productName: memberProjection.items[0].productName,
      optionName: memberProjection.items[0].optionName,
      product: { name: memberProjection.items[0].product?.name },
      option: {
        name: memberProjection.items[0].option?.name,
        value: memberProjection.items[0].option?.value,
      },
    });
  });

  it('falls back to korean snapshot fields when english fields are blank', () => {
    const order = makeOrder({
      items: [
        {
          productName: '저장 상품명',
          optionName: '저장 옵션명',
          product: { name: '상품명', nameEn: '' },
          option: { name: '옵션', nameEn: null, value: '기본', valueEn: undefined },
        },
      ],
    } as unknown as Partial<Order>);

    const projection = localizeOrderReadProjection(order, 'en');

    expect(projection.items[0].product?.name).toBe('상품명');
    expect(projection.items[0].productName).toBe('상품명');
    expect(projection.items[0].option?.name).toBe('옵션');
    expect(projection.items[0].option?.value).toBe('기본');
    expect(projection.items[0].optionName).toBe('옵션: 기본');
  });

  it('preserves stored item names when product or option relations are null', () => {
    const order = makeOrder({
      items: [
        {
          productName: '저장된 상품명',
          optionName: '저장된 옵션명',
          product: null,
          option: null,
        },
      ],
    } as unknown as Partial<Order>);

    const projection = localizeOrderReadProjection(order, 'en');

    expect(projection.items[0].product).toBeNull();
    expect(projection.items[0].option).toBeNull();
    expect(projection.items[0].productName).toBe('저장된 상품명');
    expect(projection.items[0].optionName).toBe('저장된 옵션명');
  });

  it('uses the order locale default for guest projections', () => {
    expect(readOrderLocale(makeOrder({ orderLocale: 'en' }))).toBe('en');
    expect(readOrderLocale(makeOrder({ orderLocale: 'ko' }))).toBe('ko');
    expect(readOrderLocale(makeOrder({ orderLocale: undefined } as unknown as Partial<Order>))).toBe('ko');
  });
});
