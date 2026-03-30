import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MobileBottomNav from '@/components/MobileBottomNav';

let mockPathname = '/';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockUseCart = vi.fn();
vi.mock('@/contexts/CartContext', () => ({
  useCart: () => mockUseCart(),
}));

beforeEach(() => {
  mockPathname = '/';
  mockUseCart.mockReturnValue({ itemCount: 0 });
});

describe('MobileBottomNav', () => {
  it('바텀 네비 렌더링 - 5개 탭 표시', () => {
    render(<MobileBottomNav />);
    expect(screen.getByRole('link', { name: '홈' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '컬렉션' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Archive' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '장바구니' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '마이' })).toBeInTheDocument();
  });

  it('현재 경로에 해당하는 탭 active 스타일', () => {
    mockPathname = '/cart';
    render(<MobileBottomNav />);
    const cartLink = screen.getByRole('link', { name: '장바구니' });
    expect(cartLink).toHaveClass('text-foreground');
    const homeLink = screen.getByRole('link', { name: '홈' });
    expect(homeLink).toHaveClass('text-muted-foreground');
  });

  it('장바구니 아이템이 있으면 뱃지 표시', () => {
    mockUseCart.mockReturnValue({ itemCount: 3 });
    render(<MobileBottomNav />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('3');
  });

  it('장바구니 아이템이 없으면 뱃지 미표시', () => {
    mockUseCart.mockReturnValue({ itemCount: 0 });
    render(<MobileBottomNav />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
