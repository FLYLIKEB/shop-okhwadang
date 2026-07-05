import type { ReactNode } from 'react';
import { AlertCircle, Inbox } from 'lucide-react';
import { cn } from '@/components/ui/utils';

interface AdminStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function AdminLoadingState({ title, description, className }: AdminStateProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-6 text-center', className)} role="status" aria-live="polite">
      <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted animate-skeleton-shimmer" />
      <p className="typo-body font-medium">{title}</p>
      {description && <p className="mt-1 typo-body-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

export function AdminEmptyState({ title, description, action, className }: AdminStateProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-6 text-center', className)}>
      <Inbox className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <p className="typo-body font-medium">{title}</p>
      {description && <p className="mt-1 typo-body-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function AdminErrorState({ title, description, action, className }: AdminStateProps) {
  return (
    <div className={cn('rounded-lg border border-destructive/30 bg-card p-6 text-center', className)} role="alert">
      <AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" aria-hidden="true" />
      <p className="typo-body font-medium">{title}</p>
      {description && <p className="mt-1 typo-body-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
