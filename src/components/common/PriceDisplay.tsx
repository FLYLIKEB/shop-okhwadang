import { calcDiscount } from '@/utils/price';
import { formatCurrency } from '@/utils/currency';

interface PriceDisplayProps {
  price: number;
  salePrice: number | null;
  size?: 'sm' | 'md' | 'lg';
}

export default function PriceDisplay({ price, salePrice, size = 'sm' }: PriceDisplayProps) {
  const discountClass = size === 'lg' ? 'text-xl font-bold' : 'text-sm font-bold';
  const priceClass = size === 'lg' ? 'text-2xl font-bold' : 'text-sm font-bold';
  const originalClass = size === 'lg' ? 'text-sm' : 'text-xs';

  if (salePrice !== null && salePrice < price) {
    return (
      <div className="flex items-baseline gap-2">
        <span className={`${discountClass} text-destructive`}>
          {calcDiscount(price, salePrice)}%
        </span>
        <span className={`${priceClass} text-foreground`}>{formatCurrency(salePrice)}</span>
        <span className={`${originalClass} text-muted-foreground line-through`}>
          {formatCurrency(price)}
        </span>
      </div>
    );
  }

  return (
    <span className={`${priceClass} text-foreground`}>{formatCurrency(price)}</span>
  );
}
