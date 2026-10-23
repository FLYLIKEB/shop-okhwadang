import ProductSkeleton from '@/components/shared/products/ProductSkeleton';

export default function ProductsLoading() {
  return (
    <div className="editorial-catalog py-8">
      <div className="editorial-catalog__header">
        <div className="h-4 w-32 animate-skeleton-shimmer bg-muted" />
      </div>
      <div className="mt-6">
        <ProductSkeleton />
      </div>
    </div>
  );
}
