'use client';

import { useState, useEffect } from 'react';
import { navigationApi } from '@/lib/api';
import type { NavigationItem } from '@/lib/api';

const STATIC_GNB: NavigationItem[] = [
  { id: 0, group: 'gnb', label: '상품목록', url: '/products', sort_order: 0, is_active: true, parent_id: null, children: [] },
  { id: -1, group: 'gnb', label: '장인', url: '/artist', sort_order: 1, is_active: true, parent_id: null, children: [] },
  { id: -2, group: 'gnb', label: 'Archive', url: '/archive', sort_order: 2, is_active: true, parent_id: null, children: [] },
];

const STATIC_FOOTER: NavigationItem[] = [];
const STATIC_SIDEBAR: NavigationItem[] = [];

const STATIC_MAP: Record<string, NavigationItem[]> = {
  gnb: STATIC_GNB,
  footer: STATIC_FOOTER,
  sidebar: STATIC_SIDEBAR,
};

export function useNavigation(group: 'gnb' | 'sidebar' | 'footer') {
  const [items, setItems] = useState<NavigationItem[]>(STATIC_MAP[group] ?? []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await navigationApi.getByGroup(group);
        if (!cancelled) {
          setItems(data.length > 0 ? data : (STATIC_MAP[group] ?? []));
        }
      } catch {
        if (!cancelled) {
          setItems(STATIC_MAP[group] ?? []);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    setItems(STATIC_MAP[group] ?? []);
    setLoading(true);
    load();
    return () => {
      cancelled = true;
    };
  }, [group]);

  return { items, loading };
}
