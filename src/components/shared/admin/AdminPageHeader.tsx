import type { ReactNode } from 'react';
import { cn } from '@/components/ui/utils';

interface AdminPageHeaderProps {
  title: string;
  description?: ReactNode;
  breadcrumbs?: ReactNode;
  actions?: ReactNode;
  action?: ReactNode;
  meta?: ReactNode;
  filters?: ReactNode;
  className?: string;
  titleClassName?: string;
}

export function AdminPageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  action,
  meta,
  filters,
  className,
  titleClassName,
}: AdminPageHeaderProps) {
  const actionContent = actions ?? action;

  return (
    <header className={cn('space-y-4', className)}>
      {breadcrumbs && <div className="typo-label text-muted-foreground">{breadcrumbs}</div>}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className={cn('typo-h1 font-display text-foreground', titleClassName)}>{title}</h1>
          {description && <div className="typo-body-sm text-muted-foreground">{description}</div>}
        </div>
        {(meta || actionContent) && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            {meta && <div className="typo-body-sm text-muted-foreground">{meta}</div>}
            {actionContent}
          </div>
        )}
      </div>
      {filters && <div className="rounded-lg border bg-card p-4 shadow-sm">{filters}</div>}
    </header>
  );
}
