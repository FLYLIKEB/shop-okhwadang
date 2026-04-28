'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/shared/EmptyState';
import ProductCard from '@/components/shared/products/ProductCard';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { productsApi, type Product, type ProductSort } from '@/lib/api';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { useCatalogQueryParams } from '@/components/shared/hooks/useCatalogQueryParams';

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '인기순' },
  { value: 'price_asc', label: '가격낮은순' },
  { value: 'price_desc', label: '가격높은순' },
];

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
  const tProduct = useTranslations('product');

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
    { errorMessage: '검색 중 오류가 발생했습니다.' },
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
          <p className="text-sm text-muted-foreground">{tProduct('totalItems', { count: total.toLocaleString() })}</p>
        )}
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-sm text-muted-foreground">
            정렬
          </label>
          <select
            id="sort-select"
            value={activeSort}
            onChange={handleSortChange}
            aria-label="정렬 기준"
            className={cn(
              'rounded-md border border-input bg-background px-3 py-1.5 text-sm',
              'focus:outline-none focus:ring-2 focus:ring-ring',
            )}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-muted-foreground">가격</label>
          <input
            type="number"
            value={priceMinInput}
            onChange={(e) => setPriceMinInput(e.target.value)}
            placeholder="최소"
            aria-label="최소 가격"
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
            placeholder="최대"
            aria-label="최대 가격"
            className={cn(
              'w-24 rounded-md border border-input bg-background px-3 py-1.5 text-sm',
              'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
            )}
          />
          <Button type="button" size="sm" variant="outline" onClick={handlePriceApply}>
            적용
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
          title="검색 결과가 없습니다"
          description="다른 키워드를 시도해보세요"
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
              />
            ))}
          </div>

          {hasMore && (
            <div className="mt-8 flex justify-center">
              <Button variant="outline" onClick={handleLoadMore}>
                더 보기
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
