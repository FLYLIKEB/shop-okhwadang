import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProductImageFrame from '@/components/shared/products/ProductImageFrame';

const defaultProps = {
  alt: '자사호',
  sizes: '96px',
  frameClassName: 'h-24 w-24 bg-muted',
  imageClassName: 'object-cover',
  frameTestId: 'product-image-frame',
  fallbackTestId: 'product-image-fallback',
  fallbackLogoAlt: '옥화당',
  fallbackLogoWidth: 72,
  fallbackLogoHeight: 21,
};

describe('ProductImageFrame', () => {
  it('uses the product alt text and image policy props for the primary image', () => {
    render(
      <ProductImageFrame
        {...defaultProps}
        imageUrl="https://example.com/a.jpg"
        loading="lazy"
        imageClassName="object-cover transition-transform"
      />,
    );

    const image = screen.getByAltText('자사호');

    expect(image).toHaveAttribute('src', 'https://example.com/a.jpg');
    expect(image).toHaveAttribute('sizes', '96px');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveClass('object-cover', 'transition-transform');
  });

  it('renders the fallback logo when imageUrl is missing', () => {
    render(<ProductImageFrame {...defaultProps} imageUrl={null} />);

    expect(screen.getByTestId('product-image-fallback')).toHaveClass('bg-neutral-200');
    expect(screen.getByAltText('옥화당')).toHaveAttribute('src', '/logo-okhwadang.png');
    expect(screen.getByAltText('옥화당')).toHaveAttribute('width', '72');
    expect(screen.getByAltText('옥화당')).toHaveAttribute('height', '21');
  });

  it('swaps to the fallback logo after an image error', () => {
    render(<ProductImageFrame {...defaultProps} imageUrl="https://example.com/a.jpg" />);

    fireEvent.error(screen.getByAltText('자사호'));

    expect(screen.getByTestId('product-image-fallback')).toBeInTheDocument();
    expect(screen.queryByAltText('자사호')).not.toBeInTheDocument();
  });

  it('keeps overlay children inside the relative frame', () => {
    render(
      <ProductImageFrame {...defaultProps} imageUrl={null}>
        <span data-testid="soldout-overlay" className="absolute inset-0">Sold out</span>
      </ProductImageFrame>,
    );

    expect(screen.getByTestId('product-image-frame')).toHaveClass('relative', 'overflow-hidden', 'h-24', 'w-24');
    expect(screen.getByTestId('product-image-frame')).toContainElement(screen.getByTestId('soldout-overlay'));
  });
});
