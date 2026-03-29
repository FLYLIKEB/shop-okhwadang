import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminLayout from '@/app/admin/layout';

const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/admin/dashboard',
}));

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

beforeEach(() => {
  mockReplace.mockClear();
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
    expect(screen.getByText('대시보드')).toBeInTheDocument();
    expect(screen.getByText('상품관리')).toBeInTheDocument();
    expect(screen.getByText('카테고리관리')).toBeInTheDocument();
    expect(screen.getByText('주문관리')).toBeInTheDocument();
    expect(screen.getByText('회원관리')).toBeInTheDocument();
    expect(screen.getByText('페이지관리')).toBeInTheDocument();
    expect(screen.getByText('네비게이션관리')).toBeInTheDocument();
  });
});
