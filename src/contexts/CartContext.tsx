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
import { useLocale } from 'next-intl';
import { cartApi, CartItem, CartResponse } from '@/lib/api';
import { useAuth } from './AuthContext';
import { handleApiError } from '@/utils/error';

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
    id: -(index + 1),
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
  const locale = useLocale();
  const { isAuthenticated } = useAuth();
  const [cartData, setCartData] = useState<CartResponse>({
    items: [],
    totalAmount: 0,
    itemCount: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const prevAuthRef = useRef<boolean | null>(null);

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCartData(guestCartToCartResponse(loadGuestCart()));
      return;
    }
    setIsLoading(true);
    try {
      const data = await cartApi.getList({ params: { locale } });
      setCartData(data);
    } catch {
      // silent — cart load failure should not block the UI
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, locale]);

  useEffect(() => {
    let mounted = true;
    const wasAuthenticated = prevAuthRef.current;
    prevAuthRef.current = isAuthenticated;

    if (!isAuthenticated) {
      if (mounted) setCartData(guestCartToCartResponse(loadGuestCart()));
      return;
    }

    void (async () => {
      if (wasAuthenticated === false) {
        const guestItems = loadGuestCart();
        if (guestItems.length > 0) {
          await Promise.allSettled(guestItems.map((item) => cartApi.add(item)));
          clearGuestCart();
        }
      }

      setIsLoading(true);
      try {
        const data = await cartApi.getList({ params: { locale } });
        if (mounted) setCartData(data);
      } catch {
        // silent
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, locale]);

  const addItem = useCallback(
    async (params: AddCartItemParams) => {
      if (!isAuthenticated) {
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
      const data = await cartApi.add(params, { params: { locale } });
      setCartData(data);
    },
    [isAuthenticated, locale],
  );

  const updateQuantity = useCallback(
    async (id: number, quantity: number) => {
      if (!isAuthenticated) {
        const guestItems = loadGuestCart();
        const index = -(id + 1);
        if (guestItems[index]) {
          guestItems[index].quantity = quantity;
          saveGuestCart(guestItems);
        }
        setCartData(guestCartToCartResponse(guestItems));
        return;
      }
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
        await cartApi.updateQuantity(id, { quantity });
      } catch (err) {
        toast.error(handleApiError(err, '수량 변경에 실패했습니다.'));
        await fetchCart();
      }
    },
    [isAuthenticated, fetchCart],
  );

  const removeItem = useCallback(
    async (id: number) => {
      if (!isAuthenticated) {
        const guestItems = loadGuestCart();
        const index = -(id + 1);
        guestItems.splice(index, 1);
        saveGuestCart(guestItems);
        setCartData(guestCartToCartResponse(guestItems));
        toast.success('삭제되었습니다.');
        return;
      }
      await cartApi.remove(id);
      setCartData((prev) => {
        const items = prev.items.filter((item) => item.id !== id);
        const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
        const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
        return { items, totalAmount, itemCount };
      });
      toast.success('삭제되었습니다.');
    },
    [isAuthenticated],
  );

  const value = useMemo(
    () => ({
      items: cartData.items,
      itemCount: cartData.itemCount,
      totalAmount: cartData.totalAmount,
      isLoading,
      addItem,
      updateQuantity,
      removeItem,
      refetch: fetchCart,
    }),
    [cartData.items, cartData.itemCount, cartData.totalAmount, isLoading, addItem, updateQuantity, removeItem, fetchCart],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
