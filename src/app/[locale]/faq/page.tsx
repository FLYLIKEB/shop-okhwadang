'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import * as Accordion from '@radix-ui/react-accordion';
import { faqsApi } from '@/lib/api';
import type { Faq } from '@/lib/api';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { SkeletonBox } from '@/components/ui/Skeleton';
import EmptyState from '@/components/shared/EmptyState';
import { cn } from '@/components/ui/utils';

const CATEGORIES = ['전체', '배송', '결제', '교환/반품', '회원', '기타'];

export default function FaqPage() {
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [activeCategory, setActiveCategory] = useState('전체');

  const { execute: loadFaqs, isLoading: loading } = useAsyncAction(
    async () => {
      const cat = activeCategory === '전체' ? undefined : activeCategory;
      const res = await faqsApi.getList(cat, locale);
      setFaqs(Array.isArray(res) ? res : (res?.data ?? []));
    },
    { errorMessage: 'FAQ를 불러오지 못했습니다.' },
  );

  useEffect(() => {
    void loadFaqs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, locale]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="typo-h1 mb-6">자주 묻는 질문</h1>

      <div className="flex gap-2 flex-wrap mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'px-4 py-1.5 rounded-full typo-button border transition-colors',
              activeCategory === cat
                ? 'bg-black text-white border-black'
                : 'border-gray-300 text-gray-600 hover:border-gray-500',
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBox key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : (faqs?.length ?? 0) === 0 ? (
        <EmptyState title="해당 카테고리의 FAQ가 없습니다." />
      ) : (
        <Accordion.Root type="single" collapsible className="divide-y divide-gray-200 border-t border-b">
          {faqs.map((faq) => (
            <Accordion.Item key={faq.id} value={String(faq.id)}>
              <Accordion.Header>
                <Accordion.Trigger className="flex items-center justify-between w-full px-2 py-4 text-left typo-h3 text-gray-800 hover:bg-gray-50 transition-colors">
                  <span>{faq.question}</span>
                  <span className="faq-arrow ml-4 shrink-0 text-gray-400 transition-transform duration-200">▼</span>
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                <div className="px-2 pb-4 typo-body text-gray-600 bg-gray-50">
                  {faq.answer}
                </div>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      )}
    </div>
  );
}
