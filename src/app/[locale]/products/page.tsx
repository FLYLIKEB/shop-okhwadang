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
import type { Locale } from '@/utils/currency';
import AnnouncementBar from '@/components/layout/AnnouncementBar';
import Breadcrumb from '@/components/layout/Breadcrumb';
import CategoryHeroBanner from '@/components/layout/CategoryHeroBanner';

export const metadata: Metadata = {
  title: 'Products | 옥화당',
  description: '상품 목록',
};

interface ProductsPageProps {
  params: Promise<{ locale: string }>;
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

export default async function ProductsPage({ params, searchParams }: ProductsPageProps) {
  const { locale } = await params;
  const safeLocale = (['ko', 'en', 'ja', 'zh'].includes(locale) ? locale : 'ko') as Locale;
  const sp = await searchParams;

  const page = Number(sp.page) || 1;
  const VALID_SORTS: ProductSort[] = ['latest', 'price_asc', 'price_desc', 'popular'];
  const sort: ProductSort = VALID_SORTS.includes(sp.sort as ProductSort)
    ? (sp.sort as ProductSort)
    : 'latest';
  const categoryId = sp.categoryId ? Number(sp.categoryId) : undefined;
  const q = sp.q ?? undefined;
  const priceMin = sp.price_min ? Number(sp.price_min) : undefined;
  const priceMax = sp.price_max ? Number(sp.price_max) : undefined;
  const isFeatured = sp.isFeatured === 'true' ? true : undefined;

  let productsData: Awaited<ReturnType<typeof fetchProducts>> | null = null;
  let categories: Awaited<ReturnType<typeof fetchCategories>> = [];
  let error = false;

  try {
    [productsData, categories] = await Promise.all([
      fetchProducts({ page, limit: 20, sort, categoryId, q, price_min: priceMin, price_max: priceMax, isFeatured, locale: safeLocale }),
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
    <>
      <AnnouncementBar />
      <div className="mx-auto max-w-7xl px-4">
        <Breadcrumb category={selectedCategory} />
        
        {selectedCategory && (
          <CategoryHeroBanner category={selectedCategory} />
        )}

        {!selectedCategory && !q && !isFeatured && (
          <h1 className="py-6 text-2xl font-display font-medium text-foreground">
            상품목록
          </h1>
        )}

        {(q || isFeatured) && (
          <h1 className="py-6 text-xl font-bold text-foreground">
            {q ? `"${q}" 검색 결과` : '추천 상품'}
          </h1>
        )}

        <div className="md:hidden">
          <Suspense fallback={null}>
            <MobileFilterBar categories={categories ?? []} />
          </Suspense>
        </div>

        <div className="flex gap-8 pb-12">
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
                  <ProductGrid products={productsData.items} total={productsData.total} locale={safeLocale} />
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
    </>
  );
}