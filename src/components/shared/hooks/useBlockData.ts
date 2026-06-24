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
    if (prefetched) {
      setData(prefetched);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const result = await fetch();
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setData([]);
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
