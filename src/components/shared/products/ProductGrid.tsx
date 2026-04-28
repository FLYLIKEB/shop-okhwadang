'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import ProductCard from '@/components/shared/products/ProductCard';
import ProductListItem from '@/components/shared/products/ProductListItem';
import ViewToggle from '@/components/shared/products/ViewToggle';
import SortDropdown from '@/components/shared/products/SortDropdown';
import { cn } from '@/components/ui/utils';
import type { Product } from '@/lib/api';
import type { Locale } from '@/utils/currency';
import { LOCAL_KEYS } from '@/constants/storage';

type ViewMode = 'grid' | 'list';

interface ProductGridProps {
  products: Product[];
  total: number;
  locale?: Locale;
}

function getInitialViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'grid';
  const stored = localStorage.getItem(LOCAL_KEYS.VIEW_MODE) as ViewMode | null;
  if (stored === 'grid' || stored === 'list') return stored;
  return 'grid';
}

export default function ProductGrid({ products, total, locale = 'ko' }: ProductGridProps) {
  const t = useTranslations('product');
  const [view, setView] = useState<ViewMode>(getInitialViewMode);

  return (
    <div>
      <div className="mt-8 mb-4 flex items-center justify-between">
        <p className="typo-body-sm text-muted-foreground">
          {t.rich('totalItems', {
            count: total,
            strong: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
          })}
        </p>
        <div className="flex items-center gap-2">
          <SortDropdown />
          <ViewToggle value={view} onChange={setView} />
        </div>
      </div>

      {view === 'grid' ? (
        <div className={cn('grid gap-10 grid-cols-2 md:grid-cols-3 lg:grid-cols-4')}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.price}
              salePrice={product.salePrice}
              shortDescription={product.shortDescription}
              rating={product.rating}
              reviewCount={product.reviewCount}
              status={product.status}
              images={product.images}
              locale={locale}
              categoryName={product.category?.name ?? null}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {products.map((product) => (
            <ProductListItem
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.price}
              salePrice={product.salePrice}
              shortDescription={product.shortDescription}
              rating={product.rating}
              reviewCount={product.reviewCount}
              status={product.status}
              images={product.images}
              isFeatured={product.isFeatured}
              locale={locale}
            />
          ))}
        </div>
      )}
    </div>
  );
}
