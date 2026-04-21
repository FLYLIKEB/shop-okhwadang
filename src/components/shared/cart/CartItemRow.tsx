'use client';

import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import { memo } from 'react';
import { CartItem } from '@/lib/api';
import { cn } from '@/components/ui/utils';
import { formatCurrency } from '@/utils/currency';
import QuantitySelector from '@/components/shared/products/QuantitySelector';

interface CartItemRowProps {
  item: CartItem;
  selected: boolean;
  onSelect: (id: number, checked: boolean) => void;
  onQuantityChange: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
}

const CartItemRowComponent = memo(function CartItemRow({
  item,
  selected,
  onSelect,
  onQuantityChange,
  onRemove,
}: CartItemRowProps) {
  const thumbnail =
    item.product.images.find((img) => img.isThumbnail) ?? item.product.images[0];

  return (
    <div className={cn('flex items-start gap-4 py-4 border-b last:border-b-0', selected && 'bg-muted/30')}>
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => onSelect(item.id, e.target.checked)}
        aria-label={`${item.product.name} 선택`}
        className="mt-1 h-4 w-4 rounded border-input accent-foreground"
      />

      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-muted">
        {thumbnail ? (
          <Image
            src={thumbnail.url}
            alt={thumbnail.alt ?? item.product.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm font-medium leading-snug whitespace-normal break-all md:break-words">{item.product.name}</p>
        {item.option && (
          <p className="text-xs text-muted-foreground break-all md:break-words">
            {item.option.name}: {item.option.value}
          </p>
        )}
        <p className="typo-price text-foreground">{formatCurrency(item.unitPrice)}</p>

        <div className="mt-2 flex flex-wrap items-center gap-2 md:hidden">
          <QuantitySelector
            quantity={item.quantity}
            maxQuantity={99}
            onIncrease={() => onQuantityChange(item.id, item.quantity + 1)}
            onDecrease={() => onQuantityChange(item.id, item.quantity - 1)}
          />

          <p className="typo-price text-foreground">{formatCurrency(item.subtotal)}</p>

          <button
            type="button"
            onClick={() => onRemove(item.id)}
            aria-label={`${item.product.name} 삭제`}
            className="ml-auto text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="hidden shrink-0 flex-col items-end gap-1.5 md:flex">
        <QuantitySelector
          quantity={item.quantity}
          maxQuantity={99}
          onIncrease={() => onQuantityChange(item.id, item.quantity + 1)}
          onDecrease={() => onQuantityChange(item.id, item.quantity - 1)}
        />

        <p className="typo-price mt-0.5 text-foreground">{formatCurrency(item.subtotal)}</p>

        <button
          type="button"
          onClick={() => onRemove(item.id)}
          aria-label={`${item.product.name} 삭제`}
          className="text-muted-foreground transition-colors hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
});

export default CartItemRowComponent
