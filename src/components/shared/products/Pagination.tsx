'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui/utils';

interface PaginationProps {
  total: number;
  page: number;
  limit: number;
}

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [1];

  if (current > 3) {
    pages.push('ellipsis');
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push('ellipsis');
  }

  pages.push(total);

  return pages;
}

export default function Pagination({ total, page, limit }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('common.pagination');
  const totalPages = Math.ceil(total / limit);

  if (totalPages <= 1) return null;

  const goToPage = (targetPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(targetPage));
    router.push(`/products?${params.toString()}`);
  };

  const pages = getPageNumbers(page, totalPages);

  return (
    <nav aria-label={t('nav')} className="flex items-center justify-center gap-1">
      <button
        type="button"
        onClick={() => goToPage(page - 1)}
        disabled={page <= 1}
        className={cn(
          'rounded-md px-3 py-1.5 text-sm transition-colors',
          page <= 1
            ? 'cursor-not-allowed text-muted-foreground opacity-50'
            : 'text-foreground hover:bg-accent',
        )}
      >
        {t('prev')}
      </button>

      {pages.map((p, idx) =>
        p === 'ellipsis' ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
            ...
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => goToPage(p)}
            aria-label={t('pageNumber')}
            aria-current={p === page ? 'page' : undefined}
            className={cn(
              'min-w-8 rounded-md px-2 py-1.5 text-sm transition-colors',
              p === page
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-accent',
            )}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => goToPage(page + 1)}
        disabled={page >= totalPages}
        className={cn(
          'rounded-md px-3 py-1.5 text-sm transition-colors',
          page >= totalPages
            ? 'cursor-not-allowed text-muted-foreground opacity-50'
            : 'text-foreground hover:bg-accent',
        )}
      >
        {t('next')}
      </button>
    </nav>
  );
}
