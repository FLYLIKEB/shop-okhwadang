import Link from 'next/link';
import type { ReactNode } from 'react';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { cn } from '@/components/ui/utils';

const cardShellClassName = 'toss-cms__card group block overflow-hidden transition-shadow hover:shadow-md';

interface ContentCardShellProps {
  href?: string | null;
  className?: string;
  children: ReactNode;
}

export function ContentCardShell({ href, className, children }: ContentCardShellProps) {
  const mergedClassName = cn(cardShellClassName, className);

  if (!href) {
    return <article className={mergedClassName}>{children}</article>;
  }

  return <Link href={href} className={mergedClassName}>{children}</Link>;
}

export function ContentCardSkeleton({ variant }: { variant: 'image' | 'color' }) {
  return (
    <div className="toss-cms__card overflow-hidden">
      <SkeletonBox height="h-40" className="!rounded-none" />
      <div className="p-5 space-y-3">
        {variant === 'color' && <SkeletonBox width="w-24 h-3" />}
        <SkeletonBox width="w-32 h-5" />
        <SkeletonBox width="w-full h-4" />
      </div>
    </div>
  );
}
