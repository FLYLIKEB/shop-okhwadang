import { cn } from '@/components/ui/utils';
import { CardSkeleton, SkeletonLine, SkeletonBox } from '@/components/ui/Skeleton';

interface ProductSkeletonProps {
  count?: number;
  view?: 'grid' | 'list';
}

function ListSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden rounded-2xl bg-card p-3 shadow-sm">
      <SkeletonBox width="w-24" height="h-24" className="shrink-0 rounded-md" />
      <div className="flex flex-1 flex-col justify-center gap-2">
        <SkeletonLine width="w-3/4" />
        <SkeletonLine width="w-1/3" />
      </div>
    </div>
  );
}

export default function ProductSkeleton({ count = 20, view = 'grid' }: ProductSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (view === 'list') {
    return (
      <div className="flex flex-col gap-3">
        {items.map((i) => (
          <ListSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4')}>
      {items.map((i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
