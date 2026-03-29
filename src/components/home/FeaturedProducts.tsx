import Link from 'next/link';
import ProductCard from '@/components/products/ProductCard';
import { CardSkeleton } from '@/components/ui/Skeleton';
import type { Product } from '@/lib/api';

interface FeaturedProductsProps {
  title: string;
  products: Product[];
  moreHref: string;
  isLoading?: boolean;
}

export default function FeaturedProducts({
  title,
  products,
  moreHref,
  isLoading = false,
}: FeaturedProductsProps) {
  if (!isLoading && products.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{title}</h2>
        <Link
          href={moreHref}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          더 보기 →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          : products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                salePrice={product.salePrice}
                status={product.status}
                images={product.images}
              />
            ))}
      </div>
    </section>
  );
}
