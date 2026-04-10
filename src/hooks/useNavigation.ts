'use client';

import { useState, useEffect } from 'react';
import { navigationApi } from '@/lib/api';
import type { NavigationItem } from '@/lib/api';

const STATIC_GNB: NavigationItem[] = [
  {
    id: 0,
    group: 'gnb',
    label: '상품목록',
    url: '/products',
    sort_order: 0,
    is_active: true,
    parent_id: null,
    children: [],
  },
  {
    id: -1,
    group: 'gnb',
    label: '장인',
    url: '/artist',
    sort_order: 1,
    is_active: true,
    parent_id: null,
    children: [],
  },
  {
    id: -2,
    group: 'gnb',
    label: 'Archive',
    url: '/archive',
    sort_order: 2,
    is_active: true,
    parent_id: null,
    children: [],
  },
];

const STATIC_FOOTER: NavigationItem[] = [];
const STATIC_SIDEBAR: NavigationItem[] = [];

function getStaticFallback(group: 'gnb' | 'sidebar' | 'footer'): NavigationItem[] {
  switch (group) {
    case 'gnb':
      return STATIC_GNB;
    case 'footer':
      return STATIC_FOOTER;
    case 'sidebar':
      return STATIC_SIDEBAR;
  }
}

// Module-level cache with TTL
const NAV_CACHE = new Map<string, { data: NavigationItem[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(group: string): NavigationItem[] | null {
  const entry = NAV_CACHE.get(group);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    NAV_CACHE.delete(group);
    return null;
  }
  return entry.data;
}

export function clearNavCache(): void {
  NAV_CACHE.clear();
}

export function useNavigation(group: 'gnb' | 'sidebar' | 'footer') {
  const [items, setItems] = useState<NavigationItem[]>(getStaticFallback(group));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const cached = getCached(group);
      if (cached) {
        setItems(cached);
        setLoading(false);
        return;
      }

      try {
        const data = await navigationApi.getByGroup(group);
        if (!cancelled) {
          const result = data.length > 0 ? data : getStaticFallback(group);
          setItems(result);
          NAV_CACHE.set(group, { data: result, timestamp: Date.now() });
        }
      } catch {
        if (!cancelled) {
          setItems(getStaticFallback(group));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [group]);

  return { items, loading };
}
