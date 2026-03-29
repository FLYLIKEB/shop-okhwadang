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

export function useNavigation(group: 'gnb' | 'sidebar' | 'footer') {
  const [items, setItems] = useState<NavigationItem[]>(getStaticFallback(group));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await navigationApi.getByGroup(group);
        if (!cancelled) {
          setItems(data.length > 0 ? data : getStaticFallback(group));
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
