'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const EMPTY_QUERY_SUFFIX = '?';

export function parseAttrs(attrs: string | null): Map<string, string> {
  const result = new Map<string, string>();
  if (!attrs) return result;

  for (const pair of attrs.split(',')) {
    const [code, value] = pair.split(':');
    if (!code || !value) continue;
    result.set(code.trim(), value.trim());
  }

  return result;
}

export function buildAttrs(current: Map<string, string>, key: string, value: string | undefined): string | undefined {
  const next = new Map(current);

  if (value === undefined) {
    next.delete(key);
  } else {
    next.set(key, value);
  }

  if (next.size === 0) return undefined;

  return Array.from(next.entries())
    .map(([attrKey, attrValue]) => `${attrKey}:${attrValue}`)
    .join(',');
}

interface UpdateCatalogQueryOptions {
  resetPage?: boolean;
}

type QueryValue = string | number | undefined;

export function useCatalogQueryParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const attrs = useMemo(() => parseAttrs(searchParams.get('attrs')), [searchParams]);

  const categoryId = useMemo(() => {
    const value = searchParams.get('categoryId');
    return value ? Number(value) : undefined;
  }, [searchParams]);

  const priceMin = useMemo(() => {
    const value = searchParams.get('price_min');
    return value ? Number(value) : undefined;
  }, [searchParams]);

  const priceMax = useMemo(() => {
    const value = searchParams.get('price_max');
    return value ? Number(value) : undefined;
  }, [searchParams]);

  const page = useMemo(() => {
    const value = searchParams.get('page');
    return value ? Number(value) : 1;
  }, [searchParams]);

  const q = searchParams.get('q') ?? '';
  const sort = searchParams.get('sort') ?? undefined;

  const pushParams = useCallback((params: URLSearchParams) => {
    const query = params.toString();
    const target = query.length > 0 ? `${pathname}?${query}` : `${pathname}${EMPTY_QUERY_SUFFIX}`;
    router.push(target);
  }, [pathname, router]);

  const updateQuery = useCallback((updates: Record<string, QueryValue>, options?: UpdateCatalogQueryOptions) => {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, rawValue] of Object.entries(updates)) {
      if (rawValue === undefined || rawValue === '') {
        params.delete(key);
      } else {
        params.set(key, String(rawValue));
      }
    }

    if (options?.resetPage !== false) {
      params.delete('page');
    }

    pushParams(params);
  }, [pushParams, searchParams]);

  const resetQuery = useCallback((keys: string[]) => {
    const params = new URLSearchParams(searchParams.toString());

    for (const key of keys) {
      params.delete(key);
    }

    params.delete('page');
    pushParams(params);
  }, [pushParams, searchParams]);

  return {
    searchParams,
    attrs,
    q,
    sort,
    page,
    categoryId,
    priceMin,
    priceMax,
    updateQuery,
    resetQuery,
  };
}
