'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type FilterState = Record<string, string>;

interface UseAdminListPageOptions<TFilters extends FilterState> {
  initialFilters: TFilters;
  initialPage?: number;
  initialKeyword?: string;
  syncWithUrl?: boolean;
}

function readPage(searchParams: URLSearchParams, fallback: number): number {
  const raw = Number(searchParams.get('page'));
  return Number.isInteger(raw) && raw > 0 ? raw : fallback;
}

function readFilters<TFilters extends FilterState>(
  searchParams: URLSearchParams,
  initialFilters: TFilters,
): TFilters {
  return Object.keys(initialFilters).reduce<TFilters>((acc, key) => {
    acc[key as keyof TFilters] = (searchParams.get(key) ?? initialFilters[key]) as TFilters[keyof TFilters];
    return acc;
  }, { ...initialFilters });
}

export function useAdminListPage<TFilters extends FilterState>({
  initialFilters,
  initialPage = 1,
  initialKeyword = '',
  syncWithUrl = true,
}: UseAdminListPageOptions<TFilters>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentParams = useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams]);

  const [page, setPage] = useState(() => syncWithUrl ? readPage(currentParams, initialPage) : initialPage);
  const [keyword, setKeyword] = useState(() => syncWithUrl ? currentParams.get('q') ?? initialKeyword : initialKeyword);
  const [searchInput, setSearchInput] = useState(() => syncWithUrl ? currentParams.get('q') ?? initialKeyword : initialKeyword);
  const [filters, setFilters] = useState<TFilters>(() => syncWithUrl ? readFilters(currentParams, initialFilters) : initialFilters);

  useEffect(() => {
    if (!syncWithUrl) return;
    setPage(readPage(currentParams, initialPage));
    const nextKeyword = currentParams.get('q') ?? initialKeyword;
    setKeyword(nextKeyword);
    setSearchInput(nextKeyword);
    setFilters(readFilters(currentParams, initialFilters));
    // initialFilters is intentionally caller-owned and expected to be stable by shape.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncWithUrl, currentParams.toString(), initialPage, initialKeyword]);

  const updateUrl = useCallback((next: { page?: number; keyword?: string; filters?: TFilters }) => {
    if (!syncWithUrl) return;
    const params = new URLSearchParams(currentParams.toString());
    const nextPage = next.page ?? page;
    const nextKeyword = next.keyword ?? keyword;
    const nextFilters = next.filters ?? filters;

    if (nextPage > 1) params.set('page', String(nextPage));
    else params.delete('page');

    if (nextKeyword.trim()) params.set('q', nextKeyword.trim());
    else params.delete('q');

    Object.entries(nextFilters).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [currentParams, filters, keyword, page, pathname, router, syncWithUrl]);

  const setSyncedPage = useCallback((nextPage: number) => {
    setPage(nextPage);
    updateUrl({ page: nextPage });
  }, [updateUrl]);

  const setFilter = useCallback(<K extends keyof TFilters>(key: K, nextValue: TFilters[K]) => {
    const nextFilters = { ...filters, [key]: nextValue };
    setFilters(nextFilters);
    setPage(1);
    updateUrl({ page: 1, filters: nextFilters });
  }, [filters, updateUrl]);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    setKeyword('');
    setSearchInput('');
    setPage(1);
    updateUrl({ page: 1, keyword: '', filters: initialFilters });
  }, [initialFilters, updateUrl]);

  const submitSearch = useCallback((event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const trimmed = searchInput.trim();
    setKeyword(trimmed);
    setPage(1);
    updateUrl({ page: 1, keyword: trimmed });
  }, [searchInput, updateUrl]);

  const hasActiveFilters = keyword !== '' || Object.values(filters).some(Boolean);

  return {
    page,
    setPage: setSyncedPage,
    keyword,
    setKeyword,
    searchInput,
    setSearchInput,
    filters,
    setFilter,
    resetFilters,
    hasActiveFilters,
    submitSearch,
  };
}
