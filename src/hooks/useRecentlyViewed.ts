'use client';

import { useState, useCallback, useEffect } from 'react';

export interface RecentlyViewedProduct {
  id: number;
  name: string;
  price: number;
  salePrice: number | null;
  thumbnail: string | null;
  slug: string;
  viewedAt: string;
}

const MAX_ITEMS = 20;
const STORAGE_KEY = 'recently_viewed';

function readFromStorage(): RecentlyViewedProduct[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentlyViewedProduct[]) : [];
  } catch {
    return [];
  }
}

function writeToStorage(items: RecentlyViewedProduct[]): void {
  try {
    if (items.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  } catch {
    // ignore storage errors
  }
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedProduct[]>([]);

  useEffect(() => {
    setItems(readFromStorage());
  }, []);

  const addItem = useCallback((product: Omit<RecentlyViewedProduct, 'viewedAt'>) => {
    setItems((prev) => {
      const filtered = prev.filter((p) => p.id !== product.id);
      const next = [{ ...product, viewedAt: new Date().toISOString() }, ...filtered].slice(
        0,
        MAX_ITEMS,
      );
      writeToStorage(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    writeToStorage([]);
    setItems([]);
  }, []);

  return { items, addItem, clear };
}
