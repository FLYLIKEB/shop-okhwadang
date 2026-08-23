import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import CartItemRow from '@/components/shared/cart/CartItemRow';
import { CartItem } from '@/lib/api';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img data-fill={fill ? 'true' : undefined} {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)} />;
  },
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, locale, children, ...props }: { href: string; locale?: string; children: React.ReactNode }) => (
    <a href={locale ? `/${locale}${href}` : href} {...props}>
      {children}
    </a>
  ),
}));

const baseItem: CartItem = {
  id: 1,
  productId: 10,
  productOptionId: null,
  quantity: 2,
  unitPrice: 15000,
  subtotal: 30000,
  product: {
    id: 10,
    name: '테스트 상품',
    slug: 'test-product',
    price: 15000,
    salePrice: null,
    status: 'active',
    images: [{ id: 1, url: '/img/test.jpg', thumbnailUrl: null, alt: '썸네일', sortOrder: 0, isThumbnail: true, isDescriptionImage: false }],
  },
  option: null,
};

describe('CartItemRow', () => {
  it('uses the generated thumbnail URL when it is available', () => {
    render(
      <CartItemRow
        item={{
          ...baseItem,
          product: {
            ...baseItem.product,
            images: [{ ...baseItem.product.images[0], thumbnailUrl: '/img/thumb.webp' }],
          },
        }}
        selected={false}
        onSelect={vi.fn()}
        onQuantityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByAltText('썸네일')).toHaveAttribute('src', '/img/thumb.webp');
  });

  it('renders the product price once with the quantity subtotal', () => {
    const onSelect = vi.fn();
    const onQuantityChange = vi.fn();
    const onRemove = vi.fn();
    render(
      <CartItemRow
        item={baseItem}
        selected={false}
        onSelect={onSelect}
        onQuantityChange={onQuantityChange}
        onRemove={onRemove}
      />,
    );
    expect(screen.getByText('테스트 상품')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '테스트 상품' })).toHaveAttribute('href', '/ko/products/10');
    expect(screen.getByRole('link', { name: '썸네일' })).toHaveAttribute('href', '/ko/products/10');
    expect(screen.queryByText('₩15,000')).not.toBeInTheDocument();
    expect(screen.getAllByText('2')).toHaveLength(1);
    expect(screen.getAllByText('₩30,000')).toHaveLength(1);
  });

  it('keeps the cart content in a mobile-safe responsive row', () => {
    const { container } = render(
      <CartItemRow
        item={baseItem}
        selected={false}
        onSelect={vi.fn()}
        onQuantityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    const row = container.querySelector('.checkout-toss-cart-item');
    const content = container.querySelector('.checkout-toss-cart-item__content');
    expect(row).toHaveClass('flex', 'items-start');
    expect(content).toHaveClass('min-w-0', 'flex-1');
    expect(content?.querySelector('.checkout-toss-cart-item__info')).toBeInTheDocument();
    expect(content?.querySelector('.checkout-toss-cart-item__price')).toBeInTheDocument();
    expect(content?.querySelector('.checkout-toss-cart-item__quantity')).toBeInTheDocument();
    expect(content?.querySelector('.checkout-toss-cart-item__remove')).toBeInTheDocument();
  });

  it('renders option text when option is provided', () => {
    const itemWithOption: CartItem = {
      ...baseItem,
      option: { id: 5, name: '색상', value: '블랙', priceAdjustment: 0 },
    };
    render(
      <CartItemRow
        item={itemWithOption}
        selected={false}
        onSelect={vi.fn()}
        onQuantityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByText('색상: 블랙')).toBeInTheDocument();
  });

  it('does NOT render option text when option is null', () => {
    render(
      <CartItemRow
        item={baseItem}
        selected={false}
        onSelect={vi.fn()}
        onQuantityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.queryByText(/:/)).not.toBeInTheDocument();
  });

  it('+ button calls onQuantityChange with quantity+1', async () => {
    const user = userEvent.setup();
    const onQuantityChange = vi.fn();
    render(
      <CartItemRow
        item={baseItem}
        selected={false}
        onSelect={vi.fn()}
        onQuantityChange={onQuantityChange}
        onRemove={vi.fn()}
      />,
    );
    await user.click(screen.getAllByRole('button', { name: '수량 증가' })[0]);
    expect(onQuantityChange).toHaveBeenCalledWith(1, 3);
  });

  it('- button is disabled and does NOT call onQuantityChange when quantity=1', async () => {
    const user = userEvent.setup();
    const onQuantityChange = vi.fn();
    const itemQty1 = { ...baseItem, quantity: 1, subtotal: 15000 };
    render(
      <CartItemRow
        item={itemQty1}
        selected={false}
        onSelect={vi.fn()}
        onQuantityChange={onQuantityChange}
        onRemove={vi.fn()}
      />,
    );
    const decreaseBtn = screen.getAllByRole('button', { name: '수량 감소' })[0];
    expect(decreaseBtn).toBeDisabled();
    await user.click(decreaseBtn);
    expect(onQuantityChange).not.toHaveBeenCalled();
  });

  it('delete button calls onRemove with item id', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(
      <CartItemRow
        item={baseItem}
        selected={false}
        onSelect={vi.fn()}
        onQuantityChange={vi.fn()}
        onRemove={onRemove}
      />,
    );
    await user.click(screen.getAllByRole('button', { name: '테스트 상품 삭제' })[0]);
    expect(onRemove).toHaveBeenCalledWith(1);
  });
});
