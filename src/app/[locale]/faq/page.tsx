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
    <div className="toss-customer-page mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 typo-h1">{t('title')}</h1>

      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.key}
            variant={activeCategory === cat.key ? 'black' : 'gray'}
            size="sm"
            onClick={() => setActiveCategory(cat.key)}
            className="toss-customer-category rounded-full"
          >
            {t(`categories.${cat.key}`)}
          </Button>
        ))}
      </div>

      <section className="toss-customer-lookup mb-6 rounded-2xl border border-border bg-muted/20 p-5">
        <h2 className="typo-h3 text-foreground">{t('orderLookupTitle')}</h2>
        <p className="mt-2 typo-body text-muted-foreground">{t('orderLookupGuestDescription')}</p>
        <Button asChild variant="black" size="sm" className="mt-3">
          <Link href={`/${locale}/order/lookup`}>{t('orderLookupGuestAction')}</Link>
        </Button>
        <p className="mt-4 typo-body text-muted-foreground">{t('orderLookupMemberDescription')}</p>
        <p className="mt-2 typo-body-sm text-muted-foreground">{t('orderLookupMemberAction')}</p>
      </section>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBox key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : (faqs?.length ?? 0) === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        <Accordion.Root type="single" collapsible className="toss-customer-faq divide-y divide-border border-b border-t">
          {faqs.map((faq) => (
            <Accordion.Item key={faq.id} value={String(faq.id)}>
              <Accordion.Header>
                <Accordion.Trigger className="toss-customer-faq__trigger flex w-full items-center justify-between px-2 py-4 text-left typo-h3 text-foreground transition-colors hover:bg-muted">
                  <span>{faq.question}</span>
                  <span className="faq-arrow ml-4 shrink-0 text-muted-foreground transition-transform duration-200">
                    ▼
                  </span>
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <div className="toss-customer-faq__answer px-2 pb-4 typo-body text-muted-foreground">{faq.answer}</div>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      )}
    </div>
  );
}
