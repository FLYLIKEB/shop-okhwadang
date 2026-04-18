'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { adminInquiriesApi } from '@/lib/api';
import type { Inquiry } from '@/lib/api';
import { handleApiError } from '@/utils/error';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { AdminTable } from '@/components/shared/admin/AdminTable';
import { InquiryStatusBadge } from '@/components/shared/admin/StatusBadge';
import { cn } from '@/components/ui/utils';

type StatusFilter = 'all' | 'pending' | 'answered';

export default function AdminInquiriesPage() {
  const { isAdmin } = useAdminGuard();

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [openId, setOpenId] = useState<number | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [answering, setAnswering] = useState(false);

  const { execute: loadInquiries, isLoading } = useAsyncAction(
    async () => {
      const data = await adminInquiriesApi.getAll();
      setInquiries(data);
    },
    { errorMessage: '문의 목록을 불러오지 못했습니다.' },
  );

  useEffect(() => {
    if (isAdmin) void loadInquiries();
  }, [isAdmin, loadInquiries]);

  const filtered = filter === 'all'
    ? inquiries
    : inquiries.filter((i) => i.status === filter);

  const handleAnswer = async (id: number) => {
    if (!answerText.trim()) {
      toast.error('답변 내용을 입력해주세요.');
      return;
    }
    setAnswering(true);
    try {
      const updated = await adminInquiriesApi.answer(id, answerText.trim());
      setInquiries((prev) => prev.map((i) => (i.id === id ? updated : i)));
      setAnswerText('');
      setOpenId(null);
      toast.success('답변이 등록되었습니다.');
    } catch (err) {
      toast.error(handleApiError(err, '답변 등록에 실패했습니다.'));
    } finally {
      setAnswering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="typo-h1">문의 관리</h1>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBox key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    );
  }

  const pendingCount = inquiries.filter((i) => i.status === 'pending').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="typo-h1">문의 관리</h1>
        {pendingCount > 0 && (
          <span className="text-sm font-medium text-red-600">
            미답변 {pendingCount}건
          </span>
        )}
      </div>

      <div className="flex gap-2">
        {(['all', 'pending', 'answered'] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-lg border transition-colors',
              filter === s
                ? 'bg-foreground text-background border-foreground'
                : 'border-input text-muted-foreground hover:bg-muted',
            )}
          >
            {s === 'all' ? '전체' : s === 'pending' ? '미답변' : '답변완료'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">문의가 없습니다.</p>
      ) : (
        <AdminTable
          columns={[
            { label: '상태', width: 'w-20' },
            { label: '문의자', width: 'w-32' },
            { label: '유형', width: 'w-24' },
            { label: '제목' },
            { label: '접수일', width: 'w-28' },
          ]}
          isEmpty={filtered.length === 0}
          emptyMessage="문의가 없습니다."
        >
          {filtered.map((inquiry) => (
            <React.Fragment key={inquiry.id}>
              <tr
                className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => {
                  setOpenId(openId === inquiry.id ? null : inquiry.id);
                  setAnswerText(inquiry.answer ?? '');
                }}
              >
                <td className="px-4 py-3">
                  <InquiryStatusBadge status={inquiry.status as 'answered' | 'pending'} context="admin" />
                </td>
                <td className="px-4 py-3 text-sm">
                  <p className="font-medium truncate">{inquiry.user?.name ?? '-'}</p>
                  <p className="text-xs text-muted-foreground truncate">{inquiry.user?.email ?? ''}</p>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{inquiry.type}</td>
                <td className="px-4 py-3 text-sm font-medium truncate max-w-xs">{inquiry.title}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {new Date(inquiry.createdAt).toLocaleDateString('ko-KR')}
                </td>
              </tr>
              {openId === inquiry.id && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 bg-muted/30 border-b">
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">문의 내용</p>
                        <p className="text-sm whitespace-pre-wrap">{inquiry.content}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">답변</p>
                        <textarea
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value)}
                          rows={4}
                          placeholder="답변을 입력하세요..."
                          className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleAnswer(inquiry.id)}
                          disabled={answering}
                          className="mt-2 px-4 py-2 bg-foreground text-background text-sm rounded-lg hover:bg-foreground/80 disabled:opacity-50 transition-colors"
                        >
                          {answering ? '등록 중...' : inquiry.status === 'answered' ? '답변 수정' : '답변 등록'}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </AdminTable>
      )}
    </div>
  );
}
