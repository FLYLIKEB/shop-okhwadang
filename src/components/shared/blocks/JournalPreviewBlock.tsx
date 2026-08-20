'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { journalsApi, type Journal, JournalCategory } from '@/lib/api';
import { useScrollAnimation } from '@/components/shared/hooks/useScrollAnimation';
import { useBlockData } from '@/components/shared/hooks/useBlockData';
import JournalCard from '@/components/shared/journal/JournalCard';
import { getJournalCategoryMessageKey } from '@/components/shared/journal/journalCategory';
import { cn } from '@/components/ui/utils';

interface JournalPreviewContent {
  title?: string;
  limit?: number;
  category?: JournalCategory;
  more_href?: string;
  /** 서버에서 미리 가져온 저널 데이터 (fallback용) */
  prefetched_journals?: Journal[];
}

interface Props {
  content: JournalPreviewContent;
}

const PREVIEW_FALLBACK_IMAGES = [
  'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png',
  'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png',
  'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png',
] as const;

export default function JournalPreviewBlock({ content }: Props) {
  const locale = useLocale();
  const tCommon = useTranslations('common');
  const tCategory = useTranslations('journalCategories');
  const { title, limit = 6, category, more_href, prefetched_journals } = content;
  const { ref, visible } = useScrollAnimation<HTMLElement>();

  const { data: journals, loading } = useBlockData<Journal>({
    prefetched: prefetched_journals,
    fetch: async () => {
      const data = await journalsApi.getAll(category, locale);
      return data.slice(0, limit);
    },
    deps: [category, limit, locale],
  });

  if (loading) {
    return (
      <section className="py-16 md:py-24">
        {title && <h2 className="mb-8 font-display typo-h2 text-foreground">{title}</h2>}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: limit }).map((_, index) => (
            <div key={index} className="overflow-hidden">
              <div className="h-52 bg-muted animate-skeleton-shimmer sm:h-56" />
              <div className="space-y-2 pt-4">
                <div className="h-3 w-16 rounded bg-muted animate-skeleton-shimmer" />
                <div className="h-5 w-3/4 rounded bg-muted animate-skeleton-shimmer" />
                <div className="h-3 w-1/2 rounded bg-muted animate-skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (journals.length === 0) return null;

  return (
    <section
      ref={ref}
      className={cn(
        'py-16 md:py-24 transition-all duration-600 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5',
      )}
    >
      <div className="mb-8 flex items-end justify-between gap-4">
        {title && <h2 className="font-display typo-h2 text-foreground">{title}</h2>}
        <div className="shrink-0">
          <Link
            href={more_href ?? '/journal'}
            className="typo-button text-muted-foreground transition-colors hover:text-foreground"
          >
            {tCommon('viewAll')} →
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {journals.map((journal, index) => (
          <div
            key={journal.id}
            className={cn(
              'transition-all duration-600 ease-out',
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5',
            )}
            style={{ transitionDelay: visible ? `${index * 100}ms` : undefined }}
          >
            <JournalCard
              journal={journal}
              fallbackImageUrl={PREVIEW_FALLBACK_IMAGES[index % PREVIEW_FALLBACK_IMAGES.length]}
              categoryLabel={tCategory(getJournalCategoryMessageKey(journal.category))}
              variant="preview"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
