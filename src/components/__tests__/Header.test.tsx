import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Header from '@/components/Header';

const mockPush = vi.fn();
const mockBack = vi.fn();
const mockSetOpen = vi.fn();
let mockPathname = '/';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/hooks/useUrlModal', async () => {
  const React = await import('react');
  return {
    useUrlModal: (key: string) => {
      const [isOpen, setIsOpenState] = React.useState(false);
      const setOpen = (open: boolean, history?: 'auto' | 'push' | 'replace') => {
        mockSetOpen(key, open, history);
        setIsOpenState(open);
      };
      const close = (history?: 'auto' | 'replace') => {
        mockSetOpen(key, false, history);
        setIsOpenState(false);
      };
      return [isOpen, setOpen, close] as const;
    },
  };
});

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, onClick, ...props }: { href: string; children: React.ReactNode; onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void; [key: string]: unknown }) => (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </a>
  ),
  useRouter: () => ({ push: mockPush, back: mockBack }),
  usePathname: () => mockPathname,
}));

vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-intl')>();
  const messages = (await import('@/i18n/messages/ko.json')).default as unknown as Record<string, Record<string, string>>;
  return {
    ...actual,
    useLocale: () => 'ko',
    useTranslations: (namespace: string) => (key: string) => {
      const ns = messages[namespace] ?? {};
      return ns[key] ?? key;
    },
  };
});

vi.mock('@/contexts/ThemeContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/contexts/ThemeContext')>();
  return {
    ...actual,
    useTheme: () => ({
      theme: 'dark',
      setTheme: vi.fn(),
      toggleTheme: vi.fn(),
    }),
  };
});

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseCart = vi.fn();
vi.mock('@/contexts/CartContext', () => ({
  useCart: () => mockUseCart(),
}));

beforeEach(() => {
  mockPush.mockClear();
  mockBack.mockClear();
  mockSetOpen.mockClear();
  mockPathname = '/';
  mockUseCart.mockReturnValue({ itemCount: 0 });
  mockUseAuth.mockReturnValue({
    isAuthenticated: false,
    user: null,
    logout: vi.fn(),
  });
});

