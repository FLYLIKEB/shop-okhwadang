'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/components/ui/utils';
import { TEAPOT_IMAGES } from '@/lib/teapot-images';
import { journalsApi, type Journal, JournalCategory } from '@/lib/api';

const CATEGORY_LABELS: Record<JournalCategory, string> = {
  [JournalCategory.CULTURE]: '다문화',
  [JournalCategory.USAGE]: '사용법',
  [JournalCategory.TABLE_SETTING]: '찻자리 세팅',
  [JournalCategory.NEWS]: '소식',
};

function CategoryFilter({
  selected,
  onSelect,
}: {
  selected: JournalCategory | null;
  onSelect: (cat: JournalCategory | null) => void;
}) {
  return (
    <div role="group" aria-label="카테고리 필터" className="flex flex-wrap gap-2 justify-center">
      <button
        onClick={() => onSelect(null)}
        aria-pressed={selected === null}
        className={cn(
          'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
          selected === null
            ? 'bg-foreground text-background'
            : 'bg-muted text-muted-foreground hover:text-foreground',
        )}
      >
        전체
      </button>
      {Object.values(JournalCategory).map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          aria-pressed={selected === cat}
          className={cn(
            'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
            selected === cat
              ? 'bg-foreground text-background'
              : 'bg-muted text-muted-foreground hover:text-foreground',
          )}
        >
          {CATEGORY_LABELS[cat]}
        </button>
      ))}
    </div>
  );
}

function JournalCard({ journal, index }: { journal: Journal; index: number }) {
  const img = TEAPOT_IMAGES[index % TEAPOT_IMAGES.length];

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
            src={img.src}
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
        <h3 className="font-display typo-h3 text-foreground mb-1 group-hover:underline">
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

export default function JournalListClient() {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<JournalCategory | null>(null);

  useEffect(() => {
    async function loadJournals() {
      try {
        setLoading(true);
        const data = await journalsApi.getAll();
        setJournals(data);
      } catch {
        setError('저널 목록을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    }
    void loadJournals();
  }, []);

  const filtered = selectedCategory
    ? journals.filter((j) => j.category === selectedCategory)
    : journals;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return <p className="text-center text-sm text-destructive py-20">{error}</p>;
  }

  return (
    <>
      <div className="mb-12">
        <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-20">
          해당 카테고리의 글이 아직 없습니다.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((journal, i) => (
            <JournalCard key={journal.id} journal={journal} index={i} />
          ))}
        </div>
      )}
    </>
  );
}
