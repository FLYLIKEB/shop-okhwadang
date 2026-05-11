import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { GlobalLoadingProvider, useGlobalLoading } from '@/contexts/GlobalLoadingContext';
import { useAsyncAction } from '../useAsyncAction';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from 'sonner';

function wrapper({ children }: { children: ReactNode }) {
  return <GlobalLoadingProvider>{children}</GlobalLoadingProvider>;
}

describe('useAsyncAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('성공 시 결과 반환 + successMessage 토스트 + onSuccess 콜백', async () => {
    const fn = vi.fn().mockResolvedValue('result-value');
    const onSuccess = vi.fn();

    const { result } = renderHook(
      () => useAsyncAction(fn, { successMessage: '저장되었습니다.', onSuccess }),
      { wrapper },
    );

    let returned: unknown;
    await act(async () => {
      returned = await result.current.execute(undefined);
    });

    expect(returned).toBe('result-value');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('저장되었습니다.');
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('successMessage 없으면 토스트는 호출되지 않는다', async () => {
    const fn = vi.fn().mockResolvedValue(1);

    const { result } = renderHook(() => useAsyncAction(fn), { wrapper });

    await act(async () => {
      await result.current.execute(undefined);
    });

    expect(toast.success).not.toHaveBeenCalled();
  });

  it('실패 시 에러 토스트 + onError 콜백 + 에러 throw', async () => {
    const err = new Error('서버 오류');
    const fn = vi.fn().mockRejectedValue(err);
    const onError = vi.fn();

    const { result } = renderHook(
      () => useAsyncAction(fn, { errorMessage: '저장 실패', onError }),
      { wrapper },
    );

    await act(async () => {
      await expect(result.current.execute(undefined)).rejects.toThrow('서버 오류');
    });

    expect(toast.error).toHaveBeenCalledWith('서버 오류');
    expect(onError).toHaveBeenCalledWith(err);
  });

  it('Error 가 아닌 예외는 errorMessage fallback 사용', async () => {
    const fn = vi.fn().mockRejectedValue('string-error');

    const { result } = renderHook(
      () => useAsyncAction(fn, { errorMessage: '커스텀 폴백' }),
      { wrapper },
    );

    await act(async () => {
      await expect(result.current.execute(undefined)).rejects.toBe('string-error');
    });

    expect(toast.error).toHaveBeenCalledWith('커스텀 폴백');
  });

  it('errorMessage 미지정 시 기본 폴백 사용', async () => {
    const fn = vi.fn().mockRejectedValue(null);

    const { result } = renderHook(() => useAsyncAction(fn), { wrapper });

    await act(async () => {
      await expect(result.current.execute(undefined)).rejects.toBeNull();
    });

    expect(toast.error).toHaveBeenCalledWith('오류가 발생했습니다.');
  });

  it('실행 중 isLoading이 true가 되고 완료 후 false로 돌아온다', async () => {
    let resolve!: (value: number) => void;
    const fn = vi.fn(() => new Promise<number>((r) => { resolve = r; }));

    const { result } = renderHook(() => useAsyncAction(fn), { wrapper });

    expect(result.current.isLoading).toBe(false);

    let executePromise!: Promise<number>;
    act(() => {
      executePromise = result.current.execute(undefined);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(true));

    await act(async () => {
      resolve(42);
      await executePromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('인자(arg)를 받아서 fn에 그대로 전달한다', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useAsyncAction<void, { id: number }>(fn), { wrapper });

    await act(async () => {
      await result.current.execute({ id: 7 });
    });

    expect(fn).toHaveBeenCalledWith({ id: 7 });
  });

  // 회귀 가드 (#755): execute reference 가 GlobalLoadingContext 의 pendingCount
  // 변화에도 안정적이어야 한다. GlobalLoadingContext 가 pendingCount 변화에
  // 따라 startLoading/stopLoading 함수를 새로 만들면 execute reference 가 변하고,
  // 이를 effect deps 로 쓰는 컴포넌트(예: ProductTabs)에서 무한 렌더 루프 발생.
  it('execute reference 는 GlobalLoading 활동 후에도 안정적이다 (#755 무한 루프 방지)', async () => {
    const fn = vi.fn().mockResolvedValue('ok');

    // 같은 Provider 안에서 두 훅을 함께 렌더 — 외부 startLoading 호출이
    // pendingCount 를 흔들어도 execute reference 가 보존되는지 검증.
    const { result } = renderHook(
      () => {
        const action = useAsyncAction(fn);
        const loading = useGlobalLoading();
        return { action, loading };
      },
      { wrapper },
    );

    const initialExecute = result.current.action.execute;

    await act(async () => {
      await result.current.action.execute(undefined);
    });

    expect(result.current.action.execute).toBe(initialExecute);

    act(() => {
      result.current.loading.startLoading();
    });
    act(() => {
      result.current.loading.stopLoading();
    });

    expect(result.current.action.execute).toBe(initialExecute);
  });
});
