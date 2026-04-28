'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { inquiriesApi } from '@/lib/api';
import type { Inquiry } from '@/lib/api';
import { useRequireAuth } from '@/components/shared/hooks/useRequireAuth';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { SkeletonBox } from '@/components/ui/Skeleton';
import EmptyState from '@/components/shared/EmptyState';
import { InquiryStatusBadge } from '@/components/shared/admin/StatusBadge';

export default function InquiriesPage() {
  const t = useTranslations('myInquiries');
  const locale = useLocale();
  const { isAuthenticated } = useRequireAuth();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);

  const getTypeLabel = (type: string) => {
    if (type === '상품') return t('types.product');
    if (type === '배송') return t('types.delivery');
    if (type === '결제') return t('types.payment');
    if (type === '교환/반품') return t('types.exchange');
    if (type === '기타') return t('types.other');
    return type;
  };

  const { execute: loadInquiries, isLoading: loading } = useAsyncAction(
    async () => {
      const res = await inquiriesApi.getList();
      setInquiries(Array.isArray(res) ? res : res.data);
    },
    { errorMessage: t('loadError') },
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
        <h1 className="typo-h1">{t('title')}</h1>
        <Link
          href="/my/inquiries/new"
          className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/80 transition-colors"
        >
          {t('newInquiry')}
        </Link>
      </div>

      {inquiries.length === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        <ul className="space-y-2">
          {inquiries.map((inquiry) => (
            <li key={inquiry.id} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenId(openId === inquiry.id ? null : inquiry.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <InquiryStatusBadge status={inquiry.status as 'answered' | 'pending'} context="my" />
                    <span className="text-xs text-muted-foreground">{getTypeLabel(inquiry.type)}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{inquiry.title}</p>
                </div>
                <span className="ml-4 shrink-0 text-xs text-muted-foreground">
                  {new Date(inquiry.createdAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR')}
                </span>
              </button>
              {openId === inquiry.id && (
                <div className="border-t px-4 py-3 bg-muted space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">{t('content')}</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{inquiry.content}</p>
                  </div>
                  {inquiry.answer && (
                    <div className="bg-card border rounded p-3">
                      <p className="text-xs font-semibold text-primary mb-1">{t('answer')}</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{inquiry.answer}</p>
                      {inquiry.answeredAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(inquiry.answeredAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR')}
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
