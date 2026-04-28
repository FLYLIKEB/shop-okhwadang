export default function ProductDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="aspect-square w-full animate-skeleton-shimmer rounded-lg bg-muted" />
        <div className="flex flex-col gap-4">
          <div className="h-4 w-1/3 animate-skeleton-shimmer rounded bg-muted" />
          <div className="h-8 w-2/3 animate-skeleton-shimmer rounded bg-muted" />
          <div className="h-6 w-1/4 animate-skeleton-shimmer rounded bg-muted" />
          <div className="h-10 w-full animate-skeleton-shimmer rounded bg-muted" />
          <div className="flex gap-3">
            <div className="h-10 flex-1 animate-skeleton-shimmer rounded bg-muted" />
            <div className="h-10 flex-1 animate-skeleton-shimmer rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}