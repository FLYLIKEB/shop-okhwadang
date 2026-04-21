import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProfilePage from '@/app/[locale]/my/profile/page';
import { AuthContext } from '@/contexts/AuthContext';
import type { AuthContextValue } from '@/contexts/AuthContext';

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const dict: Record<string, Record<string, string>> = {
      myPage: { title: '마이페이지' },
      profile: {
        title: '회원정보',
        email: '이메일',
        emailReadOnly: '이메일은 변경할 수 없습니다.',
        name: '이름',
        phone: '전화번호',
        save: '저장하기',
        saving: '저장 중...',
        updateSuccess: '회원정보가 수정되었습니다.',
        updateError: '회원정보 수정에 실패했습니다.',
        'validation.nameRequired': '이름은 필수입니다.',
        'validation.phoneInvalid': '전화번호 형식이 올바르지 않습니다.',
      },
    };
    return dict[namespace]?.[key] ?? key;
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/api', () => ({
  usersApi: {
    updateProfile: vi.fn(),
  },
}));

function makeAuthValue(overrides?: Partial<AuthContextValue>): AuthContextValue {
  return {
    user: { id: 1, email: 'test@example.com', name: '홍길동', phone: '010-1234-5678', role: 'user' },
    token: 'token',
    isAuthenticated: true,
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

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders name and phone fields, email readonly', () => {
    render(
      <AuthContext.Provider value={makeAuthValue()}>
        <ProfilePage />
      </AuthContext.Provider>,
    );

    expect(screen.getByLabelText('이름 *')).toBeInTheDocument();
    expect(screen.getByLabelText('전화번호')).toBeInTheDocument();
    const emailInput = screen.getByLabelText('이메일') as HTMLInputElement;
    expect(emailInput.readOnly).toBe(true);
    expect(emailInput.value).toBe('test@example.com');
  });

  it('calls usersApi.updateProfile on submit', async () => {
    const user = userEvent.setup();
    const { usersApi } = await import('@/lib/api');
    vi.mocked(usersApi.updateProfile).mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      name: '홍길동',
      phone: '010-1234-5678',
      role: 'user',
    });

    const mockUpdateUser = vi.fn();
    render(
      <AuthContext.Provider value={makeAuthValue({ updateUser: mockUpdateUser })}>
        <ProfilePage />
      </AuthContext.Provider>,
    );

    await user.click(screen.getByRole('button', { name: '저장하기' }));

    await waitFor(() => {
      expect(usersApi.updateProfile).toHaveBeenCalledWith({
        name: '홍길동',
        phone: '010-1234-5678',
      });
    });
  });

  it('shows sonner toast on success', async () => {
    const user = userEvent.setup();
    const { usersApi } = await import('@/lib/api');
    const { toast } = await import('sonner');

    vi.mocked(usersApi.updateProfile).mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      name: '홍길동',
      phone: null,
      role: 'user',
    });

    render(
      <AuthContext.Provider value={makeAuthValue()}>
        <ProfilePage />
      </AuthContext.Provider>,
    );

    await user.click(screen.getByRole('button', { name: '저장하기' }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('회원정보가 수정되었습니다.');
    });
  });
});
