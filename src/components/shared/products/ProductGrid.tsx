'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import ProductCard from '@/components/shared/products/ProductCard';
import ProductListItem from '@/components/shared/products/ProductListItem';
import ViewToggle from '@/components/shared/products/ViewToggle';
import SortDropdown from '@/components/shared/products/SortDropdown';
import type { Product } from '@/lib/api';
import type { Locale } from '@/utils/currency';
import { LOCAL_KEYS } from '@/constants/storage';

type ViewMode = 'grid' | 'list';

interface ProductGridProps {
  products: Product[];
  total: number;
  locale?: Locale;
}

export default function ProductGrid({ products, total, locale = 'ko' }: ProductGridProps) {
  const t = useTranslations('product');
  const [view, setView] = useState<ViewMode>('grid');

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_KEYS.VIEW_MODE);
    if (stored === 'grid' || stored === 'list') setView(stored);
  }, []);

  return (
    <div>
      <div className="editorial-catalog__toolbar flex flex-wrap items-center justify-between gap-2">
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
        <div className="catalog-product-grid lg:grid-cols-4">
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
              attributes={product.attributes}
              locale={locale}
              categoryName={product.category?.name ?? null}
              isFreeShipping={product.isFreeShipping}
              isPreOrder={product.isPreOrder}
              preOrderShippingDate={product.preOrderShippingDate}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col">
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
              isFreeShipping={product.isFreeShipping}
              isPreOrder={product.isPreOrder}
              preOrderShippingDate={product.preOrderShippingDate}
              locale={locale}
            />
          ))}
        </div>
      )}
    </div>
  );
}
