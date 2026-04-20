'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { Home, LayoutGrid, BookOpen, ShoppingCart, User } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { useCart } from '@/contexts/CartContext';

interface NavTab {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  matchExact?: boolean;
}

export default function MobileBottomNav() {
  const t = useTranslations('navigation');
  const pathname = usePathname();
  const { itemCount } = useCart();

  const navTabs: NavTab[] = [
    { href: '/', label: t('home'), icon: Home, matchExact: true },
    { href: '/collection', label: t('collection'), icon: LayoutGrid },
    { href: '/archive', label: t('archive'), icon: BookOpen },
    { href: '/cart', label: t('cart'), icon: ShoppingCart },
    { href: '/my', label: t('myPage'), icon: User },
  ];

  return (
    <nav
      aria-label={t('mobileBottomNav')}
      className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-background md:hidden"
    >
      {navTabs.map(({ href, label, icon: Icon, matchExact }) => {
        const isActive = matchExact ? pathname === href : pathname.startsWith(href);
        const isCart = href === '/cart';

        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors',
              isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span className="relative">
              <Icon className="h-5 w-5" />
              {isCart && itemCount > 0 && (
                <span
                  role="status"
                  className="typo-label absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-foreground font-bold leading-none text-background"
                >
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </span>
            <span className="typo-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
