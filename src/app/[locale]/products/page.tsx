import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import EmptyState from '@/components/shared/EmptyState';
import ProductGrid from '@/components/shared/products/ProductGrid';
import FilterSidebar from '@/components/shared/filters/FilterSidebar';
import MobileFilterBar from '@/components/shared/filters/MobileFilterBar';
import Pagination from '@/components/shared/products/Pagination';
import ProductSkeleton from '@/components/shared/products/ProductSkeleton';
import { fetchProducts, fetchCategories, fetchCatalogFilterOptions } from '@/lib/api-server';
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
  let filterOptions: Awaited<ReturnType<typeof fetchCatalogFilterOptions>> | null = null;
  let error = false;

  try {
    [productsData, categories, filterOptions] = await Promise.all([
      fetchProducts({ page, limit: 20, sort, categoryId, q, price_min: priceMin, price_max: priceMax, isFeatured, locale: safeLocale, attrs }),
      fetchCategories(safeLocale),
      fetchCatalogFilterOptions(safeLocale),
    ]);
  } catch {
    error = true;
    productsData = null;
    categories = [];
    filterOptions = null;
  }

  const filterGroups = filterOptions ?? [];

  const selectedCategory = categoryId
    ? categories.find((c) => c.id === categoryId || c.children?.some((child) => child.id === categoryId))
    : null;

  const pageTitle = q ? t('searchResults', { query: q }) : isFeatured ? t('featuredProducts') : t('productList');

  return (
    <div className="bg-muted/60">
      <div className="layout-container layout-page">
        <Breadcrumb category={selectedCategory} />

        <section className="overflow-hidden rounded-2xl bg-card px-5 py-8 shadow-sm md:px-10 md:py-12">
          {selectedCategory ? (
            <CategoryHeroBanner category={selectedCategory} />
          ) : (
            <div className="max-w-3xl">
              <p className="typo-body-sm font-medium text-muted-foreground">{t('listHeroEyebrow')}</p>
              <h1 className="mt-3 typo-h1 font-body text-foreground">
                {pageTitle}
              </h1>
              <p className="mt-4 typo-body text-muted-foreground">
                {q ? t('listHeroSearchDescription', { query: q }) : t('listHeroDescription')}
              </p>
            </div>
          )}
        </section>

        <div className="mt-5 md:hidden">
          <Suspense fallback={null}>
            <MobileFilterBar categories={categories ?? []} filterGroups={filterGroups} />
          </Suspense>
        </div>

        <div className="mt-6 flex gap-8 pb-12">
          <div className="hidden md:block md:w-64 md:shrink-0">
            <div className="sticky top-24 rounded-2xl bg-card p-5 shadow-sm">
              <Suspense fallback={null}>
                <FilterSidebar categories={categories ?? []} filterGroups={filterGroups} />
              </Suspense>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            {error ? (
              <ProductErrorState />
            ) : !productsData || productsData.items.length === 0 ? (
              <EmptyState
                className="rounded-2xl bg-card px-6 shadow-sm"
                title={t('noProducts')}
                description={q ? t('noSearchResults', { query: q }) : t('noProductsDescription')}
              />
            ) : (
              <>
                <Suspense fallback={<ProductSkeleton />}>
                  <ProductGrid products={productsData.items} total={productsData.total} locale={safeLocale} />
                </Suspense>

                <div className="mt-10">
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
    </div>
  );
}
