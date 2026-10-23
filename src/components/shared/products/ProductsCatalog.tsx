import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import EmptyState from '@/components/shared/EmptyState';
import ProductGrid from '@/components/shared/products/ProductGrid';
import MobileFilterBar from '@/components/shared/filters/MobileFilterBar';
import Pagination from '@/components/shared/products/Pagination';
import ProductSkeleton from '@/components/shared/products/ProductSkeleton';
import { fetchProducts, fetchCategories, fetchCatalogFilterOptions } from '@/lib/api-server';
import ProductErrorState from '@/components/shared/products/ProductErrorState';
import type { ProductSort } from '@/lib/api';
import type { Locale } from '@/utils/currency';
import { selectCategoriesFromTree } from '@/utils/categoryTree';

export interface ProductsCatalogProps {
  isPreOrder?: boolean;
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

export default async function ProductsCatalog({ params, searchParams, isPreOrder }: ProductsCatalogProps) {
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
      fetchProducts({ isPreOrder, page, limit: 20, sort, categoryId, q, price_min: priceMin, price_max: priceMax, isFeatured, locale: safeLocale, attrs }),
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
    ? selectCategoriesFromTree(categories, [categoryId])[0]
    : null;

  const tPreOrder = await getTranslations({ locale: safeLocale, namespace: 'preOrder' });
  const pageTitle = isPreOrder ? tPreOrder('badge') : q ? t('searchResults', { query: q }) : isFeatured ? t('featuredProducts') : t('productList');

  return (
    <div className="editorial-catalog">
      <header className="editorial-catalog__header">
        <h1>{isPreOrder ? pageTitle : selectedCategory?.name ?? pageTitle}</h1>
          <Suspense fallback={null}>
            <MobileFilterBar categories={categories ?? []} filterGroups={filterGroups} />
          </Suspense>
      </header>
      <div className="min-w-0 pb-12">
            {error ? (
              <ProductErrorState />
            ) : !productsData || productsData.items.length === 0 ? (
              <EmptyState
                className="py-16"
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
  );
}
