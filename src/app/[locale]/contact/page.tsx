'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { pagesApi } from '@/lib/api';
import type { PageBlock } from '@/lib/api';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import BlockRenderer from '@/components/shared/blocks/BlockRenderer';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { useTranslations } from 'next-intl';

export default function ContactPage() {
  const params = useParams();
  const locale = params.locale as string;
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const t = useTranslations('contact');

  const { execute: loadPage, isLoading } = useAsyncAction(
    async () => {
      const page = await pagesApi.getBySlug('contact', locale);
      if (page?.blocks) setBlocks(page.blocks);
    },
    { errorMessage: t('loadError') },
  );

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  return (
    <div className="editorial-content-page layout-container layout-page">
      {isLoading ? (
        <div className="editorial-page-body">
          <SkeletonBox className="h-8 w-48 mb-4" />
          <SkeletonBox className="h-24" />
        </div>
      ) : blocks.length > 0 ? (
        <div className="editorial-page-body">
          <BlockRenderer blocks={blocks} />
        </div>
      ) : (
        <header className="editorial-page-header">
          <h1 className="typo-h1 mb-2">{t('title')}</h1>
          <p className="typo-body text-muted-foreground">
            {t('description')}
          </p>
        </header>
      )}

      <div className="editorial-section">
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <Link
            href="/my/inquiries/new"
            className="editorial-link"
          >
            {t('newInquiry')}
          </Link>
          <Link
            href="/my/inquiries"
            className="editorial-link"
          >
            {t('myInquiries')}
          </Link>
        </div>
      </div>
    </div>
  );
}
