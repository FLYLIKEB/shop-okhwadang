import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CartProvider, useCart } from '@/contexts/CartContext';
import { AuthContext } from '@/contexts/AuthContext';
import type { AuthContextValue } from '@/contexts/AuthContext';
import type { CartResponse, CartItem, Product } from '@/lib/api';
import { ReactNode } from 'react';

vi.mock('next-intl', () => ({
  useLocale: () => 'ko',
}));

vi.mock('@/lib/api', () => ({
  cartApi: {
    getList: vi.fn(),
    add: vi.fn(),
    updateQuantity: vi.fn(),
    remove: vi.fn(),
  },
  productsApi: {
    getBulk: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { cartApi, productsApi } from '@/lib/api';
import { toast } from 'sonner';

const mockCartItem: CartItem = {
  id: 1,
  productId: 10,
  productOptionId: null,
  quantity: 2,
  unitPrice: 15000,
  subtotal: 30000,
  product: {
    id: 10,
    name: '테스트 상품',
    slug: 'test-product',
    price: 15000,
    salePrice: null,
    status: 'active',
    images: [],
  },
  option: null,
};

const mockCartResponse: CartResponse = {
  items: [mockCartItem],
  totalAmount: 30000,
  itemCount: 2,
};

function makeAuthValue(overrides?: Partial<AuthContextValue>): AuthContextValue {
  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    loginWithKakao: vi.fn(),
    loginWithGoogle: vi.fn(),
    updateUser: vi.fn(),
    ...overrides,
  };
}

function renderWithAuth(ui: ReactNode, authValue: AuthContextValue) {
  return render(
    <AuthContext.Provider value={authValue}>
      <CartProvider>{ui}</CartProvider>
    </AuthContext.Provider>,
  );
}

function CartDisplay() {
  const { items, itemCount, totalAmount, isLoading } = useCart();
  return (
    <div>
      <span data-testid="loading">{isLoading ? 'loading' : 'idle'}</span>
      <span data-testid="count">{itemCount}</span>
      <span data-testid="total">{totalAmount}</span>
      <ul>
        {items.map((item) => (
          <li key={item.id}>{item.product.name}</li>
        ))}
      </ul>
    </div>
  );
}

function AddItemButton({ params }: { params: Parameters<ReturnType<typeof useCart>['addItem']>[0] }) {
  const { addItem } = useCart();
  return <button onClick={() => addItem(params)}>add</button>;
}

function UpdateQtyButton({ id, quantity }: { id: number; quantity: number }) {
  const { updateQuantity } = useCart();
  return <button onClick={() => updateQuantity(id, quantity)}>update</button>;
}

function RemoveItemButton({ id }: { id: number }) {
  const { removeItem } = useCart();
  return <button onClick={() => void removeItem(id).catch(() => undefined)}>remove</button>;
}

describe('CartContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: {
        request: vi.fn(async (
          _name: string,
          _options: LockOptions,
          callback: () => Promise<unknown>,
        ) => callback()),
      } as unknown as LockManager,
    });
    vi.mocked(productsApi.getBulk).mockImplementation(async (ids) =>
      ids.map((id) => ({
        ...mockCartItem.product,
        id,
        name: `상품 ${id}`,
        slug: `product-${id}`,
        shortDescription: null,
        rating: 0,
        reviewCount: 0,
        isFeatured: false,
        viewCount: 0,
        category: null,
        status: 'active',
        options: [],
      } satisfies Product)),
    );
  });

  it('fetches cart on mount when authenticated', async () => {
    vi.mocked(cartApi.getList).mockResolvedValue(mockCartResponse);
    renderWithAuth(<CartDisplay />, makeAuthValue({ isAuthenticated: true, user: { id: 1, email: 'a@b.com', name: 'Test', role: 'user' } }));

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('2');
    });
    expect(cartApi.getList).toHaveBeenCalledTimes(1);
    expect(cartApi.getList).toHaveBeenCalledWith({ params: { locale: 'ko' } });
    expect(screen.getByText('테스트 상품')).toBeInTheDocument();
  });

  it('does NOT call getList when not authenticated', async () => {
    renderWithAuth(<CartDisplay />, makeAuthValue({ isAuthenticated: false }));
    await act(async () => {});
    expect(cartApi.getList).not.toHaveBeenCalled();
    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  it('addItem calls cartApi.add and updates items', async () => {
    const user = userEvent.setup();
    vi.mocked(cartApi.getList).mockResolvedValue({ items: [], totalAmount: 0, itemCount: 0 });
    vi.mocked(cartApi.add).mockResolvedValue(mockCartResponse);

    renderWithAuth(
      <>
        <CartDisplay />
        <AddItemButton params={{ productId: 10, productOptionId: null, quantity: 2 }} />
      </>,
      makeAuthValue({ isAuthenticated: true, user: { id: 1, email: 'a@b.com', name: 'Test', role: 'user' } }),
    );

    await waitFor(() => expect(cartApi.getList).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: 'add' }));

    await waitFor(() => {
      expect(screen.getByText('테스트 상품')).toBeInTheDocument();
    });
    expect(cartApi.add).toHaveBeenCalledWith(
      { productId: 10, productOptionId: null, quantity: 2 },
      { params: { locale: 'ko' } },
    );
  });

  it('removeItem calls cartApi.remove and removes item from state', async () => {
    const user = userEvent.setup();
    vi.mocked(cartApi.getList).mockResolvedValue(mockCartResponse);
    vi.mocked(cartApi.remove).mockResolvedValue({ message: 'deleted' });

    renderWithAuth(
      <>
        <CartDisplay />
        <RemoveItemButton id={1} />
      </>,
      makeAuthValue({ isAuthenticated: true, user: { id: 1, email: 'a@b.com', name: 'Test', role: 'user' } }),
    );

    await waitFor(() => expect(screen.getByText('테스트 상품')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'remove' }));

    await waitFor(() => {
      expect(screen.queryByText('테스트 상품')).not.toBeInTheDocument();
    });
    expect(cartApi.remove).toHaveBeenCalledWith(1);
  });

  it('keeps the item and refreshes the cart when removal fails', async () => {
    const user = userEvent.setup();
    vi.mocked(cartApi.getList).mockResolvedValue(mockCartResponse);
    vi.mocked(cartApi.remove).mockRejectedValue(new Error('network failure'));

    renderWithAuth(
      <>
        <CartDisplay />
        <RemoveItemButton id={1} />
      </>,
      makeAuthValue({ isAuthenticated: true, user: { id: 1, email: 'a@b.com', name: 'Test', role: 'user' } }),
    );

    await waitFor(() => expect(screen.getByText('테스트 상품')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'remove' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByText('테스트 상품')).toBeInTheDocument();
    expect(cartApi.getList).toHaveBeenCalledTimes(2);
  });

  it('restores a guest item when its projection fails during removal', async () => {
    const user = userEvent.setup();
    localStorage.setItem('guest_cart', JSON.stringify([
      { productId: 10, productOptionId: null, quantity: 2 },
      { productId: 11, productOptionId: null, quantity: 1 },
    ]));

    renderWithAuth(
      <>
        <CartDisplay />
        <RemoveItemButton id={-1} />
      </>,
      makeAuthValue({ isAuthenticated: false }),
    );

    await waitFor(() => expect(screen.getByText('상품 10')).toBeInTheDocument());
    vi.mocked(productsApi.getBulk).mockRejectedValue(new Error('network failure'));

    await user.click(screen.getByRole('button', { name: 'remove' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('장바구니 상품 삭제에 실패했습니다. 다시 시도해 주세요.'));
    expect(JSON.parse(localStorage.getItem('guest_cart') ?? '[]')).toHaveLength(2);
    expect(screen.getByText('상품 10')).toBeInTheDocument();
  });

  it('allows a member deletion to succeed on retry after a failed request', async () => {
    const user = userEvent.setup();
    vi.mocked(cartApi.getList).mockResolvedValue(mockCartResponse);
    vi.mocked(cartApi.remove)
      .mockRejectedValueOnce(new Error('network failure'))
      .mockResolvedValueOnce({ message: 'deleted' });

    renderWithAuth(
      <>
        <CartDisplay />
        <RemoveItemButton id={1} />
      </>,
      makeAuthValue({ isAuthenticated: true, user: { id: 1, email: 'a@b.com', name: 'Test', role: 'user' } }),
    );

    await waitFor(() => expect(screen.getByText('테스트 상품')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'remove' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByText('테스트 상품')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'remove' }));
    await waitFor(() => expect(screen.queryByText('테스트 상품')).not.toBeInTheDocument());
    expect(cartApi.remove).toHaveBeenCalledTimes(2);
  });

  it('reports a localized error when guest deletion cannot acquire its lock', async () => {
    const user = userEvent.setup();
    localStorage.setItem('guest_cart', JSON.stringify([
      { productId: 10, productOptionId: null, quantity: 1 },
      { productId: 11, productOptionId: null, quantity: 1 },
    ]));

    renderWithAuth(
      <>
        <CartDisplay />
        <RemoveItemButton id={-1} />
      </>,
      makeAuthValue({ isAuthenticated: false }),
    );
    await waitFor(() => expect(screen.getByText('상품 10')).toBeInTheDocument());

    Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined });
    await user.click(screen.getByRole('button', { name: 'remove' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('장바구니 상품 삭제에 실패했습니다. 다시 시도해 주세요.'));
    expect(JSON.parse(localStorage.getItem('guest_cart') ?? '[]')).toHaveLength(2);
  });

  it('updateQuantity applies optimistic update', async () => {
    const user = userEvent.setup();
    vi.mocked(cartApi.getList).mockResolvedValue(mockCartResponse);
    vi.mocked(cartApi.updateQuantity).mockResolvedValue({ ...mockCartItem, quantity: 5, subtotal: 75000 });

    renderWithAuth(
      <>
        <CartDisplay />
        <UpdateQtyButton id={1} quantity={5} />
      </>,
      makeAuthValue({ isAuthenticated: true, user: { id: 1, email: 'a@b.com', name: 'Test', role: 'user' } }),
    );

    await waitFor(() => expect(cartApi.getList).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: 'update' }));

    await waitFor(() => {
      expect(cartApi.updateQuantity).toHaveBeenCalledWith(
        1,
        { quantity: 5 },
      );
    });
  });

  it('loads guest cart from localStorage without calling backend', async () => {
    localStorage.setItem('guest_cart', JSON.stringify([{ productId: 10, productOptionId: null, quantity: 3 }]));

    renderWithAuth(<CartDisplay />, makeAuthValue({ isAuthenticated: false }));

    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('3'));
    expect(cartApi.getList).not.toHaveBeenCalled();
    expect(screen.getByTestId('total').textContent).toBe('45000');
  });

  it('guest addItem merges identical product/option and persists localStorage', async () => {
    const user = userEvent.setup();
    localStorage.setItem('guest_cart', JSON.stringify([{ lineId: -1, productId: 10, productOptionId: null, quantity: 1 }]));

    renderWithAuth(
      <>
        <CartDisplay />
        <AddItemButton params={{ productId: 10, productOptionId: null, quantity: 2 }} />
      </>,
      makeAuthValue({ isAuthenticated: false }),
    );

    await user.click(screen.getByRole('button', { name: 'add' }));

    expect(screen.getByTestId('count').textContent).toBe('3');
    expect(JSON.parse(localStorage.getItem('guest_cart') ?? '[]')).toEqual([
      { lineId: -1, productId: 10, productOptionId: null, quantity: 3 },
    ]);
    expect(cartApi.add).not.toHaveBeenCalled();
  });

  it('guest line IDs survive deletion and target the correct remaining row', async () => {
    const user = userEvent.setup();
    vi.mocked(productsApi.getBulk).mockImplementation(async (ids) =>
      ids.map((id) => ({
        ...mockCartItem.product,
        id,
        name: `상품 ${id}`,
        slug: `product-${id}`,
        shortDescription: null,
        rating: 0,
        reviewCount: 0,
        isFeatured: false,
        viewCount: 0,
        category: null,
        status: 'active',
        options: id === 11
          ? [{ id: 7, name: 'Size', value: 'Large', priceAdjustment: 0, stock: 1, sortOrder: 0 }]
          : [],
      } satisfies Product)),
    );
    localStorage.setItem(
      'guest_cart',
      JSON.stringify([
        { lineId: -1, productId: 10, productOptionId: null, quantity: 1 },
        { lineId: -2, productId: 11, productOptionId: 7, quantity: 2 },
      ]),
    );

    renderWithAuth(
      <>
        <CartDisplay />
        <RemoveItemButton id={-1} />
        <UpdateQtyButton id={-2} quantity={4} />
      </>,
      makeAuthValue({ isAuthenticated: false }),
    );

    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('3'));
    await user.click(screen.getByRole('button', { name: 'remove' }));
    expect(JSON.parse(localStorage.getItem('guest_cart') ?? '[]')).toEqual([
      { lineId: -2, productId: 11, productOptionId: 7, quantity: 2 },
    ]);
    await user.click(screen.getByRole('button', { name: 'update' }));
    expect(JSON.parse(localStorage.getItem('guest_cart') ?? '[]')).toEqual([
      { lineId: -2, productId: 11, productOptionId: 7, quantity: 4 },
    ]);
    expect(screen.getByTestId('count').textContent).toBe('4');
    expect(cartApi.updateQuantity).not.toHaveBeenCalled();
    expect(cartApi.remove).not.toHaveBeenCalled();
  });

  it('ignores an older guest projection that resolves after a newer mutation', async () => {
    const user = userEvent.setup();
    let resolveInitial: ((products: Product[]) => void) | undefined;
    let resolveMutation: ((products: Product[]) => void) | undefined;
    vi.mocked(productsApi.getBulk)
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveInitial = resolve;
      }))
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveMutation = resolve;
      }));
    localStorage.setItem(
      'guest_cart',
      JSON.stringify([{ lineId: -1, productId: 10, productOptionId: null, quantity: 1 }]),
    );
    renderWithAuth(
      <>
        <CartDisplay />
        <AddItemButton params={{ productId: 11, productOptionId: null, quantity: 1 }} />
      </>,
      makeAuthValue({ isAuthenticated: false }),
    );

    await user.click(screen.getByRole('button', { name: 'add' }));
    const products = [10, 11].map((id) => ({
      ...mockCartItem.product,
      id,
      name: `상품 ${id}`,
      slug: `product-${id}`,
      shortDescription: null,
      rating: 0,
      reviewCount: 0,
      isFeatured: false,
      viewCount: 0,
      category: null,
      status: 'active' as const,
      options: [],
    } satisfies Product));
    resolveMutation?.(products);
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));

    resolveInitial?.([products[0]]);
    await act(async () => {});
    expect(screen.getByTestId('count').textContent).toBe('2');
    expect(JSON.parse(localStorage.getItem('guest_cart') ?? '[]')).toEqual([
      { lineId: -1, productId: 10, productOptionId: null, quantity: 1 },
      { lineId: -2, productId: 11, productOptionId: null, quantity: 1 },
    ]);
  });

  it('clears stale checkout-visible rows when the latest projection fails', async () => {
    const user = userEvent.setup();
    vi.mocked(productsApi.getBulk)
      .mockResolvedValueOnce([{
        ...mockCartItem.product,
        shortDescription: null,
        rating: 0,
        reviewCount: 0,
        isFeatured: false,
        viewCount: 0,
        category: null,
        status: 'active',
        options: [],
      } satisfies Product])
      .mockRejectedValueOnce(new Error('network'));
    localStorage.setItem(
      'guest_cart',
      JSON.stringify([{ lineId: -1, productId: 10, productOptionId: null, quantity: 1 }]),
    );
    renderWithAuth(
      <>
        <CartDisplay />
        <AddItemButton params={{ productId: 11, productOptionId: null, quantity: 1 }} />
      </>,
      makeAuthValue({ isAuthenticated: false }),
    );
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));

    await user.click(screen.getByRole('button', { name: 'add' }));
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('0'));
    expect(toast.error).toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('guest_cart') ?? '[]')).toEqual([
      { lineId: -1, productId: 10, productOptionId: null, quantity: 1 },
      { lineId: -2, productId: 11, productOptionId: null, quantity: 1 },
    ]);
  });

  it('canonicalizes malformed and duplicate storage without safe-integer underflow', async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      'guest_cart',
      JSON.stringify([
        { lineId: Number.MIN_SAFE_INTEGER, productId: 10, productOptionId: null, quantity: 1 },
        { lineId: -3, productId: 10, productOptionId: null, quantity: 2 },
        { lineId: 4.5, productId: 11, productOptionId: null, quantity: 1 },
        { lineId: -4, productId: 'bad', productOptionId: null, quantity: 1 },
        { lineId: -5, productId: 12, productOptionId: null, quantity: 0 },
      ]),
    );
    renderWithAuth(
      <>
        <CartDisplay />
        <AddItemButton params={{ productId: 12, productOptionId: null, quantity: 1 }} />
      </>,
      makeAuthValue({ isAuthenticated: false }),
    );

    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('4'));
    await user.click(screen.getByRole('button', { name: 'add' }));
    expect(JSON.parse(localStorage.getItem('guest_cart') ?? '[]')).toEqual([
      { lineId: Number.MIN_SAFE_INTEGER, productId: 10, productOptionId: null, quantity: 3 },
      { lineId: -1, productId: 11, productOptionId: null, quantity: 1 },
      { lineId: -2, productId: 12, productOptionId: null, quantity: 1 },
    ]);
  });

  it('merges guest cart into backend cart after auth transition and clears guest storage', async () => {
    const authValue = makeAuthValue({ isAuthenticated: false });
    localStorage.setItem('guest_cart', JSON.stringify([{ lineId: -7, productId: 10, productOptionId: null, quantity: 2 }]));
    vi.mocked(cartApi.add).mockResolvedValue(mockCartResponse);
    vi.mocked(cartApi.getList).mockResolvedValue(mockCartResponse);

    const { rerender } = render(
      <AuthContext.Provider value={authValue}>
        <CartProvider>
          <CartDisplay />
        </CartProvider>
      </AuthContext.Provider>,
    );
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));

    rerender(
      <AuthContext.Provider
        value={makeAuthValue({ isAuthenticated: true, user: { id: 1, email: 'a@b.com', name: 'Test', role: 'user' } })}
      >
        <CartProvider>
          <CartDisplay />
        </CartProvider>
      </AuthContext.Provider>,
    );

    await waitFor(() => expect(cartApi.add).toHaveBeenCalledWith(
      { productId: 10, productOptionId: null, quantity: 2 },
      {
        headers: {
          'Idempotency-Key': expect.stringMatching(/^guest-cart:.+$/),
        },
      },
    ));
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
    expect(localStorage.getItem('guest_cart')).toBeNull();
  });

  it('removes only successful login merges and retries retained failures on re-login', async () => {
    const user = userEvent.setup();
    const guestItems = [
      { lineId: -7, productId: 10, productOptionId: null, quantity: 1 },
      { lineId: -8, productId: 11, productOptionId: null, quantity: 2 },
    ];
    localStorage.setItem('guest_cart', JSON.stringify(guestItems));
    vi.mocked(cartApi.add).mockImplementation(async ({ productId }) => {
      if (productId === 11) throw new Error('temporary failure');
      return mockCartResponse;
    });
    vi.mocked(cartApi.getList).mockResolvedValue(mockCartResponse);
    const guestAuth = makeAuthValue({ isAuthenticated: false });
    const memberAuth = makeAuthValue({
      isAuthenticated: true,
      user: { id: 1, email: 'a@b.com', name: 'Test', role: 'user' },
    });
    const { rerender } = render(
      <AuthContext.Provider value={guestAuth}>
        <CartProvider>
          <CartDisplay />
          <AddItemButton params={{ productId: 11, productOptionId: null, quantity: 1 }} />
        </CartProvider>
      </AuthContext.Provider>,
    );
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('3'));

    rerender(
      <AuthContext.Provider value={memberAuth}>
        <CartProvider>
          <CartDisplay />
          <AddItemButton params={{ productId: 11, productOptionId: null, quantity: 1 }} />
        </CartProvider>
      </AuthContext.Provider>,
    );
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('guest_cart') ?? '[]')).toEqual([
        { lineId: -8, productId: 11, productOptionId: null, quantity: 2 },
      ]);
    });
    expect(toast.error).toHaveBeenCalled();
    expect(cartApi.add).toHaveBeenCalledTimes(2);

    vi.mocked(cartApi.add).mockResolvedValue(mockCartResponse);
    rerender(
      <AuthContext.Provider value={guestAuth}>
        <CartProvider>
          <CartDisplay />
          <AddItemButton params={{ productId: 11, productOptionId: null, quantity: 1 }} />
        </CartProvider>
      </AuthContext.Provider>,
    );
    await waitFor(() => expect(productsApi.getBulk).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: 'add' }));
    expect(JSON.parse(localStorage.getItem('guest_cart') ?? '[]')).toEqual([
      { lineId: -8, productId: 11, productOptionId: null, quantity: 2 },
    ]);
    rerender(
      <AuthContext.Provider value={memberAuth}>
        <CartProvider>
          <CartDisplay />
          <AddItemButton params={{ productId: 11, productOptionId: null, quantity: 1 }} />
        </CartProvider>
      </AuthContext.Provider>,
    );
    await waitFor(() => expect(localStorage.getItem('guest_cart')).toBeNull());
    expect(cartApi.add).toHaveBeenCalledTimes(3);
    expect(vi.mocked(cartApi.add).mock.calls.filter(([payload]) => payload.productId === 10)).toHaveLength(1);
    const retriedCalls = vi.mocked(cartApi.add).mock.calls.filter(([payload]) => payload.productId === 11);
    expect(retriedCalls).toHaveLength(2);
    expect(retriedCalls[0][1]?.headers).toEqual(retriedCalls[1][1]?.headers);
  });

  it('retains every guest line when the whole login merge fails', async () => {
    const guestItems = [
      { lineId: -7, productId: 10, productOptionId: null, quantity: 1 },
      { lineId: -8, productId: 11, productOptionId: null, quantity: 2 },
    ];
    localStorage.setItem('guest_cart', JSON.stringify(guestItems));
    vi.mocked(cartApi.add).mockRejectedValue(new Error('offline'));
    vi.mocked(cartApi.getList).mockResolvedValue(mockCartResponse);
    const { rerender } = render(
      <AuthContext.Provider value={makeAuthValue({ isAuthenticated: false })}>
        <CartProvider><CartDisplay /></CartProvider>
      </AuthContext.Provider>,
    );
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('3'));

    rerender(
      <AuthContext.Provider value={makeAuthValue({
        isAuthenticated: true,
        user: { id: 1, email: 'a@b.com', name: 'Test', role: 'user' },
      })}>
        <CartProvider><CartDisplay /></CartProvider>
      </AuthContext.Provider>,
    );

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('guest_cart') ?? '[]')).toEqual(guestItems);
    });
    expect(toast.error).toHaveBeenCalled();
  });

  it('fails closed and retains guest rows when cross-tab locking is unavailable', async () => {
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: undefined,
    });
    const guestItems = [
      { lineId: -7, productId: 10, productOptionId: null, quantity: 1 },
    ];
    localStorage.setItem('guest_cart', JSON.stringify(guestItems));
    const { rerender } = render(
      <AuthContext.Provider value={makeAuthValue({ isAuthenticated: false })}>
        <CartProvider><CartDisplay /></CartProvider>
      </AuthContext.Provider>,
    );
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));

    rerender(
      <AuthContext.Provider value={makeAuthValue({
        isAuthenticated: true,
        user: { id: 1, email: 'a@b.com', name: 'Test', role: 'user' },
      })}>
        <CartProvider><CartDisplay /></CartProvider>
      </AuthContext.Provider>,
    );

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(cartApi.add).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('guest_cart') ?? '[]')).toEqual(guestItems);
  });

  it('migrates legacy guest rows once and keeps their IDs stable on reload', async () => {
    localStorage.setItem(
      'guest_cart',
      JSON.stringify([
        { productId: 10, productOptionId: null, quantity: 1 },
        { lineId: -1, productId: 11, productOptionId: null, quantity: 2 },
      ]),
    );

    const { unmount } = renderWithAuth(<CartDisplay />, makeAuthValue({ isAuthenticated: false }));
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('3'));
    const migrated = JSON.parse(localStorage.getItem('guest_cart') ?? '[]');
    expect(migrated.map((item: { lineId: number }) => item.lineId)).toEqual([-1, -2]);

    unmount();
    renderWithAuth(<CartDisplay />, makeAuthValue({ isAuthenticated: false }));
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('3'));
    expect(JSON.parse(localStorage.getItem('guest_cart') ?? '[]')).toEqual(migrated);
  });

  it('uses authoritative product option metadata and price for guest rows', async () => {
    const productWithOptions = {
      ...mockCartItem.product,
      shortDescription: null,
      rating: 0,
      reviewCount: 0,
      isFeatured: false,
      viewCount: 0,
      category: null,
      status: 'active' as const,
      options: [{ id: 7, name: 'Size', value: 'Large', priceAdjustment: 500, stock: 1, sortOrder: 0 }],
    };
    vi.mocked(productsApi.getBulk).mockResolvedValue([productWithOptions]);
    localStorage.setItem('guest_cart', JSON.stringify([{ lineId: -1, productId: 10, productOptionId: 7, quantity: 2 }]));

    function OptionDisplay() {
      const { items, totalAmount } = useCart();
      const item = items[0];
      return <span data-testid="option">{`${item?.option?.name}/${item?.option?.value}/${item?.unitPrice}/${item?.subtotal}/${totalAmount}`}</span>;
    }

    renderWithAuth(<OptionDisplay />, makeAuthValue({ isAuthenticated: false }));

    await waitFor(() => {
      expect(screen.getByTestId('option').textContent).toBe('Size/Large/15500/31000/31000');
    });
  });

  it('fails closed instead of pricing a malformed requested guest option', async () => {
    const productWithMalformedOption = {
      ...mockCartItem.product,
      shortDescription: null,
      rating: 0,
      reviewCount: 0,
      isFeatured: false,
      viewCount: 0,
      category: null,
      status: 'active' as const,
      options: [{ id: 7, name: 'Size', value: 'Large', priceAdjustment: '500' as never, stock: 1, sortOrder: 0 }],
    };
    vi.mocked(productsApi.getBulk).mockResolvedValue([productWithMalformedOption]);
    localStorage.setItem('guest_cart', JSON.stringify([{ lineId: -1, productId: 10, productOptionId: 7, quantity: 2 }]));

    function OptionDisplay() {
      const { items, isLoading } = useCart();
      return <span data-testid="option">{`${items.length}/${isLoading ? 'loading' : 'idle'}`}</span>;
    }

    renderWithAuth(<OptionDisplay />, makeAuthValue({ isAuthenticated: false }));

    await waitFor(() => {
      expect(screen.getByTestId('option').textContent).toBe('0/idle');
    });
    expect(toast.error).toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('guest_cart') ?? '[]')).toEqual([
      { lineId: -1, productId: 10, productOptionId: 7, quantity: 2 },
    ]);
  });
});
