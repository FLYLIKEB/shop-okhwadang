import { SkeletonBox, SkeletonLine } from '@/components/ui/Skeleton';

export default function LocaleLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="mb-6 h-1 w-full overflow-hidden rounded bg-muted">
        <div className="h-full w-1/3 animate-skeleton-shimmer bg-primary/60" />
      </div>

      <div className="space-y-8">
        <section className="space-y-4">
          <SkeletonLine width="w-1/4" className="h-8" />
          <SkeletonBox height="h-64" />
        </section>

        <section className="space-y-4">
          <SkeletonLine width="w-1/3" className="h-6" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <SkeletonBox key={item} height="h-56" />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
