import ProductSkeleton from '@/components/shared/products/ProductSkeleton';

export default function ProductsLoading() {
  return (
    <div className="layout-container catalog-container max-w-7xl py-8">
      <div className="h-8 w-32 animate-skeleton-shimmer rounded bg-muted" />
      <div className="mt-6">
        <ProductSkeleton />
      </div>
    </div>
  );
}
