'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
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
  const tCommon = useTranslations('common');
  const tCategory = useTranslations('journalCategories');
  const { title, limit = 6, category, more_href, prefetched_journals } = content;
  const { ref, visible } = useScrollAnimation<HTMLElement>();

  const { data: journals, loading } = useBlockData<Journal>({
    prefetched: prefetched_journals,
    fetch: async () => {
      const data = await journalsApi.getAll(category);
      return data.slice(0, limit);
    },
    deps: [category, limit],
  });

  if (loading) {
    return (
      <section className="py-16 md:py-24">
        {title && <h2 className="text-2xl font-medium mb-8">{title}</h2>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: limit }).map((_, index) => (
            <div key={index} className="rounded-lg overflow-hidden">
              <div className="h-48 bg-muted animate-pulse" />
              <div className="p-5 space-y-2">
                <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                <div className="h-5 w-3/4 bg-muted rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
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
        'py-12 transition-all duration-600 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5',
      )}
    >
      <div className="mb-8">
        {title && <h2 className="text-2xl font-medium">{title}</h2>}
        <div className="text-right mt-2">
          <Link
            href={more_href ?? '/journal'}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {tCommon('viewAll')} →
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
