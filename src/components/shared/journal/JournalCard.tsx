'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Journal } from '@/lib/api';
import { cn } from '@/components/ui/utils';
import { getClientLocale } from '@/utils/clientLocale';

interface JournalCardProps {
  journal: Journal;
  fallbackImageUrl: string;
  categoryLabel: string;
  variant?: 'preview' | 'list';
  excerptLines?: 2 | 3;
}

const TITLE_CLASS_MAP = {
  preview: 'font-display typo-h3 text-foreground transition-colors group-hover:text-primary',
  list: 'font-display typo-h2 text-foreground transition-colors group-hover:text-primary',
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
  const locale = getClientLocale();
  const imageUrl = journal.coverImageDerivatives?.thumbnail || journal.coverImageUrl || fallbackImageUrl;

  return (
    <Link
      href={`/${locale}/journal/${journal.slug}`}
      className={cn(
        'group block overflow-hidden',
        variant === 'preview' && 'surface-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md',
      )}
    >
      <div className="relative h-52 overflow-hidden bg-muted sm:h-56">
        <Image
          src={imageUrl}
          alt={journal.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 typo-label font-semibold tracking-wide text-foreground backdrop-blur-sm">
          {categoryLabel}
        </span>
      </div>
      <div className={cn('pt-4', variant === 'preview' && 'px-4 pb-5')}>
        <div className="mb-2 flex items-center gap-2 typo-label text-muted-foreground">
          <time>{journal.date}</time>
          {journal.readTime && (
            <>
              <span aria-hidden="true">·</span>
              <span>{journal.readTime}</span>
            </>
          )}
        </div>
        <h3 className={TITLE_CLASS_MAP[variant]}>{journal.title}</h3>
        {journal.subtitle && (
          <p className="mt-1 typo-body-sm text-muted-foreground">{journal.subtitle}</p>
        )}
        {journal.summary && (
          <p className={cn('mt-3 typo-body-sm leading-relaxed text-muted-foreground', EXCERPT_CLASS_MAP[excerptLines])}>
            {journal.summary}
          </p>
        )}
      </div>
    </Link>
  );
}
