import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RecentlyViewedPage from '../page';
import type { RecentlyViewedProduct } from '@/components/shared/hooks/useRecentlyViewed';

const mockClear = vi.fn();
let mockItems: RecentlyViewedProduct[] = [];

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    ({
      title: '최근 본 상품',
      clearAll: '전체 삭제',
      clearSuccess: '삭제되었습니다.',
      noItems: '최근 본 상품이 없습니다.',
    }[key] ?? key),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn() },
}));

vi.mock('@/components/shared/hooks/useRecentlyViewed', () => ({
  useRecentlyViewed: () => ({ items: mockItems, clear: mockClear }),
}));

const recentItem: RecentlyViewedProduct = {
  id: 1,
  name: '자사호',
  price: 50000,
  salePrice: null,
  thumbnail: 'https://example.com/broken.jpg',
  slug: 'zisha-pot',
  viewedAt: '2026-06-04T00:00:00.000Z',
};

describe('RecentlyViewedPage product image presentation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockItems = [recentItem];
  });

  it('renders recently viewed product image frame without rounded corners', () => {
    render(<RecentlyViewedPage />);

    expect(screen.getByTestId('recently-viewed-product-image-frame')).not.toHaveClass('rounded-md');
  });

  it('replaces a failed recently viewed product image with the Okhwadang logo fallback on a neutral gray background', () => {
    render(<RecentlyViewedPage />);

    fireEvent.error(screen.getByAltText('자사호'));

    const fallback = screen.getByTestId('recently-viewed-product-image-fallback');
    expect(fallback).toHaveClass('bg-neutral-200');
    expect(screen.getByAltText('옥화당')).toHaveAttribute('src', '/logo-okhwadang.png');
    expect(screen.queryByAltText('자사호')).not.toBeInTheDocument();
  });
});
