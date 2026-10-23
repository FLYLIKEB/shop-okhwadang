import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui/utils';
import { calcDiscount, formatCurrency, productDisplayPricing, type Locale } from '@/utils/currency';

interface PriceDisplayProps {
  price: number;
  priceUsd?: number | null;
  salePriceUsd?: number | null;
  pricingKrwPerUsd?: number | null;
  salePrice: number | null;
  size?: 'sm' | 'md' | 'lg';
  locale?: Locale;
  className?: string;
}

export default function PriceDisplay({
  price: rawPrice,
  salePrice: rawSalePrice,
  priceUsd, salePriceUsd, pricingKrwPerUsd,
  size = 'sm',
  locale = 'ko',
  className,
}: PriceDisplayProps) {
  const { price, salePrice, options } = productDisplayPricing({ price: rawPrice, salePrice: rawSalePrice, priceUsd, salePriceUsd, pricingKrwPerUsd }, locale);
  const t = useTranslations('product');
  const priceClass = size === 'lg' ? 'typo-price-lg' : 'typo-price';
  const isOnSale = salePrice !== null && salePrice < price;

  if (isOnSale) {
    return (
      <div className={cn('flex flex-col gap-0.5', className)}>
        <span className="typo-price-original">{formatCurrency(price, locale, options)}</span>
        <div className="flex items-baseline gap-1.5">
          <span className={cn(priceClass, 'text-foreground')}>
            {formatCurrency(salePrice, locale, options)}
          </span>
          <span className="typo-price-discount text-destructive">
            {t('discountOff', { percent: calcDiscount(price, salePrice) })}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <span className={cn(priceClass, 'text-foreground')}>{formatCurrency(price, locale, options)}</span>
    </div>
  );
}
