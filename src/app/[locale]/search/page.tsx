import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import SearchPage from '@/components/shared/search/SearchPage';

interface SearchPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ params, searchParams }: SearchPageProps): Promise<Metadata> {
  const [{ locale }, { q }] = await Promise.all([params, searchParams]);
  const t = await getTranslations({ locale, namespace: 'search' });
  return {
    title: q ? t('results', { query: q }) : t('productSearch'),
    description: q ? t('results', { query: q }) : t('productSearch'),
    robots: { index: false, follow: true },
  };
}

export default async function Page({ params }: Pick<SearchPageProps, 'params'>) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'common' });

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-muted-foreground">
          {t('loading')}
        </div>
      }
    >
      <SearchPage />
    </Suspense>
  );
}
