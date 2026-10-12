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

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img data-fill={fill ? 'true' : undefined} {...rest} />;
  },
}));

vi.mock('@/lib/api', () => ({
  adminInquiriesApi: {
    getAll: vi.fn(() => new Promise(() => undefined)),
  },
  adminOrdersApi: {
    getList: vi.fn(() => new Promise(() => undefined)),
  },
}));

function readMessage(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, source);
}

vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-intl')>();
  const messages = (await import('@/i18n/messages/ko.json')).default as Record<string, unknown>;
  return {
    ...actual,
    useTranslations: (namespace: string) => (key: string) => {
      const path = `${namespace}.${key}`;
      const value = readMessage(messages, path);
      return typeof value === 'string' ? value : key;
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
    expect(screen.getByRole('link', { name: '대시보드' })).toHaveAttribute('href', '/admin/dashboard');
    expect(screen.getByRole('link', { name: '어드민 가이드' })).toHaveAttribute('href', '/admin/guide');

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

    expect(screen.getAllByText('쿠폰 규칙').some((element) => element.tagName === 'P')).toBe(true);
  });

  it('shows collapsed contextual help for the current nested admin route', () => {
    mockPathname = '/admin/products/42/edit';
    mockUseAuth.mockReturnValue({
      user: { id: 2, name: '관리자', email: 'a@test.com', role: 'admin' },
      isLoading: false,
      logout: vi.fn(),
    });

    const { rerender } = render(<AdminLayout><input aria-label="상품명" defaultValue="자사호" /></AdminLayout>);
    fireEvent.change(screen.getByLabelText('상품명'), { target: { value: '작성 중인 상품' } });

    const guide = screen.getByText('이 화면 사용법').closest('details');
    expect(guide).not.toHaveAttribute('open');

    fireEvent.click(screen.getByText('이 화면 사용법'));
    expect(screen.getByRole('link', { name: '전체 가이드' })).toHaveAttribute('href', '/admin/guide#products');
    expect(screen.getByText('상품 등록·수정, 노출, 이미지, 옵션, 속성과 네이버 커머스 API 가져오기를 관리합니다.')).toBeInTheDocument();
    expect(screen.getByLabelText('상품명')).toHaveValue('작성 중인 상품');
    mockPathname = '/admin/products/43/edit';
    rerender(<AdminLayout><input aria-label="상품명" defaultValue="자사호" /></AdminLayout>);
    expect(screen.getByText('이 화면 사용법').closest('details')).not.toHaveAttribute('open');
    expect(screen.getByLabelText('상품명')).toHaveValue('작성 중인 상품');
  });

  it('shows the guide section title in the header', () => {
    mockPathname = '/ko/admin/guide';
    mockUseAuth.mockReturnValue({
      user: { id: 2, name: '관리자', email: 'a@test.com', role: 'admin' },
      isLoading: false,
      logout: vi.fn(),
    });

    render(<AdminLayout><span /></AdminLayout>);

    expect(screen.getAllByText('어드민 가이드').some((element) => element.tagName === 'P')).toBe(true);
    expect(screen.queryByText('이 화면 사용법')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '어드민 가이드' })).toHaveAttribute('aria-current', 'page');
  });
});
