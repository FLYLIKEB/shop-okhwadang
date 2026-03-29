'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';

export default function RecentlyViewedWidget() {
  const { items } = useRecentlyViewed();
  const [isOpen, setIsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  if (isHidden || items.length === 0) return null;

  const preview = items.slice(0, 3);

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2">
      {isOpen && (
        <div className="flex flex-col gap-1 rounded-lg border bg-background shadow-lg p-2">
          {preview.map((item) => (
            <Link
              key={item.id}
              href={`/products/${item.slug}`}
              className="flex items-center gap-2 rounded-md p-1 hover:bg-muted transition-colors"
              title={item.name}
            >
              <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded border bg-muted">
                {item.thumbnail ? (
                  <Image
                    src={item.thumbnail}
                    alt={item.name}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
                    No
                  </div>
                )}
              </div>
              <div className="max-w-32 text-xs">
                <p className="line-clamp-1 font-medium">{item.name}</p>
                <p className="text-muted-foreground">
                  {(item.salePrice ?? item.price).toLocaleString()}원
                </p>
              </div>
            </Link>
          ))}
          {items.length > 3 && (
            <Link
              href="/my/recently-viewed"
              className="text-center text-xs text-muted-foreground hover:underline py-1"
            >
              전체 {items.length}개 보기
            </Link>
          )}
        </div>
      )}

      <div className="flex items-center gap-1">
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="flex h-12 w-12 items-center justify-center rounded-full border bg-background shadow-md hover:bg-muted transition-colors text-lg"
          aria-label="최근 본 상품"
        >
          👁
        </button>
        <button
          onClick={() => setIsHidden(true)}
          className="flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-muted transition-colors text-xs"
          aria-label="위젯 닫기"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
