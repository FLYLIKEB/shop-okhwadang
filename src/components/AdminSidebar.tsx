'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
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
import { adminInquiriesApi, adminOrdersApi } from '@/lib/api';

type NavLeaf = {
  labelKey: string;
  href: string;
  badgeKey?: keyof AdminWorkBadges;
  superAdminOnly?: boolean;
};

type AdminWorkBadges = {
  pendingInquiries: number;
  paidOrders: number;
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
      { labelKey: 'orders', href: '/admin/orders?status=paid', badgeKey: 'paidOrders' },
      { labelKey: 'members', href: '/admin/members' },
      { labelKey: 'reviews', href: '/admin/reviews' },
      { labelKey: 'inquiries', href: '/admin/inquiries?status=pending', badgeKey: 'pendingInquiries' },
      { labelKey: 'logs', href: '/admin/logs', superAdminOnly: true },
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
      acc[item.labelKey] = item.children.some((c) => pathname.startsWith(c.href.split('?')[0]));
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
  const { user } = useAuth();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    getInitialOpenGroups(pathname),
  );
  const [badges, setBadges] = useState<AdminWorkBadges>({ pendingInquiries: 0, paidOrders: 0 });

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      adminInquiriesApi.getAll({ status: 'pending', limit: 1 }),
      adminOrdersApi.getList({ status: 'paid', limit: 1 }),
    ]).then(([inquiries, orders]) => {
      if (cancelled) return;
      setBadges({
        pendingInquiries: inquiries.status === 'fulfilled' ? inquiries.value.counts.pending : 0,
        paidOrders: orders.status === 'fulfilled' ? orders.value.total : 0,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
              const isGroupActive = item.children.some((c) => pathname.startsWith(c.href.split('?')[0]));
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
                      {item.children.filter((child) => !child.superAdminOnly || user?.role === 'super_admin').map((child) => {
                        const childPath = child.href.split('?')[0];
                        const isActive =
                          pathname === childPath || pathname.startsWith(childPath + '/');
                        return (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              onClick={onClose}
                              className={cn(
                                'flex items-center justify-between rounded-md px-3 py-1.5 typo-body-sm transition-colors',
                                isActive
                                  ? 'bg-foreground text-background'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                              )}
                            >
                              <span>{t(child.labelKey)}</span>
                              {child.badgeKey && badges[child.badgeKey] > 0 && (
                                <span className="ml-2 rounded-full bg-destructive px-2 py-0.5 typo-label text-destructive-foreground">
                                  {badges[child.badgeKey]}
                                </span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            }

            const itemPath = item.href.split('?')[0];
            const isActive = pathname === itemPath || pathname.startsWith(itemPath + '/');
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
