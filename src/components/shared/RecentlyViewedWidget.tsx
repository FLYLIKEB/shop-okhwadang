'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRecentlyViewed } from '@/components/shared/hooks/useRecentlyViewed';
import { useUrlModal } from '@/hooks/useUrlModal';
import { formatCurrency } from '@/utils/currency';
import { cn } from '@/components/ui/utils';
import { getClientLocale } from '@/utils/clientLocale';
import { localMessage } from '@/utils/localMessages';
import { Button } from '@/components/ui/button';

export default function RecentlyViewedWidget() {
  const locale = getClientLocale();
  const { items } = useRecentlyViewed();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useUrlModal('recentlyViewed');
  const [isHidden, setIsHidden] = useState(false);

  if (isHidden || items.length === 0) return null;

  const preview = items.slice(0, 3);
  const hasMobileBottomCta = /\/(cart|checkout)(\/|$)/.test(pathname ?? '');

  return (
    <div
      className={cn(
        'toss-recent-widget fixed right-4 z-50 flex flex-col items-end gap-2 md:bottom-20',
        hasMobileBottomCta ? 'bottom-40' : 'bottom-20',
      )}
    >
      {isOpen && (
        <div className="toss-recent-widget__panel flex flex-col gap-1 rounded-lg border bg-background p-2 shadow-lg">
          {preview.map((item) => (
            <Link
              key={item.id}
              href={`/products/${item.slug}`}
              className="toss-recent-widget__item flex items-center gap-2 rounded-md p-1 transition-colors hover:bg-muted"
              title={item.name}
            >
              <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-muted">
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
                  {formatCurrency(item.salePrice ?? item.price, locale)}
                </p>
              </div>
            </Link>
          ))}
          {items.length > 3 && (
            <Link
              href="/my/recently-viewed"
              className="toss-recent-widget__more py-1 text-center text-xs text-muted-foreground hover:underline"
            >
              {localMessage('recentlyViewedWidget.more', { count: items.length })}
            </Link>
          )}
        </div>
      )}

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="gray"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="h-12 min-h-12 w-12 rounded-full shadow-md"
          aria-label={localMessage('recentlyViewedWidget.open')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </Button>
        <Button
          type="button"
          variant="gray"
          size="icon"
          onClick={() => setIsHidden(true)}
          className="h-6 min-h-6 w-6 rounded-full p-0 shadow-sm"
          aria-label={localMessage('recentlyViewedWidget.close')}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </Button>
      </div>
    </div>
  );
}
