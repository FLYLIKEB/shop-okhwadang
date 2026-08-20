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
    <main className="toss-cms min-h-screen bg-background">
      <section className="toss-cms__hero bg-surface/70">
        <div className="layout-container py-16 md:py-24">
          <h1 className="typo-h1 max-w-3xl text-foreground">{page.title}</h1>
          <div className="mt-8 h-px w-16 bg-primary" />
        </div>
      </section>

      <div className="layout-container layout-section">
        <BlockRenderer blocks={blocks} />
      </div>
    </main>
  );
}
