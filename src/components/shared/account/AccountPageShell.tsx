import type { ReactNode } from 'react';
import { cn } from '@/components/ui/utils';

interface AccountPageShellProps {
  children: ReactNode;
  maxWidth?: string;
  className?: string;
}

export function AccountPageShell({ children, maxWidth = 'max-w-3xl', className }: AccountPageShellProps) {
  return (
    <div className={cn('toss-account__page-shell mx-auto px-4 py-10', maxWidth, className)}>
      {children}
    </div>
  );
}
