import { cn } from '@/components/ui/utils';
import { localMessage } from '@/utils/localMessages';

interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

type PageItem = number | 'ellipsis';

export function getAdminPaginationItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const valid = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  return valid.reduce<PageItem[]>((acc, page) => {
    const previous = acc[acc.length - 1];
    if (typeof previous === 'number' && page - previous > 1) acc.push('ellipsis');
    acc.push(page);
    return acc;
  }, []);
}

export default function AdminPagination({
  currentPage,
  totalPages,
  onPageChange,
}: AdminPaginationProps) {
  if (totalPages <= 1) return null;
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const items = getAdminPaginationItems(safePage, totalPages);

  return (
    <nav className="mt-4 flex flex-col items-center gap-3" aria-label={localMessage('admin.common.pagination.ariaLabel')}>
      <p className="typo-body-sm text-muted-foreground">
        {localMessage('admin.common.pagination.status', { current: safePage, total: totalPages })}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => onPageChange(1)} disabled={safePage === 1} className="rounded border px-3 py-1 typo-body-sm disabled:opacity-40">{localMessage('admin.common.pagination.first')}</button>
        <button type="button" onClick={() => onPageChange(safePage - 1)} disabled={safePage === 1} className="rounded border px-3 py-1 typo-body-sm disabled:opacity-40">{localMessage('admin.common.pagination.previous')}</button>
        {items.map((item, index) => item === 'ellipsis' ? (
          <span key={`ellipsis-${index}`} className="px-2 py-1 typo-body-sm text-muted-foreground" aria-hidden="true">…</span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-current={safePage === item ? 'page' : undefined}
            className={cn(
              'rounded px-3 py-1 typo-body-sm transition-colors',
              safePage === item ? 'bg-primary text-primary-foreground' : 'border hover:bg-secondary',
            )}
          >
            {item}
          </button>
        ))}
        <button type="button" onClick={() => onPageChange(safePage + 1)} disabled={safePage === totalPages} className="rounded border px-3 py-1 typo-body-sm disabled:opacity-40">{localMessage('admin.common.pagination.next')}</button>
        <button type="button" onClick={() => onPageChange(totalPages)} disabled={safePage === totalPages} className="rounded border px-3 py-1 typo-body-sm disabled:opacity-40">{localMessage('admin.common.pagination.last')}</button>
      </div>
    </nav>
  );
}
