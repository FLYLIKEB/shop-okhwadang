import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import type { AuthTokenResponse, AuthUser } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn(),
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

vi.mock('@/utils/navigation', () => ({
  redirectTo: vi.fn(),
}));

import { authApi } from '@/lib/api';
import { redirectTo } from '@/utils/navigation';

const mockUser: AuthUser = { id: 1, email: 'test@example.com', name: '홍길동', role: 'user' };
const mockTokenResponse: AuthTokenResponse = {
  user: mockUser,
};

function AuthDisplay() {
  const { user, isAuthenticated, isLoading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{isLoading ? 'loading' : 'idle'}</span>
      <span data-testid="authenticated">{isAuthenticated ? 'yes' : 'no'}</span>
      <span data-testid="user">{user ? user.email : 'none'}</span>
      <span data-testid="name">{user ? user.name : 'none'}</span>
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

function UpdateUserButton() {
  const { updateUser } = useAuth();
  return <button onClick={() => updateUser({ name: '수정된 이름', phone: '010-0000-0000' })}>update-user</button>;
}

function OAuthButtons() {
  const { loginWithKakao, loginWithGoogle } = useAuth();
  return (
    <>
      <button onClick={loginWithKakao}>kakao</button>
      <button onClick={loginWithGoogle}>google</button>
    </>
  );
}

function renderWithProvider(ui: React.ReactNode) {
  return render(<AuthProvider>{ui}</AuthProvider>);
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.stubEnv('NEXT_PUBLIC_KAKAO_CLIENT_ID', 'kakao-client');
    vi.stubEnv('NEXT_PUBLIC_KAKAO_REDIRECT_URI', 'https://shop.test/auth/kakao/callback');
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'google-client');
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_REDIRECT_URI', 'https://shop.test/auth/google/callback');
    vi.stubGlobal('crypto', {
      getRandomValues: (array: Uint8Array) => {
        array.fill(1);
        return array;
      },
    });
  });

  it('isLoading starts true then becomes false after init', async () => {
    vi.mocked(authApi.me).mockResolvedValue(mockUser);
    renderWithProvider(<AuthDisplay />);
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('idle');
    });
  });

  it('loads user from /auth/me on mount (cookie-based)', async () => {
    vi.mocked(authApi.me).mockResolvedValue(mockUser);
    renderWithProvider(<AuthDisplay />);
    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('test@example.com');
    });
    expect(authApi.me).toHaveBeenCalledTimes(1);
  });

  it('refreshes token when me() fails, then retries', async () => {
    vi.mocked(authApi.me)
      .mockRejectedValueOnce(new Error('Unauthorized'))
      .mockResolvedValueOnce(mockUser);
    vi.mocked(authApi.refresh).mockResolvedValue({ message: 'refreshed' });
    renderWithProvider(<AuthDisplay />);
    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('test@example.com');
    });
    expect(authApi.refresh).toHaveBeenCalledTimes(1);
    expect(authApi.me).toHaveBeenCalledTimes(2);
  });

  it('sets user to null when both me() and refresh fail', async () => {
    vi.mocked(authApi.me).mockRejectedValue(new Error('Unauthorized'));
    vi.mocked(authApi.refresh).mockRejectedValue(new Error('Refresh failed'));
    renderWithProvider(<AuthDisplay />);
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('idle');
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('no');
  });

  it('login success sets user', async () => {
    vi.mocked(authApi.me).mockRejectedValue(new Error('Unauthorized'));
    vi.mocked(authApi.refresh).mockRejectedValue(new Error('Refresh failed'));
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
  });

  it('login failure does not set user', async () => {
    vi.mocked(authApi.me).mockRejectedValue(new Error('Unauthorized'));
    vi.mocked(authApi.refresh).mockRejectedValue(new Error('Refresh failed'));
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

  it('logout clears user', async () => {
    vi.mocked(authApi.me).mockResolvedValue(mockUser);
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
  });

  it('register does not auto-login', async () => {
    vi.mocked(authApi.me).mockRejectedValue(new Error('Unauthorized'));
    vi.mocked(authApi.refresh).mockRejectedValue(new Error('Refresh failed'));
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
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('updateUser merges partial user fields without dropping existing profile', async () => {
    vi.mocked(authApi.me).mockResolvedValue(mockUser);
    const { getByRole } = renderWithProvider(
      <>
        <AuthDisplay />
        <UpdateUserButton />
      </>,
    );
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('test@example.com'));

    await act(async () => {
      getByRole('button', { name: 'update-user' }).click();
    });

    expect(screen.getByTestId('user').textContent).toBe('test@example.com');
    expect(screen.getByTestId('name').textContent).toBe('수정된 이름');
  });

  it('loginWithKakao stores CSRF state and redirects to Kakao authorize URL', async () => {
    vi.mocked(authApi.me).mockRejectedValue(new Error('Unauthorized'));
    vi.mocked(authApi.refresh).mockRejectedValue(new Error('Refresh failed'));
    const { getByRole } = renderWithProvider(<OAuthButtons />);
    await waitFor(() => expect(screen.queryByText('loading')).not.toBeInTheDocument());

    await act(async () => {
      getByRole('button', { name: 'kakao' }).click();
    });

    const state = sessionStorage.getItem('oauth_state');
    expect(state).toBe('01'.repeat(32));
    expect(redirectTo).toHaveBeenCalledWith(expect.stringContaining('https://kauth.kakao.com/oauth/authorize'));
    expect(redirectTo).toHaveBeenCalledWith(expect.stringContaining('client_id=kakao-client'));
    expect(redirectTo).toHaveBeenCalledWith(expect.stringContaining('redirect_uri=https%3A%2F%2Fshop.test%2Fauth%2Fkakao%2Fcallback'));
    expect(redirectTo).toHaveBeenCalledWith(expect.stringContaining(`state=${state}`));
  });

  it('loginWithGoogle stores CSRF state and redirects with openid email profile scope', async () => {
    vi.mocked(authApi.me).mockRejectedValue(new Error('Unauthorized'));
    vi.mocked(authApi.refresh).mockRejectedValue(new Error('Refresh failed'));
    const { getByRole } = renderWithProvider(<OAuthButtons />);
    await waitFor(() => expect(authApi.refresh).toHaveBeenCalled());

    await act(async () => {
      getByRole('button', { name: 'google' }).click();
    });

    const state = sessionStorage.getItem('oauth_state');
    expect(state).toBe('01'.repeat(32));
    expect(redirectTo).toHaveBeenCalledWith(expect.stringContaining('https://accounts.google.com/o/oauth2/v2/auth'));
    expect(redirectTo).toHaveBeenCalledWith(expect.stringContaining('client_id=google-client'));
    expect(redirectTo).toHaveBeenCalledWith(expect.stringContaining('redirect_uri=https%3A%2F%2Fshop.test%2Fauth%2Fgoogle%2Fcallback'));
    expect(redirectTo).toHaveBeenCalledWith(expect.stringContaining('scope=openid%20email%20profile'));
    expect(redirectTo).toHaveBeenCalledWith(expect.stringContaining(`state=${state}`));
  });
});
