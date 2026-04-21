import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RecentlyViewedWidget from '@/components/shared/RecentlyViewedWidget';
import type { RecentlyViewedProduct } from '@/components/shared/hooks/useRecentlyViewed';

const mockUseRecentlyViewed = vi.fn();
let mockPathname = '/';
vi.mock('@/components/shared/hooks/useRecentlyViewed', () => ({
  useRecentlyViewed: () => mockUseRecentlyViewed(),
}));

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/hooks/useUrlModal', async () => {
  const React = await import('react');
  return {
    useUrlModal: () => {
      const [isOpen, setIsOpenState] = React.useState(false);
      const setOpen = (open: boolean) => setIsOpenState(open);
      const close = () => setIsOpenState(false);
      return [isOpen, setOpen, close] as const;
    },
  };
});

beforeEach(() => {
  mockUseRecentlyViewed.mockClear();
  mockPathname = '/';
});

const makeItem = (id: number): RecentlyViewedProduct => ({
  id,
  name: `Product ${id}`,
  price: 10000,
  salePrice: null,
  thumbnail: null,
  slug: `product-${id}`,
  viewedAt: new Date().toISOString(),
});

describe('RecentlyViewedWidget', () => {
  it('items 없으면 렌더링 안 함', () => {
    mockUseRecentlyViewed.mockReturnValue({ items: [], addItem: vi.fn(), clear: vi.fn() });
    const { container } = render(<RecentlyViewedWidget />);
    expect(container.firstChild).toBeNull();
  });

  it('items 있으면 위젯 버튼 표시', () => {
    mockUseRecentlyViewed.mockReturnValue({
      items: [makeItem(1), makeItem(2)],
      addItem: vi.fn(),
      clear: vi.fn(),
    });
    render(<RecentlyViewedWidget />);
    expect(screen.getByLabelText('최근 본 상품')).toBeInTheDocument();
  });

  it('cart 경로에서는 모바일 하단 CTA와 겹치지 않도록 더 위로 배치', () => {
    mockPathname = '/ko/cart';
    mockUseRecentlyViewed.mockReturnValue({
      items: [makeItem(1)],
      addItem: vi.fn(),
      clear: vi.fn(),
    });

    const { container } = render(<RecentlyViewedWidget />);
    expect(container.firstChild).toHaveClass('bottom-40');
  });
});
