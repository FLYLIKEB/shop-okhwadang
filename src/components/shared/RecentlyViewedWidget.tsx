'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRecentlyViewed } from '@/components/shared/hooks/useRecentlyViewed';
import { useUrlModal } from '@/hooks/useUrlModal';
import { formatCurrency } from '@/utils/currency';

export default function RecentlyViewedWidget() {
  const { items } = useRecentlyViewed();
  const [isOpen, setIsOpen] = useUrlModal('recentlyViewed');
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
                  {formatCurrency(item.salePrice ?? item.price)}
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
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background shadow-md hover:bg-muted transition-colors"
          aria-label="최근 본 상품"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
        <button
          onClick={() => setIsHidden(true)}
          className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-muted transition-colors"
          aria-label="위젯 닫기"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
