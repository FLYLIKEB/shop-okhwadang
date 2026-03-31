import type { Metadata } from 'next';
import { Suspense } from 'react';
import EmptyState from '@/components/EmptyState';
import ProductGrid from '@/components/products/ProductGrid';
import FilterSidebar from '@/components/filters/FilterSidebar';
import MobileFilterBar from '@/components/filters/MobileFilterBar';
import Pagination from '@/components/products/Pagination';
import ProductSkeleton from '@/components/products/ProductSkeleton';
import { fetchProducts, fetchCategories } from '@/lib/api-server';
import ProductErrorState from '@/components/products/ProductErrorState';
import type { ProductSort } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Products | 옥화당',
  description: '상품 목록',
};

interface ProductsPageProps {
  searchParams: Promise<{
    page?: string;
    sort?: string;
    categoryId?: string;
    q?: string;
    price_min?: string;
    price_max?: string;
    isFeatured?: string;
    clayType?: string;
    shape?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;

  const page = Number(params.page) || 1;
  const VALID_SORTS: ProductSort[] = ['latest', 'price_asc', 'price_desc', 'popular'];
  const sort: ProductSort = VALID_SORTS.includes(params.sort as ProductSort)
    ? (params.sort as ProductSort)
    : 'latest';
  const categoryId = params.categoryId ? Number(params.categoryId) : undefined;
  const q = params.q ?? undefined;
  const priceMin = params.price_min ? Number(params.price_min) : undefined;
  const priceMax = params.price_max ? Number(params.price_max) : undefined;
  const isFeatured = params.isFeatured === 'true' ? true : undefined;

  let productsData: Awaited<ReturnType<typeof fetchProducts>> | null = null;
  let categories: Awaited<ReturnType<typeof fetchCategories>> = [];
  let error = false;

  try {
    [productsData, categories] = await Promise.all([
      fetchProducts({ page, limit: 20, sort, categoryId, q, price_min: priceMin, price_max: priceMax, isFeatured }),
      fetchCategories(),
    ]);
  } catch {
    error = true;
    productsData = null;
    categories = [];
  }

  const selectedCategory = categoryId
    ? categories.find((c) => c.id === categoryId || c.children?.some((child) => child.id === categoryId))
    : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="text-xl font-bold text-foreground md:text-2xl">
        {q ? `"${q}" 검색 결과` : isFeatured ? '추천 상품' : categoryId && selectedCategory ? selectedCategory.name : '상품 목록'}
      </h1>

      {selectedCategory?.description && (
        <p className="mt-2 text-sm text-muted-foreground">{selectedCategory.description}</p>
      )}

      {/* 모바일 필터 바 */}
      <div className="mt-4 md:hidden">
        <Suspense fallback={null}>
          <MobileFilterBar categories={categories ?? []} />
        </Suspense>
      </div>

      <div className="mt-4 flex gap-8 md:mt-6">
        {/* 데스크탑 사이드바 */}
        <div className="hidden md:block md:w-48 md:shrink-0">
          <Suspense fallback={null}>
            <FilterSidebar categories={categories ?? []} />
          </Suspense>
        </div>

        <div className="min-w-0 flex-1">
          {error ? (
            <ProductErrorState />
          ) : !productsData || productsData.items.length === 0 ? (
            <EmptyState
              title="상품이 없습니다"
              description={q ? `"${q}"에 대한 검색 결과가 없습니다.` : '등록된 상품이 없습니다.'}
            />
          ) : (
            <>
              <Suspense fallback={<ProductSkeleton />}>
                <ProductGrid products={productsData.items} total={productsData.total} />
              </Suspense>

              <div className="mt-8">
                <Suspense fallback={null}>
                  <Pagination
                    total={productsData.total}
                    page={productsData.page}
                    limit={productsData.limit}
                  />
                </Suspense>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
