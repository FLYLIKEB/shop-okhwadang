'use client';

import { useEffect, useState } from 'react';

interface UseBlockDataOptions<T> {
  prefetched?: T[] | null;
  fetch: () => Promise<T[]>;
  deps: unknown[];
}

interface UseBlockDataResult<T> {
  data: T[];
  loading: boolean;
}

export function useBlockData<T>({
  prefetched,
  fetch,
  deps,
}: UseBlockDataOptions<T>): UseBlockDataResult<T> {
  const [data, setData] = useState<T[]>(prefetched ?? []);
  const [loading, setLoading] = useState(!prefetched);

  useEffect(() => {
    if (prefetched && prefetched.length > 0) return;

    let cancelled = false;

    async function load() {
      try {
        const result = await fetch();
        if (!cancelled) setData(result);
      } catch {
        // network errors are non-fatal for CMS blocks
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefetched, ...deps]);

  return { data, loading };
}
