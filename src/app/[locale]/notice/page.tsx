'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { noticesApi } from '@/lib/api';
import type { Notice } from '@/lib/api';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { SkeletonBox } from '@/components/ui/Skeleton';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/components/ui/utils';

export default function NoticePage() {
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const [notices, setNotices] = useState<Notice[]>([]);

  const { execute: loadNotices, isLoading: loading } = useAsyncAction(
    async () => {
      const notices = await noticesApi.getList(locale);
      setNotices(notices);
    },
    { errorMessage: '공지사항을 불러오지 못했습니다.' },
  );

  useEffect(() => {
    void loadNotices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">공지사항</h1>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBox key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">공지사항</h1>
      {!notices || notices.length === 0 ? (
        <EmptyState title="등록된 공지사항이 없습니다." />
      ) : (
        <ul className="divide-y divide-gray-200 border-t border-b border-gray-200">
          {notices.map((notice) => (
            <li key={notice.id}>
              <Link
                href={`/notice/${notice.id}`}
                className={cn(
                  'flex items-center justify-between px-2 py-4 hover:bg-gray-50 transition-colors',
                  notice.isPinned && 'bg-blue-50 hover:bg-blue-100',
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {notice.isPinned && (
                    <span className="shrink-0 text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                      필독
                    </span>
                  )}
                  <span className="truncate text-sm font-medium text-gray-800">
                    {notice.title}
                  </span>
                </div>
                <span className="shrink-0 ml-4 text-xs text-gray-400">
                  {new Date(notice.createdAt).toLocaleDateString('ko-KR')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
