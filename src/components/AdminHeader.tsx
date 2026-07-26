'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ExternalLink, Menu, Search, UserCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/components/ui/utils';

const ROLE_LABEL_KEYS: Record<string, string> = {
  admin: 'roles.admin',
  super_admin: 'roles.superAdmin',
};

const SECTION_LABEL_KEYS: Array<{ segment: string; key: string }> = [
  { segment: '/admin/dashboard', key: 'sections.dashboard' },
  { segment: '/admin/products', key: 'sections.products' },
  { segment: '/admin/categories', key: 'sections.categories' },
  { segment: '/admin/orders', key: 'sections.orders' },
  { segment: '/admin/members', key: 'sections.members' },
  { segment: '/admin/coupons/rules', key: 'sections.couponRules' },
  { segment: '/admin/coupons', key: 'sections.coupons' },
  { segment: '/admin/points', key: 'sections.points' },
  { segment: '/admin/reviews', key: 'sections.reviews' },
  { segment: '/admin/inquiries', key: 'sections.inquiries' },
  { segment: '/admin/pages', key: 'sections.pages' },
  { segment: '/admin/navigation', key: 'sections.navigation' },
  { segment: '/admin/localization', key: 'sections.localization' },
  { segment: '/admin/attributes', key: 'sections.attributes' },
  { segment: '/admin/settings', key: 'sections.settings' },
];

type AdminHeaderProps = {
  onMenuClick: () => void;
};

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const t = useTranslations('admin.common');

  const normalizedPath = pathname.replace(/^\/(ko|en)/, '');
  const section = SECTION_LABEL_KEYS.find((item) => normalizedPath.startsWith(item.segment));
  const sectionLabel = section ? t(section.key) : t('sections.dashboard');
  const roleLabel = user?.role ? t(ROLE_LABEL_KEYS[user.role] ?? 'roles.unknown') : '';

  return (
    <header className="flex min-h-14 items-center justify-between gap-3 border-b bg-background px-4 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="min-h-11 min-w-11 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
          aria-label={t('openMenu')}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="typo-label text-muted-foreground">{t('brand')}</p>
          <p className="truncate typo-body-sm font-medium text-foreground">{sectionLabel}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/"
          target="_blank"
          className="hidden min-h-11 items-center gap-1 rounded-md border px-3 typo-button text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"
        >
          <ExternalLink className="h-4 w-4" />
          {t('viewShop')}
        </Link>
        <Link
          href="/admin/products"
          className="hidden min-h-11 items-center gap-1 rounded-md border px-3 typo-button text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:flex"
          aria-label={t('quickSearch')}
        >
          <Search className="h-4 w-4" />
          {t('quickSearch')}
        </Link>
        <div className="flex min-h-11 items-center gap-2 rounded-md border px-2">
          <UserCircle className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          {user && (
            <div className="hidden text-right sm:block">
              <p className="typo-body-sm leading-tight">{user.name}</p>
              <p className="typo-label text-muted-foreground">{roleLabel}</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => void logout()}
            className={cn('rounded px-2 py-1 typo-label text-muted-foreground transition-colors hover:bg-muted hover:text-foreground')}
          >
            {t('logout')}
          </button>
        </div>
      </div>
    </header>
  );
}
