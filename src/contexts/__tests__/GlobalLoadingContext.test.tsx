import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { GlobalLoadingProvider, useGlobalLoading } from '../GlobalLoadingContext';

function wrapper({ children }: { children: ReactNode }) {
  return <GlobalLoadingProvider>{children}</GlobalLoadingProvider>;
}

describe('GlobalLoadingContext', () => {
  it('startLoading 호출 시 pendingCount 와 isLoading 이 업데이트된다', () => {
    const { result } = renderHook(() => useGlobalLoading(), { wrapper });

    expect(result.current.pendingCount).toBe(0);
    expect(result.current.isLoading).toBe(false);

    act(() => {
      result.current.startLoading();
    });

    expect(result.current.pendingCount).toBe(1);
    expect(result.current.isLoading).toBe(true);

    act(() => {
      result.current.stopLoading();
    });

    expect(result.current.pendingCount).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });

  it('stopLoading 은 pendingCount 를 0 미만으로 내리지 않는다', () => {
    const { result } = renderHook(() => useGlobalLoading(), { wrapper });

    act(() => {
      result.current.stopLoading();
      result.current.stopLoading();
    });

    expect(result.current.pendingCount).toBe(0);
  });

  // 회귀 가드 (#755): startLoading / stopLoading reference 는 pendingCount 변화에
  // 영향받지 않아야 한다. 함수 reference 가 매 렌더 새로 만들어지면 이를
  // useCallback deps 로 쓰는 useAsyncAction 의 execute 도 매번 새 reference 가 되고,
  // 이를 useEffect deps 로 쓰는 컴포넌트는 무한 렌더 루프에 빠진다.
  it('startLoading / stopLoading reference 는 호출 후에도 동일하다 (#755 무한 루프 방지)', () => {
    const { result } = renderHook(() => useGlobalLoading(), { wrapper });

    const initialStart = result.current.startLoading;
    const initialStop = result.current.stopLoading;

    act(() => {
      result.current.startLoading();
    });

    expect(result.current.startLoading).toBe(initialStart);
    expect(result.current.stopLoading).toBe(initialStop);

    act(() => {
      result.current.stopLoading();
    });

    expect(result.current.startLoading).toBe(initialStart);
    expect(result.current.stopLoading).toBe(initialStop);
  });
});
