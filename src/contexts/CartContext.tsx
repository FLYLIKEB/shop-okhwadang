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
import * as api from '@/lib/api';
import type { CartItem, CartResponse, Product, ProductOption } from '@/lib/api';
import { useAuth } from './AuthContext';
import { handleApiError } from '@/utils/error';
import { toastMessage } from '@/utils/toastMessages';

const GUEST_CART_KEY = 'guest_cart';
const GUEST_CART_CURSOR_KEY = 'guest_cart_next_line_id';
const GUEST_CART_OPERATIONS_KEY = 'guest_cart_merge_operations';

interface GuestMergeOperation {
  id: string;
  pending: boolean;
}

interface GuestCartItem {
  lineId: number;
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

function allocateGuestLineId(usedLineIds: ReadonlySet<number>): number {
  for (let candidate = -1; candidate >= Number.MIN_SAFE_INTEGER; candidate -= 1) {
    if (!usedLineIds.has(candidate)) return candidate;
    if (candidate === Number.MIN_SAFE_INTEGER) break;
  }
  throw new Error('guest_cart_line_id_exhausted');
}

function isGuestCartItem(value: unknown): value is Omit<GuestCartItem, 'lineId'> & { lineId?: unknown } {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return Number.isSafeInteger(item.productId)
    && Number(item.productId) > 0
    && (item.productOptionId === null
      || (Number.isSafeInteger(item.productOptionId) && Number(item.productOptionId) > 0))
    && Number.isSafeInteger(item.quantity)
    && Number(item.quantity) > 0;
}

function loadGuestCart(): GuestCartItem[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    const validItems = parsed.filter(isGuestCartItem);
    const coalesced = new Map<string, Omit<GuestCartItem, 'lineId'> & { lineId?: unknown }>();
    for (const item of validItems) {
      const key = `${item.productId}:${item.productOptionId ?? 'none'}`;
      const existing = coalesced.get(key);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        coalesced.set(key, { ...item });
      }
    }
    const items = [...coalesced.values()];
    const usedLineIds = new Set<number>();
    let migrated = validItems.length !== parsed.length || items.length !== validItems.length;
    const normalized: GuestCartItem[] = items.map((item) => {
      if (
        typeof item?.lineId === 'number'
        && Number.isSafeInteger(item.lineId)
        && item.lineId < 0
        && !usedLineIds.has(item.lineId)
      ) {
        usedLineIds.add(item.lineId);
        return { ...item, lineId: item.lineId };
      }

      const lineId = allocateGuestLineId(usedLineIds);
      usedLineIds.add(lineId);
      migrated = true;
      return { ...item, lineId };
    });

    if (migrated || JSON.stringify(normalized) !== JSON.stringify(parsed)) {
      saveGuestCart(normalized);
    }
    return normalized;
  } catch {
    return [];
  }
}

function saveGuestCart(items: GuestCartItem[]) {
  if (items.length === 0) {
  localStorage.removeItem(GUEST_CART_KEY);
    localStorage.removeItem(GUEST_CART_CURSOR_KEY);
    localStorage.removeItem(GUEST_CART_OPERATIONS_KEY);
    return;
}
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  const minimumLineId = Math.min(...items.map((item) => item.lineId));
  const storedCursor = Number(localStorage.getItem(GUEST_CART_CURSOR_KEY));
  const nextCursor = Number.isSafeInteger(storedCursor) && storedCursor < minimumLineId
    ? storedCursor
    : minimumLineId > Number.MIN_SAFE_INTEGER
      ? minimumLineId - 1
      : Number.MIN_SAFE_INTEGER;
  localStorage.setItem(GUEST_CART_CURSOR_KEY, String(nextCursor));

  const lineIds = new Set(items.map((item) => String(item.lineId)));
  const operations = loadGuestMergeOperations();
  const retainedOperations = Object.fromEntries(
    Object.entries(operations).filter(([lineId]) => lineIds.has(lineId)),
  );
  saveGuestMergeOperations(retainedOperations);
}

function clearGuestCart() {
  localStorage.removeItem(GUEST_CART_KEY);
  localStorage.removeItem(GUEST_CART_CURSOR_KEY);
  localStorage.removeItem(GUEST_CART_OPERATIONS_KEY);
}

function loadGuestMergeOperations(): Record<string, GuestMergeOperation> {
  try {
    const raw = localStorage.getItem(GUEST_CART_OPERATIONS_KEY);
    const parsed = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, operation]) => {
        if (!operation || typeof operation !== 'object') return false;
        const value = operation as Partial<GuestMergeOperation>;
        return typeof value.id === 'string'
          && value.id.length > 0
          && typeof value.pending === 'boolean';
      }),
    ) as Record<string, GuestMergeOperation>;
  } catch {
    return {};
}
}

function saveGuestMergeOperations(operations: Record<string, GuestMergeOperation>) {
  if (Object.keys(operations).length === 0) {
    localStorage.removeItem(GUEST_CART_OPERATIONS_KEY);
    return;
}
  localStorage.setItem(GUEST_CART_OPERATIONS_KEY, JSON.stringify(operations));
}

