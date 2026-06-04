import { Suspense } from 'react';
import type { Metadata } from 'next';
import SearchPage from '@/components/shared/search/SearchPage';

interface SearchPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ params, searchParams }: SearchPageProps): Promise<Metadata> {
  const [{ locale }, { q }] = await Promise.all([params, searchParams]);
  const isEn = locale === 'en';
  return {
    title: q ? (isEn ? `Search results for "${q}"` : `"${q}" 검색 결과`) : (isEn ? 'Product Search' : '상품 검색'),
    description: q ? (isEn ? `Search results page for "${q}"` : `"${q}" 검색 결과 페이지`) : (isEn ? 'Search products.' : '상품을 검색하세요'),
    robots: { index: false, follow: true },
  };
}

export default async function Page({ params }: Pick<SearchPageProps, 'params'>) {
  const { locale } = await params;

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-muted-foreground">
          {locale === 'en' ? 'Loading...' : '로딩 중...'}
        </div>
      }
    >
      <SearchPage />
    </Suspense>
  );
}
