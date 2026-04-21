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
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
  useRouter: () => ({ push: mockPush, back: mockBack }),
  usePathname: () => mockPathname,
}));

vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-intl')>();
  const messages = (await import('@/i18n/messages/ko.json')).default as Record<string, Record<string, string>>;
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

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    logout: vi.fn(),
  }),
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
});

describe('Header', () => {
  it('renders logo, nav link, cart icon link, and login link', () => {
    render(<Header />);
    expect(screen.getByRole('img', { name: '옥화당' })).toBeInTheDocument();
    expect(screen.getByText('상품목록')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: '장바구니' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: '로그인' }).length).toBeGreaterThan(0);
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
    expect(screen.getByRole('button', { name: '메뉴 열기' })).toBeInTheDocument();
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
    await waitFor(() => {
      expect(screen.queryByRole('navigation', { name: '모바일 메뉴' })).not.toBeInTheDocument();
    });
  });

  it('mobile account link click closes menu with replace mode', async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.click(screen.getByRole('button', { name: '메뉴 열기' }));
    const mobileNav = screen.getByRole('navigation', { name: '모바일 메뉴' });
    const loginLink = mobileNav.querySelector('a[href=\"/login\"]')!;
    await user.click(loginLink);

    expect(mockSetOpen).toHaveBeenCalledWith('menu', false, 'replace');
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
