import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useViewMode } from '@/components/shared/hooks/useViewMode';

describe('useViewMode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('uses default mode before storage is loaded', () => {
    const { result } = renderHook(() => useViewMode('products-view', 'list'));

    expect(result.current.mode).toBe('list');
  });

  it('loads a valid stored mode and persists updates', async () => {
    localStorage.setItem('products-view', JSON.stringify('list'));
    const { result } = renderHook(() => useViewMode('products-view', 'grid'));

    await waitFor(() => expect(result.current.mode).toBe('list'));

    act(() => {
      result.current.setMode('grid');
    });

    expect(result.current.mode).toBe('grid');
    expect(localStorage.getItem('products-view')).toBe('"grid"');
  });

  it('ignores invalid stored values', async () => {
    localStorage.setItem('products-view', JSON.stringify('cards'));
    const { result } = renderHook(() => useViewMode('products-view', 'grid'));

    await waitFor(() => expect(result.current.mode).toBe('grid'));
  });
});
