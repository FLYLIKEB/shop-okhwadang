import type { ReactNode } from 'react';
import { StateFeedback } from '@/components/shared/StateFeedback';

interface AdminStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function AdminLoadingState({ title, description, className }: AdminStateProps) {
  return (
    <StateFeedback
      variant="admin"
      tone="loading"
      title={title}
      description={description}
      className={className}
      role="status"
      ariaLive="polite"
    />
  );
}

export function AdminEmptyState({ title, description, action, className }: AdminStateProps) {
  return (
    <StateFeedback
      variant="admin"
      tone="empty"
      title={title}
      description={description}
      action={action}
      className={className}
      role="status"
    />
  );
}

export function AdminErrorState({ title, description, action, className }: AdminStateProps) {
  return (
    <StateFeedback
      variant="admin"
      tone="error"
      title={title}
      description={description}
      action={action}
      className={className}
      role="alert"
    />
  );
}
