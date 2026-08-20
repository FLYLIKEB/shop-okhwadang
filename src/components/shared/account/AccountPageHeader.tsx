import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/components/ui/utils';

interface AccountPageHeaderProps {
  title: string;
  backHref?: string;
  backLabel?: string;
  action?: ReactNode;
  className?: string;
}

export function AccountPageHeader({
  title,
  backHref,
  backLabel,
  action,
  className,
}: AccountPageHeaderProps) {
  return (
    <div className={cn('toss-account__subpage-header mb-6 flex items-center justify-between gap-4', className)}>
      <div className="flex min-w-0 items-center gap-2">
        {backHref && backLabel && (
          <>
            <Link href={backHref} className="text-sm text-muted-foreground transition-colors hover:text-primary">
              {backLabel}
            </Link>
            <span className="text-muted-foreground">/</span>
          </>
        )}
        <h1 className="checkout-toss-title typo-h2 truncate">{title}</h1>
      </div>
      {action}
    </div>
  );
}
