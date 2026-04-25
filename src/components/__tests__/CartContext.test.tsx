import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CartProvider, useCart } from '@/contexts/CartContext';
import { AuthContext } from '@/contexts/AuthContext';
import type { AuthContextValue } from '@/contexts/AuthContext';
import type { CartResponse, CartItem } from '@/lib/api';
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
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { cartApi } from '@/lib/api';

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
  return <button onClick={() => removeItem(id)}>remove</button>;
}

describe('CartContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
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
    expect(screen.getByTestId('total').textContent).toBe('0');
  });

  it('guest addItem merges identical product/option and persists localStorage', async () => {
    const user = userEvent.setup();
    localStorage.setItem('guest_cart', JSON.stringify([{ productId: 10, productOptionId: null, quantity: 1 }]));

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
      { productId: 10, productOptionId: null, quantity: 3 },
    ]);
    expect(cartApi.add).not.toHaveBeenCalled();
  });

  it('guest updateQuantity and removeItem update localStorage by negative guest id', async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      'guest_cart',
      JSON.stringify([
        { productId: 10, productOptionId: null, quantity: 1 },
        { productId: 11, productOptionId: 7, quantity: 2 },
      ]),
    );

    renderWithAuth(
      <>
        <CartDisplay />
        <UpdateQtyButton id={-1} quantity={4} />
        <RemoveItemButton id={-2} />
      </>,
      makeAuthValue({ isAuthenticated: false }),
    );

    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('3'));
    await user.click(screen.getByRole('button', { name: 'update' }));
    expect(JSON.parse(localStorage.getItem('guest_cart') ?? '[]')[0].quantity).toBe(4);
    expect(screen.getByTestId('count').textContent).toBe('6');

    await user.click(screen.getByRole('button', { name: 'remove' }));
    expect(JSON.parse(localStorage.getItem('guest_cart') ?? '[]')).toEqual([
      { productId: 10, productOptionId: null, quantity: 4 },
    ]);
    expect(screen.getByTestId('count').textContent).toBe('4');
    expect(cartApi.updateQuantity).not.toHaveBeenCalled();
    expect(cartApi.remove).not.toHaveBeenCalled();
  });

  it('merges guest cart into backend cart after auth transition and clears guest storage', async () => {
    const authValue = makeAuthValue({ isAuthenticated: false });
    localStorage.setItem('guest_cart', JSON.stringify([{ productId: 10, productOptionId: null, quantity: 2 }]));
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

    await waitFor(() => expect(cartApi.add).toHaveBeenCalledWith({ productId: 10, productOptionId: null, quantity: 2 }));
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
    expect(localStorage.getItem('guest_cart')).toBeNull();
  });
});
