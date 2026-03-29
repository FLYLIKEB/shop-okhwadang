import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RecentlyViewedWidget from '@/components/RecentlyViewedWidget';
import type { RecentlyViewedProduct } from '@/hooks/useRecentlyViewed';

const mockUseRecentlyViewed = vi.fn();
vi.mock('@/hooks/useRecentlyViewed', () => ({
  useRecentlyViewed: () => mockUseRecentlyViewed(),
}));

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}));

beforeEach(() => {
  mockUseRecentlyViewed.mockClear();
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
});
