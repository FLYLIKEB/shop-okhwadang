'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Journal } from '@/lib/api';
import { cn } from '@/components/ui/utils';

interface JournalCardProps {
  journal: Journal;
  fallbackImageUrl: string;
  categoryLabel: string;
  variant?: 'preview' | 'list';
  excerptLines?: 2 | 3;
}

const TITLE_CLASS_MAP = {
  preview: 'font-display text-lg text-foreground mb-1 group-hover:underline',
  list: 'font-display typo-h3 text-foreground mb-1 group-hover:underline',
} as const;

const EXCERPT_CLASS_MAP = {
  2: 'line-clamp-2',
  3: 'line-clamp-3',
} as const;

export default function JournalCard({
  journal,
  fallbackImageUrl,
  categoryLabel,
  variant = 'list',
  excerptLines = 2,
}: JournalCardProps) {
  const imageUrl = journal.coverImageUrl || fallbackImageUrl;

  return (
    <Link
      href={`/journal/${journal.slug}`}
      className="group block bg-background overflow-hidden transition-shadow hover:shadow-lg"
    >
      <div className="relative h-48 bg-muted overflow-hidden">
        <Image
          src={imageUrl}
          alt={journal.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            {categoryLabel}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{journal.readTime ?? ''}</span>
        </div>
        <h3 className={TITLE_CLASS_MAP[variant]}>{journal.title}</h3>
        <p className="text-xs text-muted-foreground mb-3">{journal.subtitle ?? ''}</p>
        <p className={cn('text-sm text-muted-foreground leading-relaxed', EXCERPT_CLASS_MAP[excerptLines])}>
          {journal.summary ?? ''}
        </p>
        <time className="block mt-4 text-xs text-muted-foreground">{journal.date}</time>
      </div>
    </Link>
  );
}
