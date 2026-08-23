'use client';

import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import { memo } from 'react';
import { Link } from '@/i18n/navigation';
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
  const productHref = `/products/${item.product.id}`;

  return (
    <div
      className={cn(
        'checkout-toss-cart-item flex items-start gap-3 py-3 transition-colors first:pt-0 last:pb-0',
        selected && 'checkout-toss-cart-item--selected',
      )}
    >
      <label className="-ml-2 flex min-h-12 min-w-12 shrink-0 cursor-pointer items-center justify-center self-center -translate-y-1">
        <Checkbox
          checked={selected}
          onChange={(e) => onSelect(item.id, e.target.checked)}
          aria-label={localMessage('cart.selectItemAria', { product: item.product.name })}
          className="h-6 w-6"
        />
      </label>

      <Link
        href={productHref}
        locale={locale}
        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted"
      >
        {thumbnail ? (
          <Image
            src={thumbnail.thumbnailUrl ?? thumbnail.url}
            alt={thumbnail.alt ?? item.product.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        )}
      </Link>

      <div className="checkout-toss-cart-item__content flex min-w-0 flex-1 items-center gap-3">
        <div className="checkout-toss-cart-item__info min-w-0 flex-1">
          <Link
            href={productHref}
            locale={locale}
            className="checkout-toss-cart-item__name typo-title block line-clamp-2 break-words hover:underline"
          >
            {item.product.name}
          </Link>
          {item.option && (
            <p className="mt-1 break-words text-xs text-muted-foreground">
              {item.option.name}: {item.option.value}
            </p>
          )}
        </div>

        <p className="checkout-toss-cart-item__price typo-price mr-0 shrink-0 whitespace-nowrap text-foreground md:mr-4">
          {formatCurrency(item.subtotal, locale)}
        </p>

        <div className="checkout-toss-cart-item__quantity shrink-0">
          <QuantitySelector
            quantity={item.quantity}
            maxQuantity={99}
            onIncrease={() => onQuantityChange(item.id, item.quantity + 1)}
            onDecrease={() => onQuantityChange(item.id, item.quantity - 1)}
          />
        </div>

        <Button
          type="button"
          variant="gray"
          size="icon"
          onClick={() => onRemove(item.id)}
          aria-label={localMessage('cart.removeItemAria', { product: item.product.name })}
          className="checkout-toss-cart-item__remove h-9 min-h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

export default CartItemRowComponent
