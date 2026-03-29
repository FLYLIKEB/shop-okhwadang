import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/components/ui/utils';
import type { ProductImage } from '@/lib/api';
import PriceDisplay from '@/components/common/PriceDisplay';
import WishlistButton from '@/components/WishlistButton';

interface ProductCardProps {
  id: number;
  name: string;
  price: number;
  salePrice: number | null;
  status: 'active' | 'soldout' | 'inactive' | 'draft' | 'hidden';
  images: ProductImage[];
  isFeatured?: boolean;
}

export default function ProductCard({
  id,
  name,
  price,
  salePrice,
  status,
  images,
}: ProductCardProps) {
  const thumbnail = images[0]?.url;
  const isSoldout = status === 'soldout';

  return (
    <Link
      href={`/products/${id}`}
      className={cn(
        'group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md',
        isSoldout && 'opacity-75',
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <span className="text-sm">No Image</span>
          </div>
        )}
        {isSoldout && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-md bg-black/70 px-3 py-1 text-sm font-semibold text-white">
              품절
            </span>
          </div>
        )}
        <div className="absolute right-1 top-1">
          <WishlistButton productId={id} className="bg-white/80 hover:bg-white" />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-card-foreground">{name}</h3>
        <div className="mt-auto">
          <PriceDisplay price={price} salePrice={salePrice} />
        </div>
      </div>
    </Link>
  );
}
