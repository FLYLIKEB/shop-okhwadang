'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { inquiriesApi } from '@/lib/api';
import type { Inquiry } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { SkeletonBox } from '@/components/ui/Skeleton';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/components/ui/utils';

export default function InquiriesPage() {
  const { isAuthenticated } = useRequireAuth();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);

  const { execute: loadInquiries, isLoading: loading } = useAsyncAction(
    async () => {
      const res = await inquiriesApi.getList();
      setInquiries(res.data);
    },
    { errorMessage: '문의 내역을 불러오지 못했습니다.' },
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadInquiries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonBox key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">1:1 문의</h1>
        <Link
          href="/my/inquiries/new"
          className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
        >
          문의하기
        </Link>
      </div>

      {inquiries.length === 0 ? (
        <EmptyState title="문의 내역이 없습니다." />
      ) : (
        <ul className="space-y-2">
          {inquiries.map((inquiry) => (
            <li key={inquiry.id} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenId(openId === inquiry.id ? null : inquiry.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        'text-xs font-semibold px-2 py-0.5 rounded',
                        inquiry.status === 'answered'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700',
                      )}
                    >
                      {inquiry.status === 'answered' ? '답변완료' : '접수'}
                    </span>
                    <span className="text-xs text-gray-400">{inquiry.type}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 truncate">{inquiry.title}</p>
                </div>
                <span className="ml-4 shrink-0 text-xs text-gray-400">
                  {new Date(inquiry.createdAt).toLocaleDateString('ko-KR')}
                </span>
              </button>
              {openId === inquiry.id && (
                <div className="border-t px-4 py-3 bg-gray-50 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">문의 내용</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{inquiry.content}</p>
                  </div>
                  {inquiry.answer && (
                    <div className="bg-white border rounded p-3">
                      <p className="text-xs font-semibold text-blue-600 mb-1">답변</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{inquiry.answer}</p>
                      {inquiry.answeredAt && (
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(inquiry.answeredAt).toLocaleDateString('ko-KR')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
