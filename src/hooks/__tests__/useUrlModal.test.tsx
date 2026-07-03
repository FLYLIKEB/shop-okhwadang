import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useUrlModal, useUrlQueryState } from '@/hooks/useUrlModal';

const ORIGINAL_PATH = '/ko/products/preview';

afterEach(() => {
  window.history.replaceState(null, '', ORIGINAL_PATH);
  vi.restoreAllMocks();
});

describe('useUrlQueryState', () => {
  it('초기 URL query 값을 읽고 replace 모드로 같은 history entry를 갱신한다', async () => {
    window.history.replaceState(null, '', `${ORIGINAL_PATH}?lightbox=2#photo`);
    const { result } = renderHook(() => useUrlQueryState('lightbox'));

    await waitFor(() => expect(result.current.value).toBe('2'));

    act(() => result.current.setValue('3', 'replace'));

    await waitFor(() => expect(result.current.value).toBe('3'));
    expect(window.location.pathname).toBe(ORIGINAL_PATH);
    expect(window.location.search).toBe('?lightbox=3');
    expect(window.location.hash).toBe('#photo');
  });

  it('push로 연 값은 close() 시 브라우저 back으로 닫는다', async () => {
    window.history.replaceState(null, '', ORIGINAL_PATH);
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {
      window.history.replaceState(null, '', ORIGINAL_PATH);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    const { result } = renderHook(() => useUrlQueryState('lightbox'));

    act(() => result.current.setValue('0'));
    await waitFor(() => expect(result.current.value).toBe('0'));

    act(() => result.current.close());

    expect(backSpy).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.value).toBeNull());
  });

  it('replace로 열린 값은 close("replace") 시 query만 제거한다', async () => {
    window.history.replaceState(null, '', ORIGINAL_PATH);
    const { result } = renderHook(() => useUrlQueryState('lightbox'));

    act(() => result.current.setValue('1', 'replace'));
    await waitFor(() => expect(result.current.value).toBe('1'));

    act(() => result.current.close('replace'));

    await waitFor(() => expect(result.current.value).toBeNull());
    expect(window.location.search).toBe('');
  });
});

describe('useUrlModal', () => {
  it('query 값 1을 open 상태로 매핑하고 setOpen(false)로 닫는다', async () => {
    window.history.replaceState(null, '', `${ORIGINAL_PATH}?search=1`);
    const { result } = renderHook(() => useUrlModal('search'));

    await waitFor(() => expect(result.current[0]).toBe(true));

    act(() => result.current[1](false, 'replace'));

    await waitFor(() => expect(result.current[0]).toBe(false));
    expect(window.location.search).toBe('');
  });
});
