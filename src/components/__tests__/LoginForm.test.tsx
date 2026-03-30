import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginForm from '@/components/auth/LoginForm';
import { AuthContext } from '@/contexts/AuthContext';
import type { AuthContextValue } from '@/contexts/AuthContext';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function makeAuthValue(overrides?: Partial<AuthContextValue>): AuthContextValue {
  return {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    loginWithKakao: vi.fn(),
    loginWithGoogle: vi.fn(),
    ...overrides,
  };
}

function renderLoginForm(authValue: AuthContextValue) {
  return render(
    <AuthContext.Provider value={authValue}>
      <LoginForm />
    </AuthContext.Provider>,
  );
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email and password fields', () => {
    renderLoginForm(makeAuthValue());
    expect(screen.getByLabelText('이메일')).toBeInTheDocument();
    expect(screen.getByLabelText('비밀번호')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
  });

  it('shows social login buttons', () => {
    renderLoginForm(makeAuthValue());
    expect(screen.getByRole('button', { name: /카카오로 로그인/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Google로 로그인/ })).toBeInTheDocument();
  });

  it('calls login with valid credentials on submit', async () => {
    const user = userEvent.setup();
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    renderLoginForm(makeAuthValue({ login: mockLogin }));

    await user.type(screen.getByLabelText('이메일'), 'test@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'password1');
    await user.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password1');
    });
  });

  it('calls loginWithKakao on kakao button click', async () => {
    const user = userEvent.setup();
    const mockKakao = vi.fn();
    renderLoginForm(makeAuthValue({ loginWithKakao: mockKakao }));

    await user.click(screen.getByRole('button', { name: /카카오로 로그인/ }));
    expect(mockKakao).toHaveBeenCalledTimes(1);
  });

  it('calls loginWithGoogle on google button click', async () => {
    const user = userEvent.setup();
    const mockGoogle = vi.fn();
    renderLoginForm(makeAuthValue({ loginWithGoogle: mockGoogle }));

    await user.click(screen.getByRole('button', { name: /Google로 로그인/ }));
    expect(mockGoogle).toHaveBeenCalledTimes(1);
  });
});
