import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useBlockData } from '@/components/shared/hooks/useBlockData';

describe('useBlockData', () => {
  it('uses prefetched data without fetching', () => {
    const fetch = vi.fn();
    const prefetched = [{ id: 1, title: 'prefetched' }];

    const { result } = renderHook(() => useBlockData({ prefetched, fetch, deps: [] }));

    expect(result.current.data).toEqual(prefetched);
    expect(result.current.loading).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fetches client fallback data when no prefetched data exists', async () => {
    const fetch = vi.fn().mockResolvedValue([{ id: 2, title: 'loaded' }]);
    const { result } = renderHook(() => useBlockData({ prefetched: null, fetch, deps: [] }));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([{ id: 2, title: 'loaded' }]);
  });

  it('does not update state after unmount', async () => {
    let resolve!: (value: Array<{ id: number }>) => void;
    const fetch = vi.fn().mockReturnValue(new Promise((res) => { resolve = res; }));
    const { unmount } = renderHook(() => useBlockData({ prefetched: [], fetch, deps: [] }));

    unmount();

    await act(async () => {
      resolve([{ id: 3 }]);
    });

    expect(fetch).toHaveBeenCalled();
  });

  it('treats fetch failures as non-fatal empty data', async () => {
    const fetch = vi.fn().mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useBlockData({ prefetched: null, fetch, deps: [] }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([]);
  });
});
