import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import EmptyState from '@/components/shared/EmptyState';
import ProductGrid from '@/components/shared/products/ProductGrid';
import FilterSidebar from '@/components/shared/filters/FilterSidebar';
import MobileFilterBar from '@/components/shared/filters/MobileFilterBar';
import Pagination from '@/components/shared/products/Pagination';
import ProductSkeleton from '@/components/shared/products/ProductSkeleton';
import { fetchProducts, fetchCategories, fetchCollections } from '@/lib/api-server';
import ProductErrorState from '@/components/shared/products/ProductErrorState';
import type { ProductSort } from '@/lib/api';
import type { Locale } from '@/utils/currency';
import Breadcrumb from '@/components/shared/layout/Breadcrumb';
import CategoryHeroBanner from '@/components/shared/layout/CategoryHeroBanner';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'product' });
  return {
    title: `${t('productList')} | Ockhwadang`,
    description: t('productList'),
  };
}

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
    attrs?: string;
  }>;
}

export default async function ProductsPage({ params, searchParams }: ProductsPageProps) {
  const { locale } = await params;
  const safeLocale = (['ko', 'en'].includes(locale) ? locale : 'ko') as Locale;
  const sp = await searchParams;
  const t = await getTranslations({ locale: safeLocale, namespace: 'product' });

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
  const attrs = sp.attrs ?? undefined;

  let productsData: Awaited<ReturnType<typeof fetchProducts>> | null = null;
  let categories: Awaited<ReturnType<typeof fetchCategories>> = [];
  let collections: Awaited<ReturnType<typeof fetchCollections>> | null = null;
  let error = false;

  try {
    [productsData, categories, collections] = await Promise.all([
      fetchProducts({ page, limit: 20, sort, categoryId, q, price_min: priceMin, price_max: priceMax, isFeatured, locale: safeLocale, attrs }),
      fetchCategories(safeLocale),
      fetchCollections(safeLocale),
    ]);
  } catch {
    error = true;
    productsData = null;
    categories = [];
    collections = null;
  }

  const clayCollections = collections?.clay ?? [];
  const shapeCollections = collections?.shape ?? [];

  const selectedCategory = categoryId
    ? categories.find((c) => c.id === categoryId || c.children?.some((child) => child.id === categoryId))
    : null;

  return (
    <div className="layout-container layout-page">
      <Breadcrumb category={selectedCategory} />

      {selectedCategory && (
        <CategoryHeroBanner category={selectedCategory} />
      )}

      {!selectedCategory && !q && !isFeatured && (
        <h1 className="py-6 text-2xl font-display font-medium text-foreground">
          {t('productList')}
        </h1>
      )}

      {(q || isFeatured) && (
        <h1 className="py-6 text-xl font-bold text-foreground">
          {q ? t('searchResults', { query: q }) : t('featuredProducts')}
        </h1>
      )}

      <div className="md:hidden">
        <Suspense fallback={null}>
          <MobileFilterBar categories={categories ?? []} clayCollections={clayCollections} shapeCollections={shapeCollections} />
        </Suspense>
      </div>

      <div className="flex gap-8 pb-12">
        <div className="hidden md:block md:w-48 md:shrink-0">
          <Suspense fallback={null}>
            <FilterSidebar categories={categories ?? []} clayCollections={clayCollections} shapeCollections={shapeCollections} />
          </Suspense>
        </div>

        <div className="min-w-0 flex-1">
          {error ? (
            <ProductErrorState />
          ) : !productsData || productsData.items.length === 0 ? (
            <EmptyState
              title={t('noProducts')}
              description={q ? t('noSearchResults', { query: q }) : t('noProductsDescription')}
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
  );
}
