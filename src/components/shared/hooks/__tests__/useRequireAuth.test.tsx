import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { AuthContext, type AuthContextValue } from '@/contexts/AuthContext';
import { useRequireAuth } from '../useRequireAuth';

const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn(), back: vi.fn() }),
}));

function makeAuthValue(overrides?: Partial<AuthContextValue>): AuthContextValue {
  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    loginWithKakao: vi.fn(),
    loginWithGoogle: vi.fn(),
    updateUser: vi.fn(),
    ...overrides,
  };
}

function wrapperWith(authValue: AuthContextValue) {
  function AuthWrapper({ children }: { children: ReactNode }) {
    return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
  }
  return AuthWrapper;
}

describe('useRequireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('isLoading=true 동안에는 리다이렉트하지 않는다', () => {
    const wrapper = wrapperWith(makeAuthValue({ isLoading: true, isAuthenticated: false }));
    const { result } = renderHook(() => useRequireAuth(), { wrapper });

    expect(mockReplace).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('로딩 완료 후 미인증이면 /login 으로 replace 한다', () => {
    const wrapper = wrapperWith(makeAuthValue({ isLoading: false, isAuthenticated: false }));
    renderHook(() => useRequireAuth(), { wrapper });

    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('인증된 상태에서는 리다이렉트하지 않는다', () => {
    const wrapper = wrapperWith(
      makeAuthValue({
        isLoading: false,
        isAuthenticated: true,
        user: { id: 1, email: 'a@b.com', name: '홍', role: 'user' },
      }),
    );
    const { result } = renderHook(() => useRequireAuth(), { wrapper });

    expect(mockReplace).not.toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('redirectTo 인자로 리다이렉트 경로를 변경할 수 있다', () => {
    const wrapper = wrapperWith(makeAuthValue({ isLoading: false, isAuthenticated: false }));
    renderHook(() => useRequireAuth('/ko/login'), { wrapper });

    expect(mockReplace).toHaveBeenCalledWith('/ko/login');
  });

  it('인증된 상태에서 redirectTo 인자가 변경되어도 리다이렉트하지 않는다', () => {
    const wrapper = wrapperWith(
      makeAuthValue({
        isLoading: false,
        isAuthenticated: true,
        user: { id: 1, email: 'a@b.com', name: '홍', role: 'user' },
      }),
    );
    renderHook(() => useRequireAuth('/admin/login'), { wrapper });

    expect(mockReplace).not.toHaveBeenCalled();
  });
});
