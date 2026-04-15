'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { journalsApi, type Journal, JournalCategory } from '@/lib/api';
import { useScrollAnimation } from '@/components/shared/hooks/useScrollAnimation';
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

const CATEGORY_LABELS: Record<JournalCategory, string> = {
  [JournalCategory.CULTURE]: '다문화',
  [JournalCategory.USAGE]: '사용법',
  [JournalCategory.TABLE_SETTING]: '찻자리 세팅',
  [JournalCategory.NEWS]: '소식',
};

function JournalCard({ journal, index }: { journal: Journal; index: number }) {
  const imgSources = [
    'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png',
    'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png',
    'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png',
  ];
  const img = imgSources[index % imgSources.length];

  return (
    <Link
      href={`/journal/${journal.slug}`}
      className="group block bg-background overflow-hidden transition-shadow hover:shadow-lg"
    >
      <div className="relative h-48 bg-muted overflow-hidden">
        {journal.coverImageUrl ? (
          <Image
            src={journal.coverImageUrl}
            alt={journal.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <Image
            src={img}
            alt={journal.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        )}
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            {CATEGORY_LABELS[journal.category]}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{journal.readTime ?? ''}</span>
        </div>
        <h3 className="font-display text-lg text-foreground mb-1 group-hover:underline">
          {journal.title}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">{journal.subtitle ?? ''}</p>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {journal.summary ?? ''}
        </p>
        <time className="block mt-4 text-xs text-muted-foreground">{journal.date}</time>
      </div>
    </Link>
  );
}

export default function JournalPreviewBlock({ content }: Props) {
  const { title, limit = 6, category, more_href, prefetched_journals } = content;
  const [journals, setJournals] = useState<Journal[]>(prefetched_journals ?? []);
  const [loading, setLoading] = useState(!prefetched_journals);
  const { ref, visible } = useScrollAnimation<HTMLElement>();

  useEffect(() => {
    if (prefetched_journals && prefetched_journals.length > 0) return;

    let cancelled = false;

    async function fetchJournals() {
      try {
        const data = await journalsApi.getAll(category);
        if (!cancelled) {
          setJournals(data.slice(0, limit));
        }
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchJournals();
    return () => { cancelled = true; };
  }, [category, limit, prefetched_journals]);

  if (loading) {
    return (
      <section className="py-12">
        {title && <h2 className="text-2xl font-medium mb-8">{title}</h2>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="rounded-lg overflow-hidden">
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
            전체 보기 →
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {journals.map((journal, i) => (
          <div
            key={journal.id}
            className={cn(
              'transition-all duration-600 ease-out',
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5',
            )}
            style={{ transitionDelay: visible ? `${i * 100}ms` : undefined }}
          >
            <JournalCard journal={journal} index={i} />
          </div>
        ))}
      </div>
    </section>
  );
}
