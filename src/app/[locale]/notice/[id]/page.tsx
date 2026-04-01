'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { noticesApi } from '@/lib/api';
import type { Notice } from '@/lib/api';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { SkeletonBox } from '@/components/ui/Skeleton';

// DOMPurify requires browser environment — load without SSR
const DOMPurifyContent = dynamic(
  () => import('@/components/common/SafeHtml'),
  { ssr: false },
);

export default function NoticeDetailPage() {
  const { id, locale } = useParams<{ id: string; locale: string }>();
  const router = useRouter();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [notFound, setNotFound] = useState(false);

  const { execute: loadNotice, isLoading: loading } = useAsyncAction(
    async () => {
      const data = await noticesApi.getOne(Number(id), locale);
      setNotice(data);
    },
    { onError: () => setNotFound(true) },
  );

  useEffect(() => {
    void loadNotice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, locale]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <SkeletonBox className="h-8 w-2/3 rounded" />
        <SkeletonBox className="h-4 w-1/4 rounded" />
        <SkeletonBox className="h-40 rounded" />
      </div>
    );
  }

  if (notFound || !notice) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center text-gray-500">
        공지사항을 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1"
      >
        ← 목록으로
      </button>
      <h1 className="text-xl font-bold text-gray-900 mb-2">{notice.title}</h1>
      <div className="flex items-center gap-3 text-xs text-gray-400 mb-6 pb-4 border-b">
        <span>{new Date(notice.createdAt).toLocaleDateString('ko-KR')}</span>
        <span>조회 {notice.viewCount.toLocaleString()}</span>
        {notice.isPinned && (
          <span className="text-blue-600 font-semibold">필독</span>
        )}
      </div>
      <div className="prose prose-sm max-w-none text-gray-700">
        <DOMPurifyContent html={notice.content} />
      </div>
    </div>
  );
}
