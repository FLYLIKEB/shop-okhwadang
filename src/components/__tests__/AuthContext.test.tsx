import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import type { AuthTokenResponse, AuthUser } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    profile: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    kakaoCallback: vi.fn(),
    googleCallback: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { authApi } from '@/lib/api';

const mockUser: AuthUser = { id: 1, email: 'test@example.com', name: '홍길동', role: 'user' };
const mockTokenResponse: AuthTokenResponse = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  user: mockUser,
};

function AuthDisplay() {
  const { user, isAuthenticated, isLoading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{isLoading ? 'loading' : 'idle'}</span>
      <span data-testid="authenticated">{isAuthenticated ? 'yes' : 'no'}</span>
      <span data-testid="user">{user ? user.email : 'none'}</span>
    </div>
  );
}

function LoginButton() {
  const { login } = useAuth();
  return <button onClick={() => login('test@example.com', 'password1').catch(() => {})}>login</button>;
}

function LogoutButton() {
  const { logout } = useAuth();
  return <button onClick={() => logout()}>logout</button>;
}

function RegisterButton() {
  const { register } = useAuth();
  return <button onClick={() => register('test@example.com', 'password1', '홍길동')}>register</button>;
}

function renderWithProvider(ui: React.ReactNode) {
  return render(<AuthProvider>{ui}</AuthProvider>);
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('isLoading starts true then becomes false after init', async () => {
    vi.mocked(authApi.profile).mockResolvedValue(mockUser);
    // No token in localStorage — skips profile call
    renderWithProvider(<AuthDisplay />);
    // After async init completes
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('idle');
    });
  });

  it('loads user from profile on mount when accessToken exists', async () => {
    localStorage.setItem('accessToken', 'existing-token');
    vi.mocked(authApi.profile).mockResolvedValue(mockUser);
    renderWithProvider(<AuthDisplay />);
    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('test@example.com');
    });
    expect(authApi.profile).toHaveBeenCalledTimes(1);
  });

  it('refreshes token when profile returns 401', async () => {
    localStorage.setItem('accessToken', 'expired-token');
    localStorage.setItem('refreshToken', 'refresh-token');
    vi.mocked(authApi.profile)
      .mockRejectedValueOnce(new Error('Unauthorized'))
      .mockResolvedValueOnce(mockUser);
    vi.mocked(authApi.refresh).mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });
    renderWithProvider(<AuthDisplay />);
    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('test@example.com');
    });
    expect(localStorage.getItem('accessToken')).toBe('new-access-token');
  });

  it('clears tokens when refresh also fails', async () => {
    localStorage.setItem('accessToken', 'expired-token');
    localStorage.setItem('refreshToken', 'bad-refresh-token');
    vi.mocked(authApi.profile).mockRejectedValue(new Error('Unauthorized'));
    vi.mocked(authApi.refresh).mockRejectedValue(new Error('Refresh failed'));
    renderWithProvider(<AuthDisplay />);
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('idle');
    });
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(screen.getByTestId('authenticated').textContent).toBe('no');
  });

  it('login success sets user and stores tokens', async () => {
    vi.mocked(authApi.login).mockResolvedValue(mockTokenResponse);
    const { getByRole } = renderWithProvider(
      <>
        <AuthDisplay />
        <LoginButton />
      </>,
    );
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('idle'));

    await act(async () => {
      getByRole('button', { name: 'login' }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('test@example.com');
    });
    expect(localStorage.getItem('accessToken')).toBe('access-token');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-token');
  });

  it('login failure throws error', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error('이메일 또는 비밀번호가 올바르지 않습니다.'));
    const { getByRole } = renderWithProvider(
      <>
        <AuthDisplay />
        <LoginButton />
      </>,
    );
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('idle'));

    await act(async () => {
      getByRole('button', { name: 'login' }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('none');
    });
  });

  it('logout clears user and tokens', async () => {
    localStorage.setItem('accessToken', 'token');
    vi.mocked(authApi.profile).mockResolvedValue(mockUser);
    vi.mocked(authApi.logout).mockResolvedValue({ message: 'ok' });

    const { getByRole } = renderWithProvider(
      <>
        <AuthDisplay />
        <LogoutButton />
      </>,
    );
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('test@example.com'));

    await act(async () => {
      getByRole('button', { name: 'logout' }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('none');
    });
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('register success does not auto-login (redirects to login page)', async () => {
    vi.mocked(authApi.register).mockResolvedValue(mockTokenResponse);
    const { getByRole } = renderWithProvider(
      <>
        <AuthDisplay />
        <RegisterButton />
      </>,
    );
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('idle'));

    await act(async () => {
      getByRole('button', { name: 'register' }).click();
    });

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith('test@example.com', 'password1', '홍길동');
    });
    // user should NOT be set after register (no auto-login)
    expect(screen.getByTestId('user').textContent).toBe('none');
    expect(localStorage.getItem('accessToken')).toBeNull();
  });
});
