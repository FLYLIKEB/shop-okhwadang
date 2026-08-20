'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { localMessage } from '@/utils/localMessages';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/shared/EmptyState';
import ProductCard from '@/components/shared/products/ProductCard';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { productsApi, type Product, type ProductSort } from '@/lib/api';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { useCatalogQueryParams } from '@/components/shared/hooks/useCatalogQueryParams';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/utils/currency';
import { formatCount } from '@/utils/date';

const SORT_OPTIONS: ProductSort[] = ['latest', 'popular', 'price_asc', 'price_desc'];

const LIMIT = 20;

export default function SearchPage() {
  const {
    q,
    sort,
    page,
    categoryId,
    priceMin,
    priceMax,
    updateQuery,
  } = useCatalogQueryParams();
  const pathname = usePathname();
  const locale = pathname?.split('/').filter(Boolean)[0] === 'en' ? 'en' : 'ko' as Locale;
  const tProduct = useTranslations('product');
  const tCommon = useTranslations('common');

  const activeSort = (sort as ProductSort) ?? 'latest';

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);

  const [priceMinInput, setPriceMinInput] = useState(priceMin?.toString() ?? '');
  const [priceMaxInput, setPriceMaxInput] = useState(priceMax?.toString() ?? '');

  const { execute: loadProducts, isLoading } = useAsyncAction(
    async () => {
      const data = await productsApi.getList({
        q: q || undefined,
        sort: activeSort,
        categoryId,
        price_min: priceMin,
        price_max: priceMax,
        page,
        limit: LIMIT,
      });
      setProducts(data.items);
      setTotal(data.total);
    },
    { errorMessage: localMessage('search.loadError') },
  );

  useEffect(() => {
    void loadProducts();
  }, [q, activeSort, categoryId, priceMin, priceMax, page, loadProducts]);

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateQuery({ sort: e.target.value });
  };

  const handlePriceApply = () => {
    updateQuery({
      price_min: priceMinInput || undefined,
      price_max: priceMaxInput || undefined,
    });
  };

  const hasMore = page * LIMIT < total;

  const handleLoadMore = useCallback(() => {
    updateQuery({ page: page + 1 }, { resetPage: false });
  }, [page, updateQuery]);

  return (
    <div className="mx-auto max-w-8xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-xl font-bold text-foreground">
          {q ? tProduct('searchResults', { query: q }) : tProduct('productList')}
        </h1>
        {!isLoading && (
          <p className="text-sm text-muted-foreground">{tProduct('totalItems', { count: formatCount(total, locale) })}</p>
        )}
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-sm text-muted-foreground">
            {localMessage('search.sort')}
          </label>
          <select
            id="sort-select"
            value={activeSort}
            onChange={handleSortChange}
            aria-label={localMessage('search.sortAria')}
            className={cn(
              'rounded-md border border-input bg-background px-3 py-1.5 text-sm',
              'focus:outline-none focus:ring-2 focus:ring-ring',
            )}
          >
            {SORT_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {localMessage(`search.sortOptions.${value}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-muted-foreground">{localMessage('search.price')}</label>
          <input
            type="number"
            value={priceMinInput}
            onChange={(e) => setPriceMinInput(e.target.value)}
            placeholder={localMessage('search.min')}
            aria-label={localMessage('search.minPrice')}
            className={cn(
              'w-24 rounded-md border border-input bg-background px-3 py-1.5 text-sm',
              'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
            )}
          />
          <span className="text-sm text-muted-foreground">~</span>
          <input
            type="number"
            value={priceMaxInput}
            onChange={(e) => setPriceMaxInput(e.target.value)}
            placeholder={localMessage('search.max')}
            aria-label={localMessage('search.maxPrice')}
            className={cn(
              'w-24 rounded-md border border-input bg-background px-3 py-1.5 text-sm',
              'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
            )}
          />
          <Button type="button" size="sm" variant="gray" onClick={handlePriceApply}>
            {tCommon('apply')}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-10 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBox key={i} height="aspect-square" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title={localMessage('search.noResults')}
          description={localMessage('search.noResultsDescription')}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-10 md:grid-cols-3">
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
                categoryName={product.category?.name ?? null}
                isFreeShipping={product.isFreeShipping}
                locale={locale}
              />
            ))}
          </div>

          {hasMore && (
            <div className="mt-8 flex justify-center">
              <Button variant="gray" onClick={handleLoadMore}>
                {localMessage('search.loadMore')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
