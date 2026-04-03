'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  FileText,
  Settings,
  ChevronDown,
  X,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';

type NavLeaf = {
  label: string;
  href: string;
};

type NavGroup = {
  label: string;
  icon: React.ElementType;
  children: NavLeaf[];
  href?: never;
};

type NavLeafItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  children?: never;
};

type NavItem = NavLeafItem | NavGroup;

const NAV_ITEMS: NavItem[] = [
  { label: '대시보드', href: '/admin/dashboard', icon: LayoutDashboard },
  {
    label: '상품',
    icon: Package,
    children: [
      { label: '상품관리', href: '/admin/products' },
      { label: '카테고리관리', href: '/admin/categories' },
    ],
  },
  {
    label: '운영',
    icon: ShoppingBag,
    children: [
      { label: '주문관리', href: '/admin/orders' },
      { label: '회원관리', href: '/admin/members' },
    ],
  },
  {
    label: 'CMS',
    icon: FileText,
    children: [
      { label: '페이지관리', href: '/admin/pages' },
      { label: '네비게이션관리', href: '/admin/navigation' },
      { label: '컬렉션관리', href: '/admin/collections' },
      { label: '저널관리', href: '/admin/journal' },
      { label: '아카이브관리', href: '/admin/archives' },
    ],
  },
  {
    label: '사이트 설정',
    icon: Settings,
    children: [
      { label: '테마 편집', href: '/admin/settings/theme' },
    ],
  },
];

function isNavGroup(item: NavItem): item is NavGroup {
  return 'children' in item && Array.isArray(item.children);
}

function getInitialOpenGroups(pathname: string): Record<string, boolean> {
  return NAV_ITEMS.reduce<Record<string, boolean>>((acc, item) => {
    if (isNavGroup(item)) {
      acc[item.label] = item.children.some((c) => pathname.startsWith(c.href));
    }
    return acc;
  }, {});
}

type SidebarContentProps = {
  onClose?: () => void;
};

function SidebarContent({ onClose }: SidebarContentProps) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    () => getInitialOpenGroups(pathname),
  );

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-background">
      <div className="flex h-14 items-center justify-between border-b px-4">
        <span className="text-sm font-semibold">관리자 패널</span>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
            aria-label="사이드바 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {NAV_ITEMS.map((item) => {
            if (isNavGroup(item)) {
              const isOpen = openGroups[item.label] ?? false;
              const isGroupActive = item.children.some((c) => pathname.startsWith(c.href));
              return (
                <li key={item.label}>
                  <button
                    onClick={() => toggleGroup(item.label)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                      isGroupActive
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
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
                              {child.label}
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
                  {item.label}
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
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative z-50 h-full">
            <SidebarContent onClose={onClose} />
          </div>
        </div>
      )}
    </>
  );
}