function allocatePersistedGuestLineId(usedLineIds: ReadonlySet<number>): number {
  const storedCursor = Number(localStorage.getItem(GUEST_CART_CURSOR_KEY));
  let candidate = Number.isSafeInteger(storedCursor) && storedCursor < 0 ? storedCursor : -1;
  if (candidate === Number.MIN_SAFE_INTEGER && usedLineIds.has(candidate)) {
    candidate = -1;
  }
  while (usedLineIds.has(candidate) && candidate > Number.MIN_SAFE_INTEGER) {
    candidate -= 1;
}
  if (usedLineIds.has(candidate)) throw new Error('guest_cart_line_id_exhausted');
  const nextCursor = candidate > Number.MIN_SAFE_INTEGER ? candidate - 1 : Number.MIN_SAFE_INTEGER;
  localStorage.setItem(GUEST_CART_CURSOR_KEY, String(nextCursor));
  return candidate;
}

async function withGuestCartLock<T>(work: () => Promise<T>): Promise<T> {
  if (!navigator.locks) {
    throw new Error('guest_cart_lock_unavailable');
  }
  return navigator.locks.request('guest-cart-storage', { mode: 'exclusive' }, work);
}

async function guestCartToCartResponse(items: GuestCartItem[], locale: string): Promise<CartResponse> {
  const ids = [...new Set(items.map((item) => item.productId))];
  const productApi = 'productsApi' in api ? api.productsApi : null;
  const products: Array<Product & { options?: ProductOption[] }> = ids.length > 0 && productApi
    ? await productApi.getBulk(ids, locale)
    : [];
  const productMap = new Map(products.map((product) => [product.id, product]));

  const cartItems: CartItem[] = items.map((item) => {
    const product = productMap.get(item.productId);
    const option = product?.options?.find(
      (candidate) =>
        candidate.id === item.productOptionId
        && typeof candidate.name === 'string'
        && typeof candidate.value === 'string'
        && typeof candidate.priceAdjustment === 'number'
        && Number.isFinite(candidate.priceAdjustment),
    );
    if (!product || (item.productOptionId !== null && !option)) {
      throw new Error('guest_cart_product_unavailable');
    }
    const priceAdjustment = option ? Number(option.priceAdjustment) : 0;
    const rawBasePrice = product.salePrice ?? product.price;
    if (typeof rawBasePrice !== 'number' || !Number.isFinite(rawBasePrice)) {
      throw new Error('guest_cart_product_price_invalid');
    }
    const basePrice = rawBasePrice;
    const unitPrice = basePrice + priceAdjustment;

    return {
      id: item.lineId,
      productId: item.productId,
      productOptionId: item.productOptionId,
      quantity: item.quantity,
      unitPrice,
      subtotal: unitPrice * item.quantity,
      product: {
        id: item.productId,
        name: product?.name ?? '',
        slug: product?.slug ?? '',
        price: Number(product.price),
        salePrice: product.salePrice === null ? null : Number(product.salePrice),
        status: product.status,
        isFreeShipping: product?.isFreeShipping,
        images: product?.images ?? [],
      },
      option: option
        ? {
          id: option.id,
          name: option.name,
          value: option.value,
          priceAdjustment,
        }
        : null,
    };
  });

  return {
    items: cartItems,
    totalAmount: cartItems.reduce((sum, item) => sum + item.subtotal, 0),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
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
  const guestProjectionGenerationRef = useRef(0);
  const guestMergePromiseRef = useRef<Promise<void> | null>(null);

  const projectGuestCart = useCallback(
    async (items: GuestCartItem[]) => {
      const generation = ++guestProjectionGenerationRef.current;
      setIsLoading(true);
      try {
        const data = await guestCartToCartResponse(items, locale);
        if (generation === guestProjectionGenerationRef.current) {
          setCartData(data);
        }
      } catch {
        if (generation === guestProjectionGenerationRef.current) {
          setCartData({ items: [], totalAmount: 0, itemCount: 0 });
          toast.error(toastMessage('cartLoadError'));
        }
      } finally {
        if (generation === guestProjectionGenerationRef.current) {
          setIsLoading(false);
        }
      }
    },
    [locale],
  );

  const mergeGuestCart = useCallback(async () => {
    if (guestMergePromiseRef.current) {
      await guestMergePromiseRef.current;
      return;
    }
    const merge = async () => {
      const guestItems = loadGuestCart();
      if (guestItems.length === 0) return;
      const operations = loadGuestMergeOperations();
      for (const item of guestItems) {
        operations[item.lineId] ??= {
          id: globalThis.crypto.randomUUID(),
          pending: false,
        };
        operations[item.lineId].pending = true;
      }
      saveGuestMergeOperations(operations);
      const results = await Promise.allSettled(
        guestItems.map(({ lineId, productId, productOptionId, quantity }) =>
          api.cartApi.add(
            { productId, productOptionId, quantity },
            { headers: { 'Idempotency-Key': `guest-cart:${operations[lineId].id}` } },
          ),
        ),
      );
      const currentItems = loadGuestCart();
      const originalOperationIds = new Set(
        guestItems.map((item) => operations[item.lineId].id),
      );
      const failedOperationIds = new Set(
        guestItems
          .filter((_, index) => results[index].status === 'rejected')
          .map((item) => operations[item.lineId].id),
      );
      const currentOperations = loadGuestMergeOperations();
      const retainedItems = currentItems.filter((item) => {
        const operation = currentOperations[item.lineId];
        return !operation
          || !originalOperationIds.has(operation.id)
          || failedOperationIds.has(operation.id);
      });
      if (retainedItems.length === 0) {
        clearGuestCart();
        return;
      }
      for (const item of retainedItems) {
        if (
          currentOperations[item.lineId]
          && failedOperationIds.has(currentOperations[item.lineId].id)
        ) {
          currentOperations[item.lineId].pending = true;
        }
      }
      saveGuestMergeOperations(
        Object.fromEntries(
          retainedItems
            .filter((item) => currentOperations[item.lineId])
            .map((item) => [item.lineId, currentOperations[item.lineId]]),
        ),
      );
      saveGuestCart(retainedItems);
      if (failedOperationIds.size > 0) {
        toast.error(toastMessage('guestCartMergeError'));
      }
    };
    guestMergePromiseRef.current = withGuestCartLock(merge).catch(() => {
      toast.error(toastMessage('guestCartMergeError'));
    }).finally(() => {
      guestMergePromiseRef.current = null;
    });
    await guestMergePromiseRef.current;
  }, []);

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) {
      await projectGuestCart(loadGuestCart());
      return;
    }
    setIsLoading(true);
    try {
      const data = await api.cartApi.getList({ params: { locale } });
      setCartData(data);
    } catch {
      // silent — cart load failure should not block the UI
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, locale, projectGuestCart]);

  useEffect(() => {
    let mounted = true;
    const wasAuthenticated = prevAuthRef.current;
    prevAuthRef.current = isAuthenticated;

    if (!isAuthenticated) {
      void projectGuestCart(loadGuestCart());
      return;
    }

    guestProjectionGenerationRef.current += 1;
    void (async () => {
      if (wasAuthenticated === false) {
        await mergeGuestCart();
      }

      setIsLoading(true);
      try {
        const data = await api.cartApi.getList({ params: { locale } });
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
  }, [isAuthenticated, locale, mergeGuestCart, projectGuestCart]);

  const addItem = useCallback(
    async (params: AddCartItemParams) => {
      if (!isAuthenticated) {
        await withGuestCartLock(async () => {
          const guestItems = loadGuestCart();
          const existing = guestItems.find(
            (i) => i.productId === params.productId && i.productOptionId === params.productOptionId,
          );
          if (existing) {
            if (loadGuestMergeOperations()[existing.lineId]?.pending) {
              toast.error(toastMessage('guestCartPendingMergeError'));
              return;
            }
            existing.quantity += params.quantity;
          } else {
            const lineId = allocatePersistedGuestLineId(
              new Set(guestItems.map((item) => item.lineId)),
            );
            guestItems.push({ ...params, lineId });
          }
          saveGuestCart(guestItems);
          await projectGuestCart(guestItems);
        });
        return;
      }
      const data = await api.cartApi.add(params, { params: { locale } });
      setCartData(data);
    },
    [isAuthenticated, locale, projectGuestCart],
  );

  const updateQuantity = useCallback(
    async (id: number, quantity: number) => {
      if (!isAuthenticated) {
        await withGuestCartLock(async () => {
          const guestItems = loadGuestCart();
          const item = guestItems.find((guestItem) => guestItem.lineId === id);
          if (item) {
            if (loadGuestMergeOperations()[item.lineId]?.pending) {
              toast.error(toastMessage('guestCartPendingMergeError'));
              return;
            }
            item.quantity = quantity;
            saveGuestCart(guestItems);
          }
          await projectGuestCart(guestItems);
        });
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
        await api.cartApi.updateQuantity(id, { quantity });
      } catch (err) {
        toast.error(handleApiError(err, toastMessage('cartQuantityUpdateError')));
        await fetchCart();
      }
    },
    [isAuthenticated, fetchCart, projectGuestCart],
  );

  const removeItem = useCallback(
    async (id: number) => {
      if (!isAuthenticated) {
        const removed = await withGuestCartLock(async () => {
          const guestItems = loadGuestCart();
          const index = guestItems.findIndex((item) => item.lineId === id);
          if (
            index >= 0
            && loadGuestMergeOperations()[guestItems[index].lineId]?.pending
          ) {
            toast.error(toastMessage('guestCartPendingMergeError'));
            return false;
          }
          if (index >= 0) guestItems.splice(index, 1);
          saveGuestCart(guestItems);
          await projectGuestCart(guestItems);
          return index >= 0;
        });
        if (removed) toast.success(toastMessage('deleted'));
        return;
      }
      await api.cartApi.remove(id);
      setCartData((prev) => {
        const items = prev.items.filter((item) => item.id !== id);
        const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
        const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
        return { items, totalAmount, itemCount };
      });
      toast.success(toastMessage('deleted'));
    },
    [isAuthenticated, projectGuestCart],
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
