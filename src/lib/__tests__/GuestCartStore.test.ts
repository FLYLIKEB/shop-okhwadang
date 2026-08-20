import { beforeEach, describe, expect, it, vi } from 'vitest';
import { guestCartStore } from '@/lib/GuestCartStore';
import { cartApi, productsApi } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  cartApi: { add: vi.fn() },
  productsApi: { getBulk: vi.fn() },
}));

describe('GuestCartStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: {
        request: vi.fn(async (_name: string, _options: LockOptions, callback: () => Promise<unknown>) => callback()),
      } as unknown as LockManager,
    });
  });

  it('migrates malformed and duplicate rows while keeping negative IDs stable', () => {
    localStorage.setItem('guest_cart', JSON.stringify([
      { lineId: -7, productId: 10, productOptionId: null, quantity: 1 },
      { lineId: -9, productId: 10, productOptionId: null, quantity: 2 },
      { lineId: 3.5, productId: 11, productOptionId: null, quantity: 1 },
      { productId: 'bad', productOptionId: null, quantity: 99 },
    ]));

    expect(guestCartStore.load()).toEqual([
      { lineId: -7, productId: 10, productOptionId: null, quantity: 3 },
      { lineId: -1, productId: 11, productOptionId: null, quantity: 1 },
    ]);
    expect(guestCartStore.load()).toEqual([
      { lineId: -7, productId: 10, productOptionId: null, quantity: 3 },
      { lineId: -1, productId: 11, productOptionId: null, quantity: 1 },
    ]);
  });

  it('serializes mutations through the browser lock and fails closed when unavailable', async () => {
    const order: string[] = [];
    await Promise.all([
      guestCartStore.withLock(async () => { order.push('first'); }),
      guestCartStore.withLock(async () => { order.push('second'); }),
    ]);
    expect(order).toEqual(['first', 'second']);

    Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined });
    await expect(guestCartStore.withLock(async () => undefined)).rejects.toThrow('guest_cart_lock_unavailable');
  });

  it('retains failed merge rows and reuses idempotency keys on retry', async () => {
    localStorage.setItem('guest_cart', JSON.stringify([
      { lineId: -1, productId: 10, productOptionId: null, quantity: 1 },
      { lineId: -2, productId: 11, productOptionId: 7, quantity: 2 },
    ]));
    vi.mocked(cartApi.add).mockImplementation(async ({ productId }) => {
      if (productId === 11) throw new Error('temporary');
      return {} as never;
    });

    await expect(guestCartStore.merge()).resolves.toEqual({ failed: true });
    expect(JSON.parse(localStorage.getItem('guest_cart') ?? '[]')).toEqual([
      { lineId: -2, productId: 11, productOptionId: 7, quantity: 2 },
    ]);
    const firstRetryKey = new Headers(vi.mocked(cartApi.add).mock.calls[1][1]?.headers).get('Idempotency-Key');

    vi.mocked(cartApi.add).mockResolvedValue({} as never);
    await expect(guestCartStore.merge()).resolves.toEqual({ failed: false });
    const secondRetryKey = new Headers(vi.mocked(cartApi.add).mock.calls[2][1]?.headers).get('Idempotency-Key');
    expect(firstRetryKey).toBe(secondRetryKey);
    expect(localStorage.getItem('guest_cart')).toBeNull();
  });

  it('fails closed when the requested product option is missing', async () => {
    vi.mocked(productsApi.getBulk).mockResolvedValue([{
      id: 10,
      name: 'Product',
      slug: 'product',
      price: 100,
      salePrice: null,
      status: 'active',
      images: [],
      options: [],
    }] as never);
    await expect(guestCartStore.project([
      { lineId: -1, productId: 10, productOptionId: 7, quantity: 1 },
    ], 'ko')).rejects.toThrow('guest_cart_product_unavailable');
  });
});
