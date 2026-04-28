'use client';

import { useCallback, useState, type FormEvent } from 'react';

type FilterState = Record<string, string>;

interface UseAdminListPageOptions<TFilters extends FilterState> {
  initialFilters: TFilters;
  initialPage?: number;
  initialKeyword?: string;
}

export function useAdminListPage<TFilters extends FilterState>({
  initialFilters,
  initialPage = 1,
  initialKeyword = '',
}: UseAdminListPageOptions<TFilters>) {
  const [page, setPage] = useState(initialPage);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [searchInput, setSearchInput] = useState(initialKeyword);
  const [filters, setFilters] = useState<TFilters>(initialFilters);

  const setFilter = useCallback(<K extends keyof TFilters>(key: K, nextValue: TFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: nextValue }));
    setPage(1);
  }, []);

  const submitSearch = useCallback((event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setKeyword(searchInput.trim());
    setPage(1);
  }, [searchInput]);

  return {
    page,
    setPage,
    keyword,
    setKeyword,
    searchInput,
    setSearchInput,
    filters,
    setFilter,
    submitSearch,
  };
}
