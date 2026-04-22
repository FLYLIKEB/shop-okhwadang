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
    images: [{ id: 1, url: '/img/test.jpg', alt: '썸네일', sortOrder: 0, isThumbnail: true }],
  },
  option: null,
};

describe('CartItemRow', () => {
  it('renders product name, unitPrice, quantity, subtotal', () => {
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
    expect(screen.getAllByText('₩15,000')).toHaveLength(1);
    expect(screen.getAllByText('2')).toHaveLength(2);
    expect(screen.getAllByText('₩30,000')).toHaveLength(2);
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
