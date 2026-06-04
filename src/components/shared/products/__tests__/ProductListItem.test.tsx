import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProductListItem from '@/components/shared/products/ProductListItem';
import type { ProductImage } from '@/lib/api';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    ({
      badgeFreeShipping: '무료배송',
    }[key] ?? key),
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
