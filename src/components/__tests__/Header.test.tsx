import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Header from '@/components/Header';

const mockPush = vi.fn();
const mockBack = vi.fn();
let mockPathname = '/';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  usePathname: () => mockPathname,
}));

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
  mockPathname = '/';
  mockUseCart.mockReturnValue({ itemCount: 0 });
});

describe('Header', () => {
  it('renders logo, nav link, cart icon link, and login link', () => {
    render(<Header />);
    expect(screen.getByText('Commerce Demo')).toBeInTheDocument();
    expect(screen.getByText('상품목록')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: '장바구니' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: '로그인' })).toBeInTheDocument();
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
    expect(screen.queryByRole('navigation', { name: '모바일 메뉴' })).not.toBeInTheDocument();
  });

  it('Escape key → mobile menu closes', async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.click(screen.getByRole('button', { name: '메뉴 열기' }));
    expect(screen.getByRole('navigation', { name: '모바일 메뉴' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('navigation', { name: '모바일 메뉴' })).not.toBeInTheDocument();
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

    it('shows back button on sub-pages', () => {
      render(<Header />);
      expect(screen.getByRole('button', { name: '뒤로가기' })).toBeInTheDocument();
    });

    it('back button calls router.back()', async () => {
      const user = userEvent.setup();
      render(<Header />);
      await user.click(screen.getByRole('button', { name: '뒤로가기' }));
      expect(mockBack).toHaveBeenCalled();
    });

    it('shows home and cart links on sub-pages', () => {
      render(<Header />);
      expect(screen.getByRole('link', { name: '홈' })).toBeInTheDocument();
      expect(screen.getAllByRole('link', { name: '장바구니' }).length).toBeGreaterThan(0);
    });

    it('shows hamburger menu on sub-pages', () => {
      render(<Header />);
      expect(screen.getByRole('button', { name: '메뉴 열기' })).toBeInTheDocument();
    });

    it('shows back button on cart page', () => {
      mockPathname = '/cart';
      render(<Header />);
      expect(screen.getByRole('button', { name: '뒤로가기' })).toBeInTheDocument();
    });

    it('shows back button on checkout page', () => {
      mockPathname = '/checkout';
      render(<Header />);
      expect(screen.getByRole('button', { name: '뒤로가기' })).toBeInTheDocument();
    });
  });
});
