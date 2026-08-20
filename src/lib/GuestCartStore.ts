'use client';

import * as api from '@/lib/api';
import type { CartItem, CartResponse, Product, ProductOption } from '@/lib/api';

const GUEST_CART_KEY = 'guest_cart';
const GUEST_CART_CURSOR_KEY = 'guest_cart_next_line_id';
const GUEST_CART_OPERATIONS_KEY = 'guest_cart_merge_operations';

interface GuestMergeOperation {
  id: string;
  pending: boolean;
}

export interface GuestCartItem {
  lineId: number;
  productId: number;
  productOptionId: number | null;
  quantity: number;
}

export interface GuestCartItemParams {
  productId: number;
  productOptionId: number | null;
  quantity: number;
}

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



export class GuestCartStore {
  load(): GuestCartItem[] { return loadGuestCart(); }
  save(items: GuestCartItem[]): void { saveGuestCart(items); }
  clear(): void { clearGuestCart(); }
  async withLock<T>(work: () => Promise<T>): Promise<T> { return withGuestCartLock(work); }
  async project(items: GuestCartItem[], locale: string): Promise<CartResponse> { return guestCartToCartResponse(items, locale); }
  add(items: GuestCartItem[], params: GuestCartItemParams): GuestCartItem[] {
    const existing = items.find((item) => item.productId === params.productId && item.productOptionId === params.productOptionId);
    if (existing) { existing.quantity += params.quantity; return items; }
    const lineId = allocatePersistedGuestLineId(new Set(items.map((item) => item.lineId)));
    items.push({ ...params, lineId }); return items;
  }
  update(items: GuestCartItem[], id: number, quantity: number): boolean {
    const item = items.find((candidate) => candidate.lineId === id);
    if (!item) return false; item.quantity = quantity; return true;
  }
  remove(items: GuestCartItem[], id: number): { removed: boolean; previous: GuestCartItem[] } {
    const previous = items.map((item) => ({ ...item }));
    const index = items.findIndex((item) => item.lineId === id);
    if (index >= 0) items.splice(index, 1);
    return { removed: index >= 0, previous };
  }
  hasPendingOperation(item: GuestCartItem): boolean { return loadGuestMergeOperations()[item.lineId]?.pending === true; }
  async merge(): Promise<{ failed: boolean }> {
    const guestItems = loadGuestCart();
    if (guestItems.length === 0) return { failed: false };
    const operations = loadGuestMergeOperations();
    for (const item of guestItems) {
      operations[item.lineId] ??= { id: globalThis.crypto.randomUUID(), pending: false };
      operations[item.lineId].pending = true;
    }
    saveGuestMergeOperations(operations);
    const results = await Promise.allSettled(guestItems.map(({ lineId, productId, productOptionId, quantity }) =>
      api.cartApi.add({ productId, productOptionId, quantity }, { headers: { 'Idempotency-Key': `guest-cart:${operations[lineId].id}` } }),
    ));
    const currentItems = loadGuestCart();
    const originalOperationIds = new Set(guestItems.map((item) => operations[item.lineId].id));
    const failedOperationIds = new Set(guestItems.filter((_, index) => results[index].status === 'rejected').map((item) => operations[item.lineId].id));
    const currentOperations = loadGuestMergeOperations();
    const retainedItems = currentItems.filter((item) => {
      const operation = currentOperations[item.lineId];
      return !operation || !originalOperationIds.has(operation.id) || failedOperationIds.has(operation.id);
    });
    if (retainedItems.length === 0) { clearGuestCart(); return { failed: false }; }
    for (const item of retainedItems) {
      if (currentOperations[item.lineId] && failedOperationIds.has(currentOperations[item.lineId].id)) currentOperations[item.lineId].pending = true;
    }
    saveGuestMergeOperations(Object.fromEntries(retainedItems.filter((item) => currentOperations[item.lineId]).map((item) => [item.lineId, currentOperations[item.lineId]])));
    saveGuestCart(retainedItems);
    return { failed: failedOperationIds.size > 0 };
  }
}

export const guestCartStore = new GuestCartStore();
