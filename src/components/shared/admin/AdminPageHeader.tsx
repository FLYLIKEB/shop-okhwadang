import type { ReactNode } from 'react';
import { cn } from '@/components/ui/utils';

interface AdminPageHeaderProps {
  title: string;
  action?: ReactNode;
  meta?: ReactNode;
  className?: string;
  titleClassName?: string;
}

export function AdminPageHeader({
  title,
  action,
  meta,
  className,
  titleClassName,
}: AdminPageHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <h1 className={cn('text-2xl font-bold', titleClassName)}>{title}</h1>
      {meta ?? action}
    </div>
  );
}
