import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProductCard from '@/components/shared/products/ProductCard';
import type { ProductImage } from '@/lib/api';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) =>
    ({
      addToCart: '장바구니 담기',
      addingToCart: '담는 중...',
      badgeFreeShipping: '무료배송',
      toggleOn: '위시리스트에 추가',
      toggleOff: '위시리스트에서 삭제',
      ratingSummary: `${values?.rating ?? 0}(${values?.count ?? 0})`,
      okhwadang: '옥화당',
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


  it('keeps the card responsive sizes and non-lazy policy on the product image', () => {
    renderCard({ priority: true });

    const image = screen.getByAltText('자사호');

    expect(image).toHaveAttribute('sizes', '(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw');
    expect(image).not.toHaveAttribute('loading', 'lazy');
  });

  it('renders the fallback logo when the product has no image URL', () => {
    renderCard({ images: [] });

    const fallback = screen.getByTestId('product-card-image-fallback');
    expect(fallback).toHaveClass('bg-neutral-200');
    expect(screen.getByAltText('옥화당')).toHaveAttribute('src', '/logo-okhwadang.png');
    expect(screen.queryByAltText('자사호')).not.toBeInTheDocument();
  });


  it('keeps image-link navigation separate from overlay actions', () => {
    renderCard();

    const imageLink = screen.getByRole('link', { name: '자사호' });
    const cartButton = screen.getByRole('button', { name: '장바구니 담기' });

    expect(imageLink).toHaveAttribute('href', '/ko/products/1');
    expect(imageLink).not.toContainElement(cartButton);
    expect(cartButton.closest('a')).toBeNull();
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

  it('shows one star and the rating summary beside the product name', () => {
    renderCard({ rating: 4.3, reviewCount: 15 });

    const ratingSummary = screen.getByText('4.3(15)');
    expect(ratingSummary).toBeInTheDocument();
    expect(screen.getByText('자사호').parentElement).toContainElement(ratingSummary);
    expect(screen.getByRole('group').querySelectorAll('button')).toHaveLength(1);
  });

  it('does not render a wishlist button', () => {
    renderCard();

    expect(screen.queryByRole('button', { name: '위시리스트에 추가' })).not.toBeInTheDocument();
  });
});

describe('ProductCard locale-aware navigation', () => {
  it('renders English product detail links under /en', () => {
    renderCard({ locale: 'en' });

    expect(screen.getByRole('link')).toHaveAttribute('href', '/en/products/1');
  });
});
