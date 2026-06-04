import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProductCard from '@/components/shared/products/ProductCard';
import type { ProductImage } from '@/lib/api';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    ({
      addToCart: '장바구니 담기',
      addingToCart: '담는 중...',
      badgeFreeShipping: '무료배송',
      toggleOn: '위시리스트에 추가',
      toggleOff: '위시리스트에서 삭제',
    }[key] ?? key),
}));

vi.mock('@/components/shared/hooks/useWishlistToggle', () => ({
  useWishlistToggle: () => ({ isWishlisted: false, loading: false, toggle: vi.fn() }),
}));

vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({ addItem: vi.fn() }),
}));

const images: ProductImage[] = [{ id: 1, url: 'https://example.com/a.jpg', sortOrder: 0 } as ProductImage];

function renderCard(overrides: Partial<React.ComponentProps<typeof ProductCard>> = {}) {
  return render(
    <ProductCard
      id={1}
      name="자사호"
      price={50000}
      salePrice={null}
      status="active"
      images={images}
      {...overrides}
    />,
  );
}

describe('ProductCard free-shipping badge', () => {
  it('renders the free-shipping badge when isFreeShipping is true', () => {
    renderCard({ isFreeShipping: true });

    expect(screen.getByText('무료배송')).toBeInTheDocument();
  });

  it('does not render the badge for a regular product', () => {
    renderCard({ isFreeShipping: false });

    expect(screen.queryByText('무료배송')).not.toBeInTheDocument();
  });

  it('does not render the badge when isFreeShipping is omitted', () => {
    renderCard();

    expect(screen.queryByText('무료배송')).not.toBeInTheDocument();
  });
});
