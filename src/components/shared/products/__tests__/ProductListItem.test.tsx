import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProductListItem from '@/components/shared/products/ProductListItem';
import type { ProductImage } from '@/lib/api';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) =>
    ({
      badgeFreeShipping: '무료배송',
      ratingSummary: `${values?.rating ?? 0}(${values?.count ?? 0})`,
      okhwadang: '옥화당',
    }[key] ?? key),
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, locale, children, ...props }: { href: string; locale?: string; children: React.ReactNode }) => (
    <a href={locale ? `/${locale}${href}` : href} {...props}>
      {children}
    </a>
  ),
}));

const images: ProductImage[] = [{ id: 1, url: 'https://example.com/a.jpg', sortOrder: 0 } as ProductImage];

function renderItem(overrides: Partial<React.ComponentProps<typeof ProductListItem>> = {}) {
  return render(
    <ProductListItem
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

describe('ProductListItem locale-aware navigation', () => {
  it('links to the English product detail route when locale is en', () => {
    renderItem({ locale: 'en' });

    expect(screen.getByRole('link', { name: /자사호/ })).toHaveAttribute('href', '/en/products/1');
  });

  it('links to the Korean product detail route when locale is ko', () => {
    renderItem({ locale: 'ko' });

    expect(screen.getByRole('link', { name: /자사호/ })).toHaveAttribute('href', '/ko/products/1');
  });
});

describe('ProductListItem free-shipping badge', () => {
  it('renders the free-shipping badge when isFreeShipping is true', () => {
    renderItem({ isFreeShipping: true });

    expect(screen.getByText('무료배송')).toBeInTheDocument();
  });

  it('does not render the badge for a regular product', () => {
    renderItem({ isFreeShipping: false });

    expect(screen.queryByText('무료배송')).not.toBeInTheDocument();
  });
});

describe('ProductListItem rating display', () => {
  it('shows one star and the rating summary beside the product name', () => {
    renderItem({ rating: 4.3, reviewCount: 15 });

    const ratingSummary = screen.getByText('4.3(15)');
    expect(ratingSummary).toBeInTheDocument();
    expect(screen.getByText('자사호').parentElement).toContainElement(ratingSummary);
    expect(screen.getByRole('group').querySelectorAll('button')).toHaveLength(1);
  });
});

describe('ProductListItem image presentation', () => {
  it('prefers the generated thumbnail URL and falls back to the original URL', () => {
    renderItem({
      images: [{ ...images[0], thumbnailUrl: 'https://example.com/thumb.webp' }],
    });

    expect(screen.getByAltText('자사호')).toHaveAttribute('src', 'https://example.com/thumb.webp');
  });


  it('keeps the list item fixed sizes and lazy loading policy on the product image', () => {
    renderItem();

    const image = screen.getByAltText('자사호');

    expect(image).toHaveAttribute('sizes', '96px');
    expect(image).toHaveAttribute('loading', 'lazy');
  });

  it('renders the fallback logo when the product has no image URL', () => {
    renderItem({ images: [] });

    const fallback = screen.getByTestId('product-list-item-image-fallback');
    expect(fallback).toHaveClass('bg-neutral-200');
    expect(screen.getByAltText('옥화당')).toHaveAttribute('src', '/logo-okhwadang.png');
    expect(screen.queryByAltText('자사호')).not.toBeInTheDocument();
  });

  it('renders the image frame and image badges without rounded corners', () => {
    renderItem({ isFreeShipping: true });

    expect(screen.getByTestId('product-list-item-image-frame')).not.toHaveClass('rounded-md');
    expect(screen.getByText('무료배송')).not.toHaveClass('rounded-sm');
  });

  it('replaces a failed product image with the Okhwadang logo fallback on a neutral gray background', () => {
    renderItem();

    fireEvent.error(screen.getByAltText('자사호'));

    const fallback = screen.getByTestId('product-list-item-image-fallback');
    expect(fallback).toHaveClass('bg-neutral-200');
    expect(screen.getByAltText('옥화당')).toHaveAttribute('src', '/logo-okhwadang.png');
    expect(screen.queryByAltText('자사호')).not.toBeInTheDocument();
  });
});
