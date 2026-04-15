import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useMediaQuery, useIsMobile } from '@/components/shared/hooks/useMediaQuery';

type MediaQueryListEventHandler = (e: MediaQueryListEvent) => void;

function createMockMediaQuery(matches: boolean) {
  const listeners: MediaQueryListEventHandler[] = [];
  const mql = {
    matches,
    addEventListener: vi.fn((_: string, handler: MediaQueryListEventHandler) => {
      listeners.push(handler);
    }),
    removeEventListener: vi.fn((_: string, handler: MediaQueryListEventHandler) => {
      const idx = listeners.indexOf(handler);
      if (idx !== -1) listeners.splice(idx, 1);
    }),
    _trigger: (newMatches: boolean) => {
      listeners.forEach((handler) =>
        handler({ matches: newMatches } as MediaQueryListEvent),
      );
    },
  };
  return mql;
}

describe('useMediaQuery', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('matchMedia true → returns true', () => {
    const mql = createMockMediaQuery(true);
    vi.spyOn(window, 'matchMedia').mockReturnValue(mql as unknown as MediaQueryList);

    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(true);
  });

  it('matchMedia false → returns false', () => {
    const mql = createMockMediaQuery(false);
    vi.spyOn(window, 'matchMedia').mockReturnValue(mql as unknown as MediaQueryList);

    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(false);
  });

  it('미디어 쿼리 변경 시 업데이트', () => {
    const mql = createMockMediaQuery(false);
    vi.spyOn(window, 'matchMedia').mockReturnValue(mql as unknown as MediaQueryList);

    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(false);

    act(() => {
      mql._trigger(true);
    });
    expect(result.current).toBe(true);
  });
});

describe('useIsMobile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('(max-width: 767px) 쿼리로 matchMedia 호출', () => {
    const mql = createMockMediaQuery(true);
    const spy = vi.spyOn(window, 'matchMedia').mockReturnValue(mql as unknown as MediaQueryList);

    renderHook(() => useIsMobile());
    expect(spy).toHaveBeenCalledWith('(max-width: 767px)');
  });
});
