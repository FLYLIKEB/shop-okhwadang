import { renderHook, act } from '@testing-library/react';
import { useWishlistToggle } from '../useWishlistToggle';

const mockAdd = vi.fn();
const mockRemove = vi.fn();
const mockPush = vi.fn();

vi.mock('@/lib/api', () => ({
  wishlistApi: {
    add: (...args: unknown[]) => mockAdd(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockIsAuthenticated = vi.fn(() => true);

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated() }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useWishlistToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.mockReturnValue(true);
  });

  it('초기 상태를 반환한다', () => {
    const { result } = renderHook(() => useWishlistToggle(1));

    expect(result.current.isWishlisted).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(typeof result.current.toggle).toBe('function');
  });

  it('initialIsWishlisted와 initialWishlistId를 반영한다', () => {
    const { result } = renderHook(() =>
      useWishlistToggle(1, { initialIsWishlisted: true, initialWishlistId: 42 }),
    );

    expect(result.current.isWishlisted).toBe(true);
  });

  it('미인증 상태에서 toggle 호출 시 로그인 페이지로 이동한다', async () => {
    mockIsAuthenticated.mockReturnValue(false);

    const { result } = renderHook(() => useWishlistToggle(1));

    const fakeEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.MouseEvent;

    await act(async () => {
      await result.current.toggle(fakeEvent);
    });

    expect(mockPush).toHaveBeenCalledWith('/login');
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('위시리스트에 없는 상품을 추가한다 (optimistic update)', async () => {
    mockAdd.mockResolvedValue({ id: 99 });

    const { result } = renderHook(() => useWishlistToggle(1));

    const fakeEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.MouseEvent;

    await act(async () => {
      await result.current.toggle(fakeEvent);
    });

    expect(mockAdd).toHaveBeenCalledWith(1);
    expect(result.current.isWishlisted).toBe(true);
  });

  it('위시리스트에 있는 상품을 제거한다', async () => {
    mockRemove.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useWishlistToggle(1, { initialIsWishlisted: true, initialWishlistId: 42 }),
    );

    const fakeEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.MouseEvent;

    await act(async () => {
      await result.current.toggle(fakeEvent);
    });

    expect(mockRemove).toHaveBeenCalledWith(42);
    expect(result.current.isWishlisted).toBe(false);
  });

  it('API 실패 시 낙관적 업데이트를 롤백한다', async () => {
    mockAdd.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useWishlistToggle(1));

    const fakeEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.MouseEvent;

    await act(async () => {
      await result.current.toggle(fakeEvent);
    });

    expect(result.current.isWishlisted).toBe(false);
  });

  it('이미 처리 중이면 중복 호출을 무시한다', async () => {
    let resolve: (value: { id: number }) => void;
    mockAdd.mockReturnValue(new Promise<{ id: number }>((r) => { resolve = r; }));

    const { result } = renderHook(() => useWishlistToggle(1));

    const fakeEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.MouseEvent;

    // First call — not awaited yet
    act(() => {
      void result.current.toggle(fakeEvent);
    });

    // Second call should be ignored
    await act(async () => {
      await result.current.toggle(fakeEvent);
    });

    resolve!({ id: 99 });

    expect(mockAdd).toHaveBeenCalledTimes(1);
  });
});
