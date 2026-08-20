'use client';

import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

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
    <nav aria-label={t('nav')} className="flex flex-wrap items-center justify-center gap-2">
      <Button
        type="button"
        variant="gray"
        size="sm"
        onClick={() => goToPage(page - 1)}
        disabled={page <= 1}
        className="min-h-11 min-w-16 rounded-full bg-card shadow-sm"
      >
        {t('prev')}
      </Button>

      {pages.map((p, idx) =>
        p === 'ellipsis' ? (
          <span key={`ellipsis-${idx}`} className="px-2 typo-body-sm text-muted-foreground">
            ...
          </span>
        ) : (
          <Button
            key={p}
            type="button"
            variant={p === page ? 'black' : 'gray'}
            size="sm"
            onClick={() => goToPage(p)}
            aria-label={t('pageNumber')}
            aria-current={p === page ? 'page' : undefined}
            className="min-h-11 min-w-11 rounded-full shadow-sm"
          >
            {p}
          </Button>
        ),
      )}

      <Button
        type="button"
        variant="gray"
        size="sm"
        onClick={() => goToPage(page + 1)}
        disabled={page >= totalPages}
        className="min-h-11 min-w-16 rounded-full bg-card shadow-sm"
      >
        {t('next')}
      </Button>
    </nav>
  );
}
