'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/EmptyState';
import ProductCard from '@/components/products/ProductCard';
import { productsApi, type Product, type ProductSort } from '@/lib/api';

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '인기순' },
  { value: 'price_asc', label: '가격낮은순' },
  { value: 'price_desc', label: '가격높은순' },
];

const LIMIT = 20;

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const q = searchParams.get('q') ?? '';
  const sort = (searchParams.get('sort') as ProductSort) ?? 'latest';
  const categoryId = searchParams.get('categoryId') ? Number(searchParams.get('categoryId')) : undefined;
  const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1;
  const priceMin = searchParams.get('price_min') ? Number(searchParams.get('price_min')) : undefined;
  const priceMax = searchParams.get('price_max') ? Number(searchParams.get('price_max')) : undefined;

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [priceMinInput, setPriceMinInput] = useState(priceMin?.toString() ?? '');
  const [priceMaxInput, setPriceMaxInput] = useState(priceMax?.toString() ?? '');

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && value !== '') {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      params.delete('page');
      router.push(`/search?${params.toString()}`);
    },
    [searchParams, router],
  );

  useEffect(() => {
    setIsLoading(true);
    productsApi
      .getList({
        q: q || undefined,
        sort,
        categoryId,
        price_min: priceMin,
        price_max: priceMax,
        page,
        limit: LIMIT,
      })
      .then((data) => {
        setProducts(data.items);
        setTotal(data.total);
      })
      .catch(() => {
        toast.error('검색 중 오류가 발생했습니다');
        setProducts([]);
        setTotal(0);
      })
      .finally(() => setIsLoading(false));
  }, [q, sort, categoryId, priceMin, priceMax, page]);

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateParams({ sort: e.target.value });
  };

  const handlePriceApply = () => {
    updateParams({
      price_min: priceMinInput || undefined,
      price_max: priceMaxInput || undefined,
    });
  };

  const hasMore = page * LIMIT < total;

  const handleLoadMore = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page + 1));
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-xl font-bold text-foreground">
          {q ? `"${q}" 검색 결과` : '전체 상품'}
        </h1>
        {!isLoading && (
          <p className="text-sm text-muted-foreground">총 {total.toLocaleString()}개 상품</p>
        )}
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-sm text-muted-foreground">
            정렬
          </label>
          <select
            id="sort-select"
            value={sort}
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
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title="검색 결과가 없습니다"
          description="다른 키워드를 시도해보세요"
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                salePrice={product.salePrice}
                status={product.status}
                images={product.images}
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
