'use client';

import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import { memo } from 'react';
import { CartItem } from '@/lib/api';
import { cn } from '@/components/ui/utils';
import { formatCurrency } from '@/utils/currency';
import QuantitySelector from '@/components/shared/products/QuantitySelector';
import { Checkbox } from '@/components/ui/checkbox';
import { getClientLocale } from '@/utils/clientLocale';
import { localMessage } from '@/utils/localMessages';
import { Button } from '@/components/ui/button';

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
  const locale = getClientLocale();
  const thumbnail =
    item.product.images.find((img) => img.isThumbnail) ?? item.product.images[0];

  return (
    <div
      className={cn(
        'checkout-toss-cart-item mb-3 flex items-start gap-2 rounded-lg border border-soft p-3 transition-colors last:mb-0',
        selected && 'checkout-toss-cart-item--selected border-primary/30 bg-primary/5',
      )}
    >
      <label className="-ml-2 -mt-2 flex min-h-12 min-w-12 cursor-pointer items-center justify-center">
        <Checkbox
          checked={selected}
          onChange={(e) => onSelect(item.id, e.target.checked)}
          aria-label={localMessage('cart.selectItemAria', { product: item.product.name })}
        />
      </label>

      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
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
        <p className="checkout-toss-cart-item__name typo-body-sm whitespace-normal break-all md:break-words">{item.product.name}</p>
        {item.option && (
          <p className="text-xs text-muted-foreground break-all md:break-words">
            {item.option.name}: {item.option.value}
          </p>
        )}
        <p className="typo-price text-foreground">{formatCurrency(item.unitPrice, locale)}</p>

        <div className="mt-2 flex flex-wrap items-center gap-2 md:hidden">
          <QuantitySelector
            quantity={item.quantity}
            maxQuantity={99}
            onIncrease={() => onQuantityChange(item.id, item.quantity + 1)}
            onDecrease={() => onQuantityChange(item.id, item.quantity - 1)}
          />

          <p className="typo-price text-foreground">{formatCurrency(item.subtotal, locale)}</p>

          <Button
            type="button"
            variant="gray"
            size="icon"
            onClick={() => onRemove(item.id)}
            aria-label={localMessage('cart.removeItemAria', { product: item.product.name })}
            className="ml-auto h-9 min-h-9 w-9 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="hidden shrink-0 flex-col items-end gap-1.5 md:flex">
        <QuantitySelector
          quantity={item.quantity}
          maxQuantity={99}
          onIncrease={() => onQuantityChange(item.id, item.quantity + 1)}
          onDecrease={() => onQuantityChange(item.id, item.quantity - 1)}
        />

        <p className="typo-price mt-0.5 text-foreground">{formatCurrency(item.subtotal, locale)}</p>

        <Button
          type="button"
          variant="gray"
          size="icon"
          onClick={() => onRemove(item.id)}
          aria-label={localMessage('cart.removeItemAria', { product: item.product.name })}
          className="h-9 min-h-9 w-9 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

export default CartItemRowComponent
