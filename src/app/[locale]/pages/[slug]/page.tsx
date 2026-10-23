import { notFound } from 'next/navigation';
import BlockRenderer from '@/components/shared/blocks/BlockRenderer';
import { fetchPage } from '@/lib/api-server';
import type { Page } from '@/lib/api';

export const revalidate = 60;

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<{ title: string }> {
  const { locale, slug } = await params;
  const page = await fetchPage(slug, locale);
  if (!page) return { title: '옥화당' };
  return {
    title: `${page.title} — 옥화당`,
  };
}

export default async function DynamicPage({ params }: Props) {
  const { locale, slug } = await params;

  const page = await fetchPage(slug, locale);

  if (!page || !page.is_published) {
    notFound();
  }

  if (!page.blocks?.length) {
    throw new Error(
      `[pages/${slug}] DB에 slug='${slug}' 페이지가 없거나 블록이 비어있습니다 (locale=${locale}). ` +
        '시드 데이터를 확인하세요: scripts/run-seed.sh',
    );
  }

  const blocks = (page as Page).blocks;

  return (
    <main className="editorial-content-page">
      <header className="layout-container editorial-page-header">
        <h1>{page.title}</h1>
      </header>

      <div className="layout-container editorial-page-body">
        <BlockRenderer blocks={blocks} />
      </div>
    </main>
  );
}
