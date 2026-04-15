import { Suspense } from 'react';
import type { Metadata } from 'next';
import SearchPage from '@/components/shared/search/SearchPage';

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `"${q}" 검색 결과` : '상품 검색',
    description: q ? `"${q}" 검색 결과 페이지` : '상품을 검색하세요',
    robots: { index: false, follow: true },
  };
}

export default function Page() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-8 text-sm text-muted-foreground">검색 중...</div>}>
      <SearchPage />
    </Suspense>
  );
}
