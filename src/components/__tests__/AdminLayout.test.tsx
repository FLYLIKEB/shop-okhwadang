import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminLayout from '@/app/[locale]/admin/layout';

const mockReplace = vi.fn();
let mockPathname = '/admin/dashboard';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => mockPathname,
}));


const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-intl')>();
  const messages = (await import('@/i18n/messages/ko.json')).default as Record<string, unknown>;
  return {
    ...actual,
    useTranslations: (namespace: string) => (key: string) => {
      const value = namespace.split('.').reduce<unknown>((acc, part) => {
        if (acc && typeof acc === 'object' && part in acc) {
          return (acc as Record<string, unknown>)[part];
        }
        return undefined;
      }, messages);

      if (value && typeof value === 'object' && key in value) {
        return String((value as Record<string, unknown>)[key]);
      }

      return key;
    },
  };
});

beforeEach(() => {
  mockReplace.mockClear();
  mockPathname = '/admin/dashboard';
});


describe('AdminLayout', () => {
  it('user=null (not authenticated) → redirects to /login', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    render(<AdminLayout>children</AdminLayout>);
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('user.role=user → redirects to /', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: '일반유저', email: 'u@test.com', role: 'user' },
      isLoading: false,
    });
    render(<AdminLayout>children</AdminLayout>);
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('user.role=admin → renders children and sidebar', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 2, name: '관리자', email: 'a@test.com', role: 'admin' },
      isLoading: false,
      logout: vi.fn(),
    });
    render(<AdminLayout><div>dashboard content</div></AdminLayout>);
    expect(screen.getByText('dashboard content')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('user.role=super_admin → renders children', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 3, name: '최고관리자', email: 'sa@test.com', role: 'super_admin' },
      isLoading: false,
      logout: vi.fn(),
    });
    render(<AdminLayout><div>super admin content</div></AdminLayout>);
    expect(screen.getByText('super admin content')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe('AdminSidebar', () => {
  it('renders all nav menu items', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 2, name: '관리자', email: 'a@test.com', role: 'admin' },
      isLoading: false,
      logout: vi.fn(),
    });
    render(<AdminLayout><span /></AdminLayout>);
    const homeLink = screen.getByRole('link', { name: '쇼핑몰로 돌아가기' });
    expect(homeLink).toHaveAttribute('href', '/');
    expect(screen.getByText('대시보드')).toBeInTheDocument();

    // Nav groups are collapsed by default — open each to reveal children
    fireEvent.click(screen.getByText('상품'));
    expect(screen.getByText('상품관리')).toBeInTheDocument();
    expect(screen.getByText('카테고리관리')).toBeInTheDocument();

    fireEvent.click(screen.getByText('운영'));
    expect(screen.getByText('주문관리')).toBeInTheDocument();
    expect(screen.getByText('회원관리')).toBeInTheDocument();
    expect(screen.getByText('쿠폰관리')).toBeInTheDocument();
    expect(screen.getByText('쿠폰 규칙')).toBeInTheDocument();
    expect(screen.getByText('적립금관리')).toBeInTheDocument();

    fireEvent.click(screen.getByText('CMS'));
    expect(screen.getByText('페이지관리')).toBeInTheDocument();
    expect(screen.getByText('네비게이션관리')).toBeInTheDocument();
    expect(screen.getByText('안내바관리')).toBeInTheDocument();
  });

  it('shows the coupon rules section title in the header for nested coupon routes', () => {
    mockPathname = '/admin/coupons/rules';
    mockUseAuth.mockReturnValue({
      user: { id: 2, name: '관리자', email: 'a@test.com', role: 'admin' },
      isLoading: false,
      logout: vi.fn(),
    });

    render(<AdminLayout><span /></AdminLayout>);

    expect(screen.getByText('쿠폰 규칙')).toBeInTheDocument();
  });
});
