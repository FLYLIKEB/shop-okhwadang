import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BlockRenderer from '@/components/shared/blocks/BlockRenderer';
import { fetchPage } from '@/lib/api-server';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = await fetchPage(slug, locale);
  if (!page) return { title: locale === 'en' ? 'Page not found' : '페이지를 찾을 수 없습니다' };
  return {
    title: `${page.title} | ${locale === 'en' ? 'Ockhwadang' : '옥화당'}`,
  };
}

export default async function SlugPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const page = await fetchPage(slug, locale);

  if (!page || !page.is_published) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <BlockRenderer blocks={page.blocks} />
    </div>
  );
}
