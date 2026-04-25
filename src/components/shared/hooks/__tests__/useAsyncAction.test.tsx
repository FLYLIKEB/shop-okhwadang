import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { GlobalLoadingProvider } from '@/contexts/GlobalLoadingContext';
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
});
