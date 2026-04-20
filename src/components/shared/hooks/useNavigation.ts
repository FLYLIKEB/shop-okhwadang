'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { navigationApi } from '@/lib/api';
import type { NavigationItem } from '@/lib/api';

function buildStaticGnb(t: (key: string) => string): NavigationItem[] {
  return [
    {
      id: 0,
      group: 'gnb',
      label: t('products'),
      url: '/products',
      sort_order: 0,
      is_active: true,
      parent_id: null,
      children: [],
    },
    {
      id: -1,
      group: 'gnb',
      label: t('artist'),
      url: '/artist',
      sort_order: 1,
      is_active: true,
      parent_id: null,
      children: [],
    },
    {
      id: -2,
      group: 'gnb',
      label: t('archive'),
      url: '/archive',
      sort_order: 2,
      is_active: true,
      parent_id: null,
      children: [],
    },
  ];
}

const EMPTY_NAV: NavigationItem[] = [];

export function useNavigation(group: 'gnb' | 'sidebar' | 'footer') {
  const tNav = useTranslations('nav');
  const locale = useLocale();
  const productLabel = tNav('products');
  const artistLabel = tNav('artist');
  const archiveLabel = tNav('archive');

  const fallback = useMemo<NavigationItem[]>(() => {
    if (group === 'gnb') {
      return buildStaticGnb((key) => {
        if (key === 'products') return productLabel;
        if (key === 'artist') return artistLabel;
        if (key === 'archive') return archiveLabel;
        return key;
      });
    }

    return EMPTY_NAV;
  }, [archiveLabel, artistLabel, group, productLabel]);

  const [items, setItems] = useState<NavigationItem[]>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await navigationApi.getByGroup(group, locale);

        if (!cancelled) {
          setItems(data.length > 0 ? data : fallback);
        }
      } catch {
        if (!cancelled) {
          setItems(fallback);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    setItems(fallback);
    setLoading(true);
    void load();

    return () => {
      cancelled = true;
    };
  }, [fallback, group, locale]);

  return { items, loading };
}
