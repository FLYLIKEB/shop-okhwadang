'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/components/ui/utils';
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
    <div className="flex flex-wrap gap-2 justify-center">
      <button
        onClick={() => onSelect(null)}
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

function JournalCard({ entry }: { entry: JournalEntry }) {
  return (
    <Link
      href={`/journal/${entry.slug}`}
      className="group block rounded-lg border border-border bg-background overflow-hidden transition-shadow hover:shadow-lg"
    >
      {/* 히어로 플레이스홀더 */}
      <div className="h-48 bg-muted flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
        <span className="text-5xl text-muted-foreground/30" aria-hidden="true">
          茶
        </span>
      </div>
      {/* 텍스트 */}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            {entry.category}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{entry.readTime}</span>
        </div>
        <h3 className="font-display-ko text-lg font-bold text-foreground mb-1 group-hover:underline">
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

export default function JournalPage() {
  const [selectedCategory, setSelectedCategory] = useState<JournalCategory | null>(null);

  const filtered = selectedCategory
    ? JOURNAL_ENTRIES.filter((e) => e.category === selectedCategory)
    : JOURNAL_ENTRIES;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-foreground text-background py-20 px-4 text-center">
        <p className="text-xs font-semibold tracking-widest uppercase text-background/60 mb-3">
          Journal
        </p>
        <h1 className="font-display-ko text-4xl font-bold tracking-tight mb-4">
          차와 흙, 그리고 사람의 이야기
        </h1>
        <p className="max-w-xl mx-auto text-sm text-background/70 leading-relaxed">
          다문화의 깊이, 자사호 사용법, 아름다운 찻자리 세팅, 옥화당 소식까지.
          차를 사랑하는 이들을 위한 읽을거리를 모았습니다.
        </p>
      </section>

      {/* 필터 + 목록 */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <div className="mb-12">
          <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-20">
            해당 카테고리의 글이 아직 없습니다.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((entry) => (
              <JournalCard key={entry.slug} entry={entry} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
