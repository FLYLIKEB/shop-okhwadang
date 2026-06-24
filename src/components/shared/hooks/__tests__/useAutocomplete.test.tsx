import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutocomplete } from '@/components/shared/hooks/useAutocomplete';

const { autocompleteMock } = vi.hoisted(() => ({
  autocompleteMock: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  productsApi: {
    autocomplete: autocompleteMock,
  },
}));

describe('useAutocomplete', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    autocompleteMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not fetch for one-character queries', () => {
    const { result } = renderHook(() => useAutocomplete('자'));

    expect(result.current.suggestions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(autocompleteMock).not.toHaveBeenCalled();
  });

  it('debounces autocomplete calls and exposes results', async () => {
    autocompleteMock.mockResolvedValue([{ id: 1, name: '자사호', slug: 'zisha' }]);
    const { result } = renderHook(() => useAutocomplete('자사'));

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(autocompleteMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(result.current.suggestions).toEqual([{ id: 1, name: '자사호', slug: 'zisha' }]);
    expect(result.current.isLoading).toBe(false);
  });

  it('clears suggestions on API failure', async () => {
    autocompleteMock.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useAutocomplete('검색'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.suggestions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('ignores stale results when the query changes before a request settles', async () => {
    let resolveFirst!: (value: Array<{ id: number; name: string; slug: string }>) => void;
    autocompleteMock
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce([{ id: 2, name: '새 검색어', slug: 'new' }]);

    const { result, rerender } = renderHook(({ query }) => useAutocomplete(query), {
      initialProps: { query: '이전' },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    rerender({ query: '새 검색어' });

    await act(async () => {
      resolveFirst([{ id: 1, name: '이전', slug: 'old' }]);
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.suggestions).toEqual([{ id: 2, name: '새 검색어', slug: 'new' }]);
    expect(result.current.isLoading).toBe(false);
  });
});
