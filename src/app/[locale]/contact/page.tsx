'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, FileText } from 'lucide-react';
import { pagesApi } from '@/lib/api';
import type { PageBlock } from '@/lib/api';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import BlockRenderer from '@/components/shared/blocks/BlockRenderer';
import { SkeletonBox } from '@/components/ui/Skeleton';

export default function ContactPage() {
  const [blocks, setBlocks] = useState<PageBlock[]>([]);

  const { execute: loadPage, isLoading } = useAsyncAction(
    async () => {
      const page = await pagesApi.getBySlug('contact');
      if (page?.blocks) setBlocks(page.blocks);
    },
    { errorMessage: '페이지를 불러오지 못했습니다.' },
  );

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  return (
    <div>
      {isLoading ? (
        <div className="max-w-2xl mx-auto px-4 py-10">
          <SkeletonBox className="h-8 w-48 mb-4" />
          <SkeletonBox className="h-24" />
        </div>
      ) : blocks.length > 0 ? (
        <div className="mx-auto max-w-7xl px-4">
          <BlockRenderer blocks={blocks} />
        </div>
      ) : (
        <div className="max-w-2xl mx-auto px-4 pt-10">
          <h1 className="typo-h1 mb-2">문의하기</h1>
          <p className="typo-body text-muted-foreground">
            궁금한 점이 있으시면 1:1 문의를 이용해주세요.
          </p>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/my/inquiries/new"
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-foreground text-background rounded-md typo-button hover:bg-foreground/80 transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            1:1 문의하기
          </Link>
          <Link
            href="/my/inquiries"
            className="flex-1 flex items-center justify-center gap-2 py-3 border border-border rounded-md typo-button text-foreground hover:bg-muted transition-colors"
          >
            <FileText className="h-4 w-4" />
            내 문의 확인
          </Link>
        </div>
      </div>
    </div>
  );
}
