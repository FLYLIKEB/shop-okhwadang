import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MyPage from '@/app/[locale]/my/page';
import { AuthContext } from '@/contexts/AuthContext';
import type { AuthContextValue } from '@/contexts/AuthContext';

const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'ko',
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/lib/api', () => ({
  ordersApi: {
    getList: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 3 }),
  },
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

describe('MyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /login if not authenticated', async () => {
    render(
      <AuthContext.Provider value={makeAuthValue({ isAuthenticated: false, isLoading: false })}>
        <MyPage />
      </AuthContext.Provider>,
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('renders user info when authenticated', async () => {
    render(
      <AuthContext.Provider
        value={makeAuthValue({
          isAuthenticated: true,
          isLoading: false,
          user: { id: 1, email: 'test@example.com', name: '홍길동', role: 'user' },
        })}
      >
        <MyPage />
      </AuthContext.Provider>,
    );

    await waitFor(() => {
      expect(screen.getByText('홍길동')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  it('shows order list link', async () => {
    render(
      <AuthContext.Provider
        value={makeAuthValue({
          isAuthenticated: true,
          isLoading: false,
          user: { id: 1, email: 'test@example.com', name: '홍길동', role: 'user' },
        })}
      >
        <MyPage />
      </AuthContext.Provider>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('orderHistory').length).toBeGreaterThan(0);
    });
  });
});
