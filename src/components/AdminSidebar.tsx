'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  FileText,
  Settings,
  Languages,
  ChevronDown,
  Home,
  X,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';

type NavLeaf = {
  labelKey: string;
  href: string;
};

type NavGroup = {
  labelKey: string;
  icon: React.ElementType;
  children: NavLeaf[];
  href?: never;
};

type NavLeafItem = {
  labelKey: string;
  href: string;
  icon: React.ElementType;
  children?: never;
};

type NavItem = NavLeafItem | NavGroup;

const NAV_ITEMS: NavItem[] = [
  { labelKey: 'dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { labelKey: 'localization', href: '/admin/localization', icon: Languages },
  {
    labelKey: 'productsGroup',
    icon: Package,
    children: [
      { labelKey: 'products', href: '/admin/products' },
      { labelKey: 'categories', href: '/admin/categories' },
      { labelKey: 'attributes', href: '/admin/attributes' },
    ],
  },
  {
    labelKey: 'operationsGroup',
    icon: ShoppingBag,
    children: [
      { labelKey: 'orders', href: '/admin/orders' },
      { labelKey: 'members', href: '/admin/members' },
      { labelKey: 'reviews', href: '/admin/reviews' },
      { labelKey: 'inquiries', href: '/admin/inquiries' },
    ],
  },
  {
    labelKey: 'cmsGroup',
    icon: FileText,
    children: [
      { labelKey: 'pages', href: '/admin/pages' },
      { labelKey: 'navigation', href: '/admin/navigation' },
      { labelKey: 'announcementBars', href: '/admin/announcement-bars' },
      { labelKey: 'journal', href: '/admin/journal' },
    ],
  },
  {
    labelKey: 'settingsGroup',
    icon: Settings,
    children: [
      { labelKey: 'theme', href: '/admin/settings/theme' },
      { labelKey: 'business', href: '/admin/settings/business' },
    ],
  },
];

function isNavGroup(item: NavItem): item is NavGroup {
  return 'children' in item && Array.isArray(item.children);
}

function getInitialOpenGroups(pathname: string): Record<string, boolean> {
  return NAV_ITEMS.reduce<Record<string, boolean>>((acc, item) => {
    if (isNavGroup(item)) {
      acc[item.labelKey] = item.children.some((c) => pathname.startsWith(c.href));
    }
    return acc;
  }, {});
}

type SidebarContentProps = {
  onClose?: () => void;
};

function SidebarContent({ onClose }: SidebarContentProps) {
  const pathname = usePathname();
  const t = useTranslations('admin.sidebar');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    getInitialOpenGroups(pathname),
  );

  const toggleGroup = (labelKey: string) => {
    setOpenGroups((prev) => ({ ...prev, [labelKey]: !prev[labelKey] }));
  };

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-background">
      <div className="flex h-14 items-center justify-between border-b px-4">
        <span className="typo-body-sm font-semibold">{t('adminPanel')}</span>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
            aria-label={t('close')}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="border-b px-2 py-3">
        <Link
          href="/"
          onClick={onClose}
          className="flex items-center gap-3 rounded-md px-3 py-2 typo-body-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Home className="h-4 w-4 shrink-0" />
          {t('backToShop')}
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {NAV_ITEMS.map((item) => {
            if (isNavGroup(item)) {
              const isOpen = openGroups[item.labelKey] ?? false;
              const isGroupActive = item.children.some((c) => pathname.startsWith(c.href));
              return (
                <li key={item.labelKey}>
                  <button
                    onClick={() => toggleGroup(item.labelKey)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                      isGroupActive
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">{t(item.labelKey)}</span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 transition-transform duration-200',
                        isOpen && 'rotate-180',
                      )}
                    />
                  </button>
                  {isOpen && (
                    <ul className="mt-1 space-y-1 pl-9">
                      {item.children.map((child) => {
                        const isActive =
                          pathname === child.href || pathname.startsWith(child.href + '/');
                        return (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              onClick={onClose}
                              className={cn(
                                'block rounded-md px-3 py-1.5 text-sm transition-colors',
                                isActive
                                  ? 'bg-foreground text-background'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                              )}
                            >
                              {t(child.labelKey)}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            }

            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {t(item.labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

type AdminSidebarProps = {
  open: boolean;
  onClose: () => void;
};

export function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  return (
    <>
      {/* 데스크탑: 고정 사이드바 */}
      <div className="hidden lg:flex">
        <SidebarContent />
      </div>

      {/* 모바일: 오버레이 사이드바 */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
          <div className="relative z-50 h-full">
            <SidebarContent onClose={onClose} />
          </div>
        </div>
      )}
    </>
  );
}
