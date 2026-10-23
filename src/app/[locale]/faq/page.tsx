'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import * as Accordion from '@radix-ui/react-accordion';
import { faqsApi } from '@/lib/api';
import type { Faq } from '@/lib/api';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { SkeletonBox } from '@/components/ui/Skeleton';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

const CATEGORIES = [
  { key: 'all', value: '전체' },
  { key: 'shipping', value: '배송' },
  { key: 'payment', value: '결제' },
  { key: 'exchange', value: '교환/반품' },
  { key: 'member', value: '회원' },
  { key: 'other', value: '기타' },
] as const;

export default function FaqPage() {
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const t = useTranslations('faqPage');
  const [activeCategory, setActiveCategory] = useState<(typeof CATEGORIES)[number]['key']>('all');

  const { execute: loadFaqs, isLoading: loading } = useAsyncAction(
    async () => {
      const categoryValue = CATEGORIES.find((category) => category.key === activeCategory)?.value;
      const res = await faqsApi.getList(categoryValue === '전체' ? undefined : categoryValue, locale);
      setFaqs(Array.isArray(res) ? res : (res?.data ?? []));
    },
    { errorMessage: t('loadError') },
  );

  useEffect(() => {
    void loadFaqs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, locale]);

  return (
    <div className="editorial-content-page layout-container layout-page">
      <header className="editorial-page-header">
        <h1>{t('title')}</h1>
      </header>

      <div className="mb-6 flex flex-wrap gap-x-6 gap-y-1">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.key}
            variant="link"
            size="sm"
            onClick={() => setActiveCategory(cat.key)}
            aria-pressed={activeCategory === cat.key}
            className="px-0 font-normal text-foreground underline-offset-4 data-[active=true]:underline"
            data-active={activeCategory === cat.key}
          >
            {t(`categories.${cat.key}`)}
          </Button>
        ))}
      </div>

      <section className="editorial-section mb-8">
        <h2>{t('orderLookupTitle')}</h2>
        <p className="mt-2 typo-body text-muted-foreground">{t('orderLookupGuestDescription')}</p>
        <Link href={`/${locale}/order/lookup`} className="editorial-link mt-2">{t('orderLookupGuestAction')}</Link>
        <p className="mt-4 typo-body text-muted-foreground">{t('orderLookupMemberDescription')}</p>
        <p className="mt-2 typo-body-sm text-muted-foreground">{t('orderLookupMemberAction')}</p>
      </section>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBox key={i} className="h-14" />
          ))}
        </div>
      ) : (faqs?.length ?? 0) === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        <Accordion.Root type="single" collapsible className="divide-y divide-border border-y border-border">
          {faqs.map((faq) => (
            <Accordion.Item key={faq.id} value={String(faq.id)}>
              <Accordion.Header>
                <Accordion.Trigger className="flex min-h-11 w-full items-center py-4 text-left font-normal text-foreground underline-offset-4 hover:underline data-[state=open]:underline">
                  <span>{faq.question}</span>
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <div className="pb-5 leading-relaxed text-muted-foreground">{faq.answer}</div>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      )}
    </div>
  );
}
