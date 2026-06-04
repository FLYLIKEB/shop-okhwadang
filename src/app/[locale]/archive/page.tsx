import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import BlockRenderer from '@/components/shared/blocks/BlockRenderer';
import { fetchPage } from '@/lib/api-server';
import type { Page } from '@/lib/api';

interface ArchivePageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: ArchivePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'archivePage' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

export default async function ArchivePage({ params }: ArchivePageProps) {
  const { locale } = await params;
  const page = await fetchPage('archive', locale);

  if (!page?.blocks?.length) {
    throw new Error(
      `[archive] DB에 slug='archive' 페이지가 없거나 블록이 비어있습니다 (locale=${locale}). ` +
        '시드 데이터를 확인하세요: scripts/run-seed.sh',
    );
  }

  const blocks = (page as Page).blocks;

  return (
    <div className="min-h-screen">
      <BlockRenderer blocks={blocks} />
    </div>
  );
}
