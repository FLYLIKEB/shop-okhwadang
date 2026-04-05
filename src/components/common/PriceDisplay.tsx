import { calcDiscount, formatCurrency, type Locale } from '@/utils/currency';

interface PriceDisplayProps {
  price: number;
  salePrice: number | null;
  size?: 'sm' | 'md' | 'lg';
  locale?: Locale;
}

export default function PriceDisplay({ price, salePrice, size = 'sm', locale = 'ko' }: PriceDisplayProps) {
  const discountClass = size === 'lg' ? 'text-sm font-bold font-mono tracking-wide' : 'text-xs font-bold font-mono tracking-wide';
  const priceClass = size === 'lg' ? 'text-2xl font-bold font-mono tracking-tight' : 'text-sm font-bold font-mono tracking-tight';
  const originalClass = size === 'lg' ? 'text-sm font-mono' : 'text-xs font-mono';

  if (salePrice !== null && salePrice < price) {
    return (
      <div className="min-h-[2.75rem] flex flex-col justify-center">
        <div className="flex items-baseline gap-1.5 flex-wrap leading-none">
          <span className={`${priceClass} text-foreground`}>{formatCurrency(salePrice, locale)}</span>
          <span className={`${discountClass} text-destructive`}>
            {calcDiscount(price, salePrice)}% 할인
          </span>
        </div>
        <span className={`${originalClass} text-muted-foreground line-through leading-none`}>
          {formatCurrency(price, locale)}
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-[2.75rem] flex flex-col justify-center items-start">
      <span className={`${priceClass} text-foreground`}>{formatCurrency(price, locale)}</span>
    </div>
  );
}
