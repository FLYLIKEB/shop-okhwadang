'use client';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import OAuthCallbackHandler from '@/components/shared/auth/OAuthCallbackHandler';
import { AuthTokenResponse } from '@/lib/api';

// Mock next/navigation
const mockReplace = vi.fn();
const mockGet = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => ({ get: mockGet }),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from 'sonner';

describe('OAuthCallbackHandler', () => {
  const mockApiMethod = vi.fn<[string, string | null], Promise<AuthTokenResponse>>();

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('renders loading text with provider name', () => {
    mockGet.mockReturnValue(null);
    render(
      <OAuthCallbackHandler
        provider="kakao"
        apiMethod={mockApiMethod}
      />
    );
    expect(screen.getByText('kakao 로그인 처리 중...')).toBeInTheDocument();
  });

  it('redirects to /login when code is missing', async () => {
    mockGet.mockImplementation((key: string) => (key === 'code' ? null : 'some-state'));
    sessionStorage.setItem('oauth_state', 'some-state');

    render(
      <OAuthCallbackHandler
        provider="kakao"
        apiMethod={mockApiMethod}
      />
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('인증 코드가 없습니다.');
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('redirects to /login when state does not match', async () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'code') return 'auth-code';
      if (key === 'state') return 'wrong-state';
      return null;
    });
    sessionStorage.setItem('oauth_state', 'correct-state');

    render(
      <OAuthCallbackHandler
        provider="google"
        apiMethod={mockApiMethod}
      />
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('보안 검증에 실패했습니다. 다시 시도해 주세요.');
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('calls apiMethod and shows success toast on success', async () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'code') return 'auth-code';
      if (key === 'state') return 'valid-state';
      return null;
    });
    sessionStorage.setItem('oauth_state', 'valid-state');
    mockApiMethod.mockResolvedValue({ user: { id: 1, email: 'test@test.com', name: 'Test', role: 'user', createdAt: '' } } as AuthTokenResponse);

    // Mock window.location.href setter
    const { location } = window;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).location = { href: '' };

    render(
      <OAuthCallbackHandler
        provider="kakao"
        apiMethod={mockApiMethod}
      />
    );

    await waitFor(() => {
      expect(mockApiMethod).toHaveBeenCalledWith('auth-code', 'valid-state');
      expect(toast.success).toHaveBeenCalledWith('kakao 로그인되었습니다.');
      expect(window.location.href).toBe('/');
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).location = location;
  });

  it('shows error toast and redirects on api failure', async () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'code') return 'auth-code';
      if (key === 'state') return 'valid-state';
      return null;
    });
    sessionStorage.setItem('oauth_state', 'valid-state');
    mockApiMethod.mockRejectedValue(new Error('서버 오류'));

    render(
      <OAuthCallbackHandler
        provider="google"
        apiMethod={mockApiMethod}
      />
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('서버 오류');
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('removes oauth_state from sessionStorage on valid flow', async () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'code') return 'auth-code';
      if (key === 'state') return 'valid-state';
      return null;
    });
    sessionStorage.setItem('oauth_state', 'valid-state');
    mockApiMethod.mockResolvedValue({ user: { id: 1, email: 'test@test.com', name: 'Test', role: 'user', createdAt: '' } } as AuthTokenResponse);

    render(
      <OAuthCallbackHandler
        provider="kakao"
        apiMethod={mockApiMethod}
      />
    );

    await waitFor(() => {
      expect(sessionStorage.getItem('oauth_state')).toBeNull();
    });
  });
});
