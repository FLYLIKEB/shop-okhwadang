import { cn } from '@/components/ui/utils';

interface SkeletonLineProps {
  width?: string;
  className?: string;
}

export function SkeletonLine({ width = 'w-full', className }: SkeletonLineProps) {
  return <div className={cn('h-3 rounded animate-skeleton-shimmer', width, className)} />;
}

interface SkeletonBoxProps {
  width?: string;
  height?: string;
  className?: string;
}

export function SkeletonBox({ width = 'w-full', height = 'h-24', className }: SkeletonBoxProps) {
  return <div className={cn('rounded animate-skeleton-shimmer', width, height, className)} />;
}

export function CardSkeleton({ imageClassName }: { imageClassName?: string } = {}) {
  return (
    <div className="block">
      <div className={cn('aspect-square animate-skeleton-shimmer', imageClassName)} />
      <div className="mt-3 space-y-2">
        <SkeletonLine width="w-3/4" />
        <SkeletonLine width="w-1/2" />
      </div>
    </div>
  );
}
