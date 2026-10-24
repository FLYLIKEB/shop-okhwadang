import type { Metadata } from 'next';
import BlockRenderer from '@/components/shared/blocks/BlockRenderer';
import { fetchCatalogFilterOptions, fetchPage } from '@/lib/api-server';
import { resolveCollectionImages } from '@/lib/collectionImages';
import { normalizeCollectionBlocks } from '@/lib/collectionContent';
import koMessages from '@/i18n/messages/ko.json';
import enMessages from '@/i18n/messages/en.json';

interface CollectionPageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { locale } = await params;
  const messages = (locale === 'ko' ? koMessages : enMessages).collectionPage;
  return {
    title: messages.metaTitle,
    description: messages.metaDescription,
    openGraph: {
      title: messages.metaOgTitle,
      description: messages.metaOgDescription,
    },
  };
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { locale } = await params;
  const [page, groups] = await Promise.all([
    fetchPage('collection', locale),
    fetchCatalogFilterOptions('ko').catch(() => []),
  ]);

  if (!page?.blocks?.length) {
    throw new Error(
      `[collection] DB에 slug='collection' 페이지가 없거나 블록이 비어있습니다 (locale=${locale}). ` +
        '시드 데이터를 확인하세요: scripts/run-seed.sh',
    );
  }

  const localizedBlocks = page.blocks.map((block) => {
    if (locale !== 'ko' || !['hero_banner', 'promotion_banner'].includes(block.type)) return block;
    return { ...block, content: { ...block.content, eyebrow: block.type === 'hero_banner'
      ? koMessages.collectionPage.heroEyebrow : koMessages.collectionPage.shopEyebrow } };
  });
  const blocks = await resolveCollectionImages(normalizeCollectionBlocks(localizedBlocks, locale, groups), locale);

  return (
    <div className="editorial-content-page collection-cms min-h-screen layout-container">
      <div className="editorial-page-body">
        <BlockRenderer blocks={blocks} englishControls={locale !== 'ko'} />
      </div>
    </div>
  );
}
