'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, BookOpen, ShoppingCart, User } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { useCart } from '@/contexts/CartContext';

interface NavTab {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  matchExact?: boolean;
}

const NAV_TABS: NavTab[] = [
  { href: '/', label: '홈', icon: Home, matchExact: true },
  { href: '/search', label: '검색', icon: Search },
  { href: '/archive', label: 'Archive', icon: BookOpen },
  { href: '/cart', label: '장바구니', icon: ShoppingCart },
  { href: '/my', label: '마이', icon: User },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();

  return (
    <nav
      aria-label="모바일 하단 네비게이션"
      className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t border-border bg-background"
    >
      {NAV_TABS.map(({ href, label, icon: Icon, matchExact }) => {
        const isActive = matchExact ? pathname === href : pathname.startsWith(href);
        const isCart = href === '/cart';

        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors',
              isActive
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span className="relative">
              <Icon className="h-5 w-5" />
              {isCart && itemCount > 0 && (
                <span
                  role="status"
                  className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background text-xs font-bold leading-none"
                >
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
