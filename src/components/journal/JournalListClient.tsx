'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/components/ui/utils';
import { TEAPOT_IMAGES } from '@/lib/teapot-images';
import {
  JOURNAL_ENTRIES,
  JOURNAL_CATEGORIES,
  type JournalCategory,
  type JournalEntry,
} from '@/lib/journal';

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
      {JOURNAL_CATEGORIES.map((cat) => (
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
          {cat}
        </button>
      ))}
    </div>
  );
}

function JournalCard({ entry, index }: { entry: JournalEntry; index: number }) {
  const img = TEAPOT_IMAGES[index % TEAPOT_IMAGES.length];
  return (
    <Link
      href={`/journal/${entry.slug}`}
      className="group block rounded-lg border border-border bg-background overflow-hidden transition-shadow hover:shadow-lg"
    >
      <div className="relative h-48 bg-muted overflow-hidden">
        <Image
          src={img.src}
          alt={entry.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            {entry.category}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{entry.readTime}</span>
        </div>
        <h3 className="font-display typo-h3 font-bold text-foreground mb-1 group-hover:underline">
          {entry.title}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">{entry.subtitle}</p>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {entry.summary}
        </p>
        <time className="block mt-4 text-xs text-muted-foreground">{entry.date}</time>
      </div>
    </Link>
  );
}

export default function JournalListClient() {
  const [selectedCategory, setSelectedCategory] = useState<JournalCategory | null>(null);

  const filtered = selectedCategory
    ? JOURNAL_ENTRIES.filter((e) => e.category === selectedCategory)
    : JOURNAL_ENTRIES;

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
          {filtered.map((entry, i) => (
            <JournalCard key={entry.slug} entry={entry} index={i} />
          ))}
        </div>
      )}
    </>
  );
}
