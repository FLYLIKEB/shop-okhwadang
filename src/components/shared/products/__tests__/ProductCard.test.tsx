import { fireEvent, render, screen } from '@testing-library/react';
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

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    locale = 'ko',
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; locale?: string }) => (
    <a href={`/${locale}${href}`} {...props}>{children}</a>
  ),
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

describe('ProductCard image presentation', () => {
  it('prefers the generated thumbnail URL and falls back to the original URL', () => {
    renderCard({
      images: [{ ...images[0], thumbnailUrl: 'https://example.com/thumb.webp' }],
    });

    expect(screen.getByAltText('자사호')).toHaveAttribute('src', 'https://example.com/thumb.webp');
  });

  it('renders the image frame and image badges without rounded corners', () => {
    renderCard({ categoryName: '자사호', isFreeShipping: true });

    const imageFrame = screen.getByTestId('product-card-image-frame');

    expect(imageFrame).not.toHaveClass('rounded-md');
    expect(imageFrame.querySelector('.tag-clay')).not.toHaveClass('rounded-sm');
    expect(screen.getByText('무료배송')).not.toHaveClass('rounded-sm');
  });

  it('replaces a failed product image with the Okhwadang logo fallback on a neutral gray background', () => {
    renderCard();

    fireEvent.error(screen.getByAltText('자사호'));

    const fallback = screen.getByTestId('product-card-image-fallback');
    expect(fallback).toHaveClass('bg-neutral-200');
    expect(screen.getByAltText('옥화당')).toHaveAttribute('src', '/logo-okhwadang.png');
    expect(screen.queryByAltText('자사호')).not.toBeInTheDocument();
  });
});

describe('ProductCard summary display', () => {
  it('compacts long attribute wording in the card summary', () => {
    renderCard({ shortDescription: 'Fujian Zhuni · Xishi Shape · 120ml · Gongfu Tea' });

    expect(screen.getByText('Fujian Zhuni · Xishi · 120ml · Gongfu Tea')).toBeInTheDocument();
    expect(screen.queryByText(/Xishi Shape/)).not.toBeInTheDocument();
  });
});

describe('ProductCard locale-aware navigation', () => {
  it('renders English product detail links under /en', () => {
    renderCard({ locale: 'en' });

    expect(screen.getByRole('link')).toHaveAttribute('href', '/en/products/1');
  });
});
