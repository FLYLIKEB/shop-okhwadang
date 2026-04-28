'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { inquiriesApi } from '@/lib/api';
import { useRequireAuth } from '@/components/shared/hooks/useRequireAuth';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';

const INQUIRY_TYPES = [
  { value: '상품', key: 'product' },
  { value: '배송', key: 'delivery' },
  { value: '결제', key: 'payment' },
  { value: '교환/반품', key: 'exchange' },
  { value: '기타', key: 'other' },
] as const;

export default function NewInquiryPage() {
  const t = useTranslations('myInquiryForm');
  const router = useRouter();
  useRequireAuth();

  const [type, setType] = useState<(typeof INQUIRY_TYPES)[number]['value']>(INQUIRY_TYPES[0].value);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const { execute: submitInquiry, isLoading: submitting } = useAsyncAction(
    async () => {
      await inquiriesApi.create({ type, title: title.trim(), content: content.trim() });
      router.push('/my/inquiries');
    },
    { successMessage: t('submitSuccess'), errorMessage: t('submitError') },
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error(t('validation.titleContentRequired'));
      return;
    }
    void submitInquiry();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="typo-h1 mb-6">{t('title')}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">{t('type')}</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as (typeof INQUIRY_TYPES)[number]['value'])}
            className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {INQUIRY_TYPES.map((inquiryType) => (
              <option key={inquiryType.value} value={inquiryType.value}>
                {t(`types.${inquiryType.key}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">{t('subject')}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={255}
            placeholder={t('subjectPlaceholder')}
            className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">{t('content')}</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            placeholder={t('contentPlaceholder')}
            className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-2.5 border border-input rounded-lg text-sm font-medium text-foreground hover:bg-muted"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? t('submitting') : t('submit')}
          </button>
        </div>
      </form>
    </div>
  );
}
