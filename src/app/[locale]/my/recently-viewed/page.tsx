'use client';

import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import EmptyState from '@/components/EmptyState';

export default function RecentlyViewedPage() {
  const { items, clear } = useRecentlyViewed();

  const handleClear = () => {
    clear();
    toast.success('최근 본 상품이 삭제되었습니다.');
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">최근 본 상품</h1>
        {items.length > 0 && (
          <button
            onClick={handleClear}
            className="text-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            전체 삭제
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState title="최근 본 상품이 없습니다." />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/products/${item.slug}`}
              className="group flex flex-col overflow-hidden rounded-lg border bg-card hover:shadow-md transition-shadow"
            >
              <div className="relative aspect-square overflow-hidden bg-muted">
                {item.thumbnail ? (
                  <Image
                    src={item.thumbnail}
                    alt={item.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">
                    No Image
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-medium">{item.name}</p>
                <p className="mt-1 text-sm font-semibold">
                  {(item.salePrice ?? item.price).toLocaleString()}원
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
