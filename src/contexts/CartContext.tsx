'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  ReactNode,
} from 'react';
import { toast } from 'sonner';
import { cartApi, CartItem, CartResponse, RequestOptions } from '@/lib/api';
import { useAuth } from './AuthContext';

const GUEST_CART_KEY = 'guest_cart';

interface GuestCartItem {
  productId: number;
  productOptionId: number | null;
  quantity: number;
}

interface AddCartItemParams {
  productId: number;
  productOptionId: number | null;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  totalAmount: number;
  isLoading: boolean;
  addItem: (params: AddCartItemParams) => Promise<void>;
  updateQuantity: (id: number, quantity: number) => Promise<void>;
  removeItem: (id: number) => Promise<void>;
  refetch: () => Promise<void>;
}

export const CartContext = createContext<CartContextValue | null>(null);

function loadGuestCart(): GuestCartItem[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    return raw ? (JSON.parse(raw) as GuestCartItem[]) : [];
  } catch {
    return [];
  }
}

function saveGuestCart(items: GuestCartItem[]): void {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

function clearGuestCart(): void {
  localStorage.removeItem(GUEST_CART_KEY);
}

function guestCartToCartResponse(items: GuestCartItem[]): CartResponse {
  const cartItems: CartItem[] = items.map((item, index) => ({
    id: -(index + 1), // 음수 id로 서버 항목과 구분
    productId: item.productId,
    productOptionId: item.productOptionId,
    quantity: item.quantity,
    unitPrice: 0,
    subtotal: 0,
    product: { id: item.productId, name: '', slug: '', price: 0, salePrice: null, status: '', images: [] },
    option: null,
  }));
  return {
    items: cartItems,
    totalAmount: 0,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const [cartData, setCartData] = useState<CartResponse>({
    items: [],
    totalAmount: 0,
    itemCount: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const prevAuthRef = useRef<boolean | null>(null);

  const authHeaders = useMemo<RequestOptions | undefined>(
    () => (token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
    [token],
  );

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setCartData(guestCartToCartResponse(loadGuestCart()));
      return;
    }
    setIsLoading(true);
    try {
      const data = await cartApi.getList({ headers: { Authorization: `Bearer ${token}` } });
      setCartData(data);
    } catch {
      // silent — cart load failure should not block the UI
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    const wasAuthenticated = prevAuthRef.current;
    prevAuthRef.current = isAuthenticated;

    if (!isAuthenticated || !token) {
      // 비로그인: 게스트 카트 표시
      setCartData(guestCartToCartResponse(loadGuestCart()));
      return;
    }

    const headers: RequestOptions = { headers: { Authorization: `Bearer ${token}` } };

    void (async () => {
      // 비로그인 → 로그인 전환 시 게스트 카트 병합
      if (wasAuthenticated === false) {
        const guestItems = loadGuestCart();
        if (guestItems.length > 0) {
          await Promise.allSettled(guestItems.map((item) => cartApi.add(item, headers)));
          clearGuestCart();
        }
      }

      setIsLoading(true);
      try {
        const data = await cartApi.getList(headers);
        setCartData(data);
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isAuthenticated, token]);

  const addItem = useCallback(
    async (params: AddCartItemParams) => {
      if (!authHeaders) {
        // 게스트: localStorage에 저장
        const guestItems = loadGuestCart();
        const existing = guestItems.find(
          (i) => i.productId === params.productId && i.productOptionId === params.productOptionId,
        );
        if (existing) {
          existing.quantity += params.quantity;
        } else {
          guestItems.push(params);
        }
        saveGuestCart(guestItems);
        setCartData(guestCartToCartResponse(guestItems));
        return;
      }
      const data = await cartApi.add(params, authHeaders);
      setCartData(data);
    },
    [authHeaders],
  );

  const updateQuantity = useCallback(
    async (id: number, quantity: number) => {
      if (!authHeaders) {
        // 게스트: localStorage 업데이트 (id는 음수 인덱스)
        const guestItems = loadGuestCart();
        const index = -(id + 1);
        if (guestItems[index]) {
          guestItems[index].quantity = quantity;
          saveGuestCart(guestItems);
        }
        setCartData(guestCartToCartResponse(guestItems));
        return;
      }
      // optimistic update
      setCartData((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === id ? { ...item, quantity, subtotal: item.unitPrice * quantity } : item,
        ),
        totalAmount: prev.items.reduce(
          (sum, item) => sum + (item.id === id ? item.unitPrice * quantity : item.subtotal),
          0,
        ),
      }));
      try {
        await cartApi.updateQuantity(id, { quantity }, authHeaders);
      } catch {
        toast.error('수량 변경에 실패했습니다.');
        await fetchCart(); // rollback
      }
    },
    [authHeaders, fetchCart],
  );

  const removeItem = useCallback(
    async (id: number) => {
      if (!authHeaders) {
        // 게스트: localStorage에서 제거 (id는 음수 인덱스)
        const guestItems = loadGuestCart();
        const index = -(id + 1);
        guestItems.splice(index, 1);
        saveGuestCart(guestItems);
        setCartData(guestCartToCartResponse(guestItems));
        toast.success('삭제되었습니다.');
        return;
      }
      await cartApi.remove(id, authHeaders);
      setCartData((prev) => {
        const items = prev.items.filter((item) => item.id !== id);
        const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
        const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
        return { items, totalAmount, itemCount };
      });
      toast.success('삭제되었습니다.');
    },
    [authHeaders],
  );

  return (
    <CartContext.Provider
      value={{
        items: cartData.items,
        itemCount: cartData.itemCount,
        totalAmount: cartData.totalAmount,
        isLoading,
        addItem,
        updateQuantity,
        removeItem,
        refetch: fetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
