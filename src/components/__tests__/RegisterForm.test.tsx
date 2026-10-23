import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RegisterForm from '@/components/shared/auth/RegisterForm';
import { AuthContext } from '@/contexts/AuthContext';
import type { AuthContextValue } from '@/contexts/AuthContext';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
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

function renderRegisterForm(authValue: AuthContextValue) {
  return render(
    <AuthContext.Provider value={authValue}>
      <RegisterForm />
    </AuthContext.Provider>,
  );
}

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form fields', () => {
    renderRegisterForm(makeAuthValue());
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Sign Up" })).toBeInTheDocument();
  });

  it('shows email validation error for invalid email', async () => {
    const user = userEvent.setup();
    renderRegisterForm(makeAuthValue());

    await user.type(screen.getByLabelText("Name"), '홍길동');
    await user.type(screen.getByLabelText("Email"), 'not-valid');
    await user.type(screen.getByLabelText("Password"), 'password1');
    await user.type(screen.getByLabelText("Confirm Password"), 'password1');
    // Use fireEvent.submit to bypass native HTML email constraint validation in jsdom
    fireEvent.submit(screen.getByRole('button', { name: "Sign Up" }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByText("Please enter a valid email address.")).toBeInTheDocument();
    });
  });

  it('shows password validation error for weak password', async () => {
    const user = userEvent.setup();
    renderRegisterForm(makeAuthValue());

    await user.type(screen.getByLabelText("Name"), '홍길동');
    await user.type(screen.getByLabelText("Email"), 'test@example.com');
    await user.type(screen.getByLabelText("Password"), 'short');
    await user.type(screen.getByLabelText("Confirm Password"), 'short');
    await user.click(screen.getByRole('button', { name: "Sign Up" }));

    await waitFor(() => {
      expect(screen.getByText("Password must be at least 8 characters.")).toBeInTheDocument();
    });
  });

  it('shows passwordConfirm mismatch error', async () => {
    const user = userEvent.setup();
    renderRegisterForm(makeAuthValue());

    await user.type(screen.getByLabelText("Name"), '홍길동');
    await user.type(screen.getByLabelText("Email"), 'test@example.com');
    await user.type(screen.getByLabelText("Password"), 'password1');
    await user.type(screen.getByLabelText("Confirm Password"), 'different1');
    await user.click(screen.getByRole('button', { name: "Sign Up" }));

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    });
  });

  it('calls register with valid data on submit', async () => {
    const user = userEvent.setup();
    const mockRegister = vi.fn().mockResolvedValue(undefined);
    renderRegisterForm(makeAuthValue({ register: mockRegister }));

    await user.type(screen.getByLabelText("Name"), '홍길동');
    await user.type(screen.getByLabelText("Email"), 'test@example.com');
    await user.type(screen.getByLabelText("Password"), 'password1!');
    await user.type(screen.getByLabelText("Confirm Password"), 'password1!');
    await user.click(screen.getByRole('button', { name: "Sign Up" }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('test@example.com', 'password1!', '홍길동');
    });
  });
});
