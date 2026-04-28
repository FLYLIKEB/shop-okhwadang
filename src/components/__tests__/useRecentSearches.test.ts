import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useRecentSearches } from '@/components/shared/hooks/useRecentSearches';

beforeEach(() => {
  localStorage.clear();
});

describe('useRecentSearches', () => {
  it('addSearch stores to localStorage', () => {
    const { result } = renderHook(() => useRecentSearches());
    act(() => {
      result.current.addSearch('shoes');
    });
    expect(result.current.recentSearches).toContain('shoes');
    expect(localStorage.getItem('recent_searches')).toBe(JSON.stringify(['shoes']));
  });

  it('deduplication works — adding same term keeps only one entry', () => {
    const { result } = renderHook(() => useRecentSearches());
    act(() => {
      result.current.addSearch('shoes');
    });
    act(() => {
      result.current.addSearch('shoes');
    });
    expect(result.current.recentSearches.filter((s) => s === 'shoes')).toHaveLength(1);
  });

  it('newest item appears first after deduplication', () => {
    const { result } = renderHook(() => useRecentSearches());
    act(() => {
      result.current.addSearch('shoes');
    });
    act(() => {
      result.current.addSearch('bags');
    });
    act(() => {
      result.current.addSearch('shoes');
    });
    expect(result.current.recentSearches[0]).toBe('shoes');
  });

  it('removeSearch removes item', () => {
    const { result } = renderHook(() => useRecentSearches());
    act(() => {
      result.current.addSearch('shoes');
    });
    act(() => {
      result.current.removeSearch('shoes');
    });
    expect(result.current.recentSearches).not.toContain('shoes');
  });

  it('max 10 items', () => {
    const { result } = renderHook(() => useRecentSearches());
    act(() => {
      for (let i = 0; i < 12; i++) {
        result.current.addSearch(`item-${i}`);
      }
    });
    expect(result.current.recentSearches).toHaveLength(10);
  });

  it('clearSearches empties the list', () => {
    const { result } = renderHook(() => useRecentSearches());
    act(() => {
      result.current.addSearch('shoes');
    });
    act(() => {
      result.current.clearSearches();
    });
    expect(result.current.recentSearches).toHaveLength(0);
  });
});
