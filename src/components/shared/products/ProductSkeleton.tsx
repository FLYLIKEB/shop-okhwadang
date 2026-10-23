import { CardSkeleton, SkeletonLine, SkeletonBox } from '@/components/ui/Skeleton';

interface ProductSkeletonProps {
  count?: number;
  view?: 'grid' | 'list';
}

function ListSkeleton() {
  return (
    <div className="flex flex-col">
      <SkeletonBox height="aspect-square" />
      <div className="flex flex-col gap-2 px-2 py-3">
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
      <div className="flex flex-col">
        {items.map((i) => (
          <ListSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="catalog-product-grid lg:grid-cols-4">
      {items.map((i) => (
        <CardSkeleton key={i} imageClassName="product-card__image" />
      ))}
    </div>
  );
}