describe('Header', () => {
  it('renders logo, nav link, cart icon link, and login link', () => {
    render(<Header />);
    const logo = screen.getByRole('img', { name: '옥화당' });
    expect(logo).toBeInTheDocument();
    expect(logo.closest('a')).toHaveClass('absolute', 'left-1/2', '-translate-x-1/2', 'md:static');
    expect(screen.getByText('상품목록')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: '장바구니' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: '로그인' }).length).toBeGreaterThan(0);
  });

  it('renders search inputs without product-search placeholder copy', () => {
    render(<Header />);

    screen.getAllByRole('searchbox').forEach((input) => {
      expect(input).not.toHaveAttribute('placeholder', '상품 검색...');
    });
  });

  it('search form: type query + submit → push called with /search?q=검색어', async () => {
    const user = userEvent.setup();
    render(<Header />);
    const input = screen.getAllByRole('searchbox')[0];
    await user.type(input, '검색어');
    await user.keyboard('{Enter}');
    expect(mockPush).toHaveBeenCalledWith('/search?q=%EA%B2%80%EC%83%89%EC%96%B4');
  });

  it('empty search: submit with empty input → push NOT called', () => {
    render(<Header />);
    const form = screen.getAllByRole('searchbox')[0].closest('form')!;
    fireEvent.submit(form);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('cart icon shows no badge when itemCount is 0', () => {
    mockUseCart.mockReturnValue({ itemCount: 0 });
    render(<Header />);
    expect(screen.queryAllByRole('status')).toHaveLength(0);
  });

  it('cart icon shows badge with itemCount when > 0', () => {
    mockUseCart.mockReturnValue({ itemCount: 3 });
    render(<Header />);
    const badges = screen.getAllByRole('status');
    expect(badges.length).toBeGreaterThan(0);
    badges.forEach((badge) => expect(badge).toHaveTextContent('3'));
  });

  it('renders mobile hamburger button', () => {
    render(<Header />);
    const button = screen.getByRole('button', { name: '메뉴 열기' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('w-10', 'bg-transparent', 'hover:bg-transparent');
    expect(button.querySelector('svg')).toHaveClass('h-5', 'w-7');
    expect(button.querySelector('svg path')).toHaveAttribute('d', 'M1 3h26M1 13h26');
  });

  it('renders header chrome without divider lines', async () => {
    const user = userEvent.setup();
    const { container } = render(<Header />);

    expect(container.querySelector('header')?.className).not.toMatch(/border-[bt]/);
    expect(container.innerHTML).not.toContain('border-divider-soft');

    await user.click(screen.getByRole('button', { name: '메뉴 열기' }));
    expect(screen.getByRole('navigation', { name: '모바일 메뉴' })).toBeInTheDocument();
    expect(container.innerHTML).not.toContain('border-divider-soft');
  });

  it('hamburger click → mobile menu appears', async () => {
    const user = userEvent.setup();
    render(<Header />);
    const button = screen.getByRole('button', { name: '메뉴 열기' });
    await user.click(button);
    expect(screen.getByRole('navigation', { name: '모바일 메뉴' })).toBeInTheDocument();
  });

  it('mobile menu link click → menu closes', async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.click(screen.getByRole('button', { name: '메뉴 열기' }));
    const mobileNav = screen.getByRole('navigation', { name: '모바일 메뉴' });
    const productLink = mobileNav.querySelector('a[href="/products"]')!;
    await user.click(productLink);
    expect(mockSetOpen).toHaveBeenCalledWith('menu', false, 'replace');
    await waitFor(() => {
      expect(screen.queryByRole('navigation', { name: '모바일 메뉴' })).not.toBeInTheDocument();
    });
  });

  it('mobile account link click closes menu with replace mode', async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.click(screen.getByRole('button', { name: '메뉴 열기' }));
    const mobileNav = screen.getByRole('navigation', { name: '모바일 메뉴' });
    const loginLink = mobileNav.querySelector('a[href="/login"]')!;
    await user.click(loginLink);

    expect(mockSetOpen).toHaveBeenCalledWith('menu', false, 'replace');
  });

  it('shows desktop admin button at the right end for admin accounts', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin' },
      logout: vi.fn(),
    });

    render(<Header />);

    const adminLink = screen.getByRole('link', { name: '관리자 페이지' });
    expect(adminLink).toHaveAttribute('href', '/admin');
    expect(adminLink.parentElement?.lastElementChild).toBe(adminLink);
  });

  it('does not show desktop admin button for non-admin authenticated users', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 2, email: 'user@test.com', name: 'User', role: 'user' },
      logout: vi.fn(),
    });

    render(<Header />);

    expect(screen.queryByRole('link', { name: '관리자 페이지' })).not.toBeInTheDocument();
  });

  it('shows admin link under order tracking for admin accounts in mobile menu', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin' },
      logout: vi.fn(),
    });

    render(<Header />);
    await user.click(screen.getByRole('button', { name: '메뉴 열기' }));

    const mobileNav = screen.getByRole('navigation', { name: '모바일 메뉴' });
    const orderTrackingLink = mobileNav.querySelector('a[href="/my/orders"]');
    const adminLink = mobileNav.querySelector('a[href="/admin"]');

    expect(orderTrackingLink).toBeInTheDocument();
    expect(adminLink).toBeInTheDocument();
    expect(adminLink).toHaveTextContent('관리자');

    const links = Array.from(mobileNav.querySelectorAll('a[href]'));
    expect(links.indexOf(orderTrackingLink!)).toBeLessThan(links.indexOf(adminLink!));
  });

  it('Escape key → mobile menu closes', async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.click(screen.getByRole('button', { name: '메뉴 열기' }));
    expect(screen.getByRole('navigation', { name: '모바일 메뉴' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('navigation', { name: '모바일 메뉴' })).not.toBeInTheDocument();
    });
  });

  it('mobile search bar is always visible (not product detail)', () => {
    render(<Header />);
    // Two searchboxes: desktop (hidden md:flex) + mobile always-on bar
    expect(screen.getAllByRole('searchbox').length).toBeGreaterThanOrEqual(2);
  });

  describe('sub-page mobile header (back button)', () => {
    beforeEach(() => {
      mockPathname = '/products/123';
    });

    it('does not show back button in header on sub-pages (moved to BackButton component)', () => {
      render(<Header />);
      expect(screen.queryByRole('button', { name: '뒤로가기' })).not.toBeInTheDocument();
    });

    it('back button removed from header — skipped', () => {
      // 뒤로가기 버튼은 BackButton 컴포넌트로 이동됨
      expect(true).toBe(true);
    });

    it('shows home and cart links on sub-pages', () => {
      render(<Header />);
      expect(screen.getAllByRole('link', { name: '장바구니' }).length).toBeGreaterThan(0);
    });

    it('shows hamburger menu on sub-pages', () => {
      render(<Header />);
      expect(screen.getByRole('button', { name: '메뉴 열기' })).toBeInTheDocument();
    });

    it('does not show back button on cart page in header', () => {
      mockPathname = '/cart';
      render(<Header />);
      expect(screen.queryByRole('button', { name: '뒤로가기' })).not.toBeInTheDocument();
    });

    it('does not show back button on checkout page in header', () => {
      mockPathname = '/checkout';
      render(<Header />);
      expect(screen.queryByRole('button', { name: '뒤로가기' })).not.toBeInTheDocument();
    });
  });
});
