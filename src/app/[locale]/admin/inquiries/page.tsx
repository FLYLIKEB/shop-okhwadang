'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { useAdminListPage } from '@/components/shared/hooks/useAdminListPage';
import { adminInquiriesApi } from '@/lib/api';
import type { Inquiry } from '@/lib/api';
import { handleApiError } from '@/utils/error';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/button';
import { AdminTable } from '@/components/shared/admin/AdminTable';
import { InquiryStatusBadge } from '@/components/shared/admin/StatusBadge';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import { AdminFilterChips } from '@/components/shared/admin/AdminFilterChips';
import { PaginatedAdminTableShell } from '@/components/shared/admin/PaginatedAdminTableShell';
import { toastMessage } from '@/utils/toastMessages';
import { formatDate } from '@/utils/date';

type InquiryStatusFilter = 'all' | 'pending' | 'answered';

const STATUS_FILTERS = [
  { label: '전체', value: 'all' },
  { label: '미답변', value: 'pending' },
  { label: '답변완료', value: 'answered' },
] as const;

const PAGE_SIZE = 20;

export default function AdminInquiriesPage() {
  const { isAdmin } = useAdminGuard();

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [openId, setOpenId] = useState<number | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [answering, setAnswering] = useState(false);
  const { page, setPage, filters, setFilter } = useAdminListPage({
    initialFilters: {
      status: 'all' as InquiryStatusFilter,
    },
  });

  const { execute: loadInquiries, isLoading } = useAsyncAction(
    async () => {
      const response = await adminInquiriesApi.getAll({
        page,
        limit: PAGE_SIZE,
        status: filters.status === 'all' ? undefined : filters.status,
      });
      setInquiries(response.items);
      setTotal(response.total);
      setPendingCount(response.counts.pending);
    },
    { errorMessage: '문의 목록을 불러오지 못했습니다.' },
  );

  useEffect(() => {
    if (isAdmin) void loadInquiries();
  }, [isAdmin, loadInquiries, page, filters.status]);

  const handleAnswer = async (id: number) => {
    if (!answerText.trim()) {
      toast.error(toastMessage('answerRequired'));
      return;
    }

    setAnswering(true);
    try {
      await adminInquiriesApi.answer(id, answerText.trim());
      await loadInquiries();
      setAnswerText('');
      setOpenId(null);
      toast.success(toastMessage('answerCreated'));
    } catch (err) {
      toast.error(handleApiError(err, toastMessage('answerCreateError')));
    } finally {
      setAnswering(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="문의 관리"
        titleClassName="typo-h1"
        meta={pendingCount > 0 ? (
          <span className="typo-body-sm font-medium text-red-600">미답변 {pendingCount}건</span>
        ) : undefined}
      />

      <AdminFilterChips
        items={STATUS_FILTERS}
        value={filters.status}
        onToggle={(value) => setFilter('status', value as InquiryStatusFilter)}
        ariaLabel="문의 상태 필터"
        tone="inverted"
        radius="md"
        size="sm"
      />

      {isLoading && inquiries.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBox key={index} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : (
        <PaginatedAdminTableShell
          loading={isLoading}
          loadingMessage="문의 목록을 불러오는 중..."
          isEmpty={inquiries.length === 0}
          emptyMessage="문의가 없습니다."
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        >
        <AdminTable
          columns={[
            { label: '상태', width: 'w-20' },
            { label: '문의자', width: 'w-32' },
            { label: '유형', width: 'w-24' },
            { label: '제목' },
            { label: '접수일', width: 'w-28' },
          ]}
          isEmpty={inquiries.length === 0}
          emptyMessage="문의가 없습니다."
        >
          {inquiries.map((inquiry) => (
            <React.Fragment key={inquiry.id}>
              <tr
                className="border-b border-soft hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => {
                  setOpenId(openId === inquiry.id ? null : inquiry.id);
                  setAnswerText(inquiry.answer ?? '');
                }}
              >
                <td className="px-4 py-3">
                  <InquiryStatusBadge status={inquiry.status as 'answered' | 'pending'} context="admin" />
                </td>
                <td className="px-4 py-3 text-sm">
                  <p className="typo-body-sm font-medium truncate">{inquiry.user?.name ?? '-'}</p>
                  <p className="typo-body-sm text-muted-foreground truncate">{inquiry.user?.email ?? ''}</p>
                </td>
                <td className="px-4 py-3 typo-body-sm text-muted-foreground">{inquiry.type}</td>
                <td className="px-4 py-3 typo-body-sm font-medium truncate max-w-xs">{inquiry.title}</td>
                <td className="px-4 py-3 typo-body-sm text-muted-foreground">
                  {formatDate(inquiry.createdAt, 'ko')}
                </td>
              </tr>
              {openId === inquiry.id && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 surface-card border-b border-soft">
                    <div className="space-y-4">
                      <div>
                        <p className="typo-label font-semibold text-muted-foreground mb-1">문의 내용</p>
                        <p className="typo-body-sm whitespace-pre-wrap">{inquiry.content}</p>
                      </div>
                      <div>
                        <p className="typo-label font-semibold text-muted-foreground mb-1">답변</p>
                        <textarea
                          value={answerText}
                          onChange={(event) => setAnswerText(event.target.value)}
                          rows={4}
                          placeholder="답변을 입력하세요..."
                          className="field-soft w-full rounded-lg px-3 py-2 typo-body-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                        <Button
                          type="button"
                          onClick={() => handleAnswer(inquiry.id)}
                          disabled={answering}
                          className="mt-2"
                        >
                          {answering ? '등록 중...' : inquiry.status === 'answered' ? '답변 수정' : '답변 등록'}
                        </Button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </AdminTable>
        </PaginatedAdminTableShell>
      )}
    </div>
  );
}
