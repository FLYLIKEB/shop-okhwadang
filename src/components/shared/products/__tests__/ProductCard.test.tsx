import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProductCard from '@/components/shared/products/ProductCard';
import { toast } from 'sonner';
import type { ProductImage } from '@/lib/api';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) =>
    ({
      addToCart: '장바구니 담기',
      addingToCart: '담는 중...',
      badgeFreeShipping: '무료배송',
      toggleOn: '위시리스트에 추가',
      toggleOff: '위시리스트에서 삭제',
      cardReviewCount: `REVIEW ${values?.count ?? 0}`,
      addToCartSuccess: 'Added to cart.',
      addToCartError: 'Failed to add to cart.',
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

const addItem = vi.fn();
vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({ addItem }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

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

  it('renders category and shipping as plain text without colored badges or icon actions', () => {
    renderCard({ categoryName: 'premium ZHUNI teapot', isFreeShipping: true });
    const imageFrame = screen.getByTestId('product-card-image-frame');
    const category = screen.getByText('premium ZHUNI teapot');
    const shipping = screen.getByText('무료배송');
    expect(imageFrame).not.toContainElement(category);
    expect(imageFrame).toContainElement(shipping);
    expect(imageFrame.querySelector('button')).toBeNull();
    expect(category.className).not.toMatch(/tag-|bg-|shadow/);
    expect(shipping.className).not.toMatch(/tag-|bg-|shadow/);
    expect(imageFrame.querySelector('img')).not.toHaveClass('group-hover:scale-105');
  });

  it('shows ordered product attribute values as plain white text inside the bottom-right of the image', () => {
    renderCard({ categoryName: '자사호', attributes: [
      { id: 2, attributeTypeId: 2, value: 'xishi', displayValue: null, sortOrder: 2 },
      { id: 1, attributeTypeId: 1, value: 'zhuni', displayValue: '주니', sortOrder: 1 },
    ] });
    const frame = screen.getByTestId('product-card-image-frame');
    const attributes = screen.getByText('주니 · xishi');
    expect(frame).toContainElement(attributes);
    expect(attributes).toHaveClass('absolute', 'bottom-2', 'inset-x-2', 'text-right', 'text-white');
    expect(attributes.className).not.toMatch(/bg-|tag-|shadow/);
    expect(frame).not.toContainElement(screen.getAllByText('자사호').find((el) => el.tagName === 'P')!);
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
  it('keeps the text cart action at the bottom of the description on all screen sizes', () => {
    renderCard({ shortDescription: '120ml', reviewCount: 15 });
    const cartButton = screen.getByRole('button', { name: '장바구니 담기' });
    expect(cartButton).not.toHaveClass('hidden', 'absolute', 'md:opacity-0');
    expect(cartButton).toHaveClass('uppercase');
    expect(cartButton.parentElement?.parentElement?.lastElementChild).toBe(cartButton.parentElement);
    expect(cartButton).toBeVisible();
    expect(cartButton.querySelector('svg')).toBeNull();
  });

  it('adds the product once and disables the action while the request is pending', async () => {
    let finish!: () => void;
    addItem.mockReturnValueOnce(new Promise<void>((resolve) => { finish = resolve; }));
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: '장바구니 담기' }));
    expect(addItem).toHaveBeenLastCalledWith({ productId: 1, productOptionId: null, quantity: 1 });
    expect(screen.getByRole('button', { name: '담는 중...' })).toBeDisabled();
    await act(async () => finish());
    expect(screen.getByRole('button', { name: '장바구니 담기' })).toBeEnabled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('shows cart failures and restores the action', async () => {
    addItem.mockRejectedValueOnce(new Error('Cart unavailable'));
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: '장바구니 담기' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Cart unavailable'));
    expect(screen.getByRole('button', { name: '장바구니 담기' })).toBeEnabled();
  });

  it('shows plain sold-out text without dimming the image and hides the cart action', () => {
    renderCard({ status: 'soldout' });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    const frame = screen.getByTestId('product-card-image-frame');
    expect(frame.querySelector('.backdrop-blur-sm')).toBeNull();
    expect(frame.closest('article')).not.toHaveClass('opacity-60');
    expect(screen.getByText('stockStatus.soldout')).toBeInTheDocument();
  });
  it('compacts long attribute wording in the card summary', () => {
    renderCard({ shortDescription: 'Fujian Zhuni · Xishi Shape · 120ml · Gongfu Tea' });

    expect(screen.getByText('Fujian Zhuni · Xishi · 120ml · Gongfu Tea')).toBeInTheDocument();
    expect(screen.queryByText(/Xishi Shape/)).not.toBeInTheDocument();
  });

  it.each(['ko', 'en'] as const)('links the review count directly to the product reviews in %s', (locale) => {
    renderCard({ rating: 4.3, reviewCount: 15, locale });
    const reviews = screen.getByRole('link', { name: 'REVIEW 15' });
    expect(reviews).toHaveAttribute('href', `/${locale}/products/1#product-tabpanel-reviews`);
    expect(reviews.parentElement).toContainElement(screen.getByRole('button'));
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
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
