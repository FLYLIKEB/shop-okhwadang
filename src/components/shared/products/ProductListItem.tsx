import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/components/ui/utils';
import type { ProductImage } from '@/lib/api';
import PriceDisplay from '@/components/shared/common/PriceDisplay';
import type { Locale } from '@/utils/currency';
import StarRating from '@/components/shared/reviews/StarRating';

interface ProductListItemProps {
  id: number;
  name: string;
  price: number;
  salePrice: number | null;
  shortDescription?: string | null;
  rating?: number;
  reviewCount?: number;
  status: 'active' | 'soldout' | 'inactive' | 'draft' | 'hidden';
  images: ProductImage[];
  isFeatured?: boolean;
  locale?: Locale;
}

function ProductListItem({
  id,
  name,
  price,
  salePrice,
  shortDescription,
  rating,
  reviewCount,
  status,
  images,
  locale = 'ko',
}: ProductListItemProps) {
  const thumbnail = images[0]?.url;
  const isSoldout = status === 'soldout';

  return (
    <Link
      href={`/products/${id}`}
      className={cn(
        'group flex gap-4 overflow-hidden rounded-lg border border-border bg-card p-3 transition-shadow hover:shadow-md',
        isSoldout && 'opacity-75',
      )}
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={name}
            fill
            sizes="96px"
            className="object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <span className="text-xs">No Image</span>
          </div>
        )}
        {isSoldout && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="text-xs font-semibold text-white">품절</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-center gap-1">
        <p className="typo-title-sm line-clamp-1 text-card-foreground">{name}</p>
        <PriceDisplay price={price} salePrice={salePrice} locale={locale} />
        {rating !== undefined && (
          <div className="flex items-center gap-1.5">
            <StarRating rating={rating} size="sm" interactive={false} />
            <span className="typo-body-sm font-medium">{rating.toFixed(1)}</span>
            {reviewCount !== undefined && reviewCount > 0 && (
              <span className="typo-body-sm text-muted-foreground">({reviewCount})</span>
            )}
          </div>
        )}
        {shortDescription && (
          <p className="line-clamp-1 typo-body-sm text-muted-foreground">{shortDescription}</p>
        )}
      </div>
    </Link>
  );
}

export default React.memo(ProductListItem);
