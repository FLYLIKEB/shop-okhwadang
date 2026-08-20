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
import { AccountPageHeader } from '@/components/shared/account/AccountPageHeader';
import { AccountPageShell } from '@/components/shared/account/AccountPageShell';

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
    <AccountPageShell maxWidth="max-w-3xl" className="toss-account__inquiries">
      <AccountPageHeader
        title={t('title')}
        action={(
          <Link
            href="/my/inquiries/new"
            className="toss-inquiry__new rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80"
          >
            {t('newInquiry')}
          </Link>
        )}
      />

      {inquiries.length === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        <ul className="toss-inquiry__list space-y-4">
          {inquiries.map((inquiry) => (
            <li key={inquiry.id} className="toss-inquiry__card surface-card overflow-hidden">
              <button
                onClick={() => setOpenId(openId === inquiry.id ? null : inquiry.id)}
                className="toss-inquiry__summary flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <InquiryStatusBadge
                      status={inquiry.status as 'answered' | 'pending'}
                      context="my"
                      className={inquiry.status === 'answered'
                        ? 'toss-inquiry-status toss-inquiry-status--answered'
                        : 'toss-inquiry-status toss-inquiry-status--pending'}
                    />
                    <span className="text-xs text-muted-foreground">{getTypeLabel(inquiry.type)}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{inquiry.title}</p>
                </div>
                <span className="ml-4 shrink-0 text-xs text-muted-foreground">
                  {new Date(inquiry.createdAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR')}
                </span>
              </button>
              {openId === inquiry.id && (
                <div className="toss-inquiry__detail space-y-3 px-5 py-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">{t('content')}</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{inquiry.content}</p>
                  </div>
                  {inquiry.answer && (
                    <div className="toss-inquiry__answer rounded-xl p-4">
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
    </AccountPageShell>
  );
}
