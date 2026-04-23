'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/components/ui/utils';
import type { NavigationItem } from '@/lib/api';

interface DesktopNavProps {
  items: NavigationItem[];
  fullWidth?: boolean;
}

export function DesktopNav({ items, fullWidth = false }: DesktopNavProps) {
  const tNav = useTranslations('navigation');
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const hoveredItem = items.find((item) => item.id === hoveredId);
  const activeChildren = hoveredItem?.children?.filter((c: NavigationItem) => c.is_active) ?? [];
  const hasChildren = activeChildren.length > 0;

  const hoveredLeft = hoveredId !== null
    ? (itemRefs.current.get(hoveredId)?.getBoundingClientRect().left ?? 0)
    : 0;

  return (
    <nav
      aria-label={tNav('mainMenu')}
      className={cn(
        'hidden md:flex items-center',
        fullWidth ? 'w-full gap-0' : 'gap-6',
      )}
      onMouseLeave={() => setHoveredId(null)}
    >
      {items.map((item) => (
        <div
          key={item.id}
          ref={(el) => { if (el) itemRefs.current.set(item.id, el); }}
          onMouseEnter={() => setHoveredId(item.id)}
          className={cn(fullWidth && 'flex-1 flex items-center justify-center')}
        >
          <Link
            href={item.url}
            className={cn(
              'group relative flex items-center gap-1 py-2 typo-body-sm transition-colors duration-200',
              fullWidth && 'w-full justify-center',
              hoveredId === item.id ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            <span className="relative">
              {item.label}
              <span
                className={cn(
                  'absolute -bottom-0.5 left-0 h-px bg-foreground transition-all duration-300 ease-out',
                  hoveredId === item.id ? 'w-full' : 'w-0',
                )}
              />
            </span>
          </Link>
        </div>
      ))}

      {hasChildren && (
        <div
          className="fixed left-0 right-0 z-50 bg-background border-b border-divider-soft shadow-md"
          style={{ top: 'var(--header-bottom)' }}
          onMouseEnter={() => setHoveredId(hoveredId)}
          onMouseLeave={() => setHoveredId(null)}
        >
          <div className="py-6" style={{ paddingLeft: `${hoveredLeft}px` }}>
            <div className="flex gap-12">
              {activeChildren.map((child: NavigationItem) => (
                <div key={child.id} className="flex flex-col gap-3">
                  <Link
                    href={child.url}
                    className="typo-body-sm font-semibold text-foreground hover:text-primary transition-colors tracking-wide"
                  >
                    {child.label}
                  </Link>
                  {child.children && child.children.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {child.children.filter((c: NavigationItem) => c.is_active).map((grandchild: NavigationItem) => (
                        <Link
                          key={grandchild.id}
                          href={grandchild.url}
                          className="typo-body-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {grandchild.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
