import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/components/ui/utils';
import type { ProductImage } from '@/lib/api';
import PriceDisplay from '@/components/common/PriceDisplay';

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
        'group block',
        isSoldout && 'opacity-60',
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <span className="text-sm">No Image</span>
          </div>
        )}
        {isSoldout && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <span className="text-sm font-medium text-foreground">품절</span>
          </div>
        )}
      </div>

      <div className="mt-3">
        <h3 className="text-sm font-medium text-foreground line-clamp-2">{name}</h3>
        <div className="mt-1">
          <PriceDisplay price={price} salePrice={salePrice} />
        </div>
      </div>
    </Link>
  );
}
