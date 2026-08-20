'use client';

import { useState } from 'react';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import type { NavigationItem } from '@/lib/api';
import type { NavGroup } from './navigationGroups';

// GNB 미리보기의 단일 최상위 항목 — hover 시 드롭다운 펼침.
function GNBDropdownPreviewItem({ item }: { item: NavigationItem }) {
  const [isHovered, setIsHovered] = useState(false);
  const activeChildren = item.children.filter((c: NavigationItem) => c.is_active);
  const hasActiveChildren = activeChildren.length > 0;

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="flex cursor-default items-center gap-1 px-3 py-1 typo-body-sm text-muted-foreground transition-colors duration-200 hover:text-foreground">
        {item.label}
        {hasActiveChildren && (
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={cn('transition-transform duration-300', isHovered && 'rotate-180')}
          >
            <path d="M2.5 4.5L5 7L7.5 4.5" />
          </svg>
        )}
      </span>
      {hasActiveChildren && isHovered && (
        <div className="absolute left-1/2 top-full z-10 mt-2 min-w-36 -translate-x-1/2 rounded-xl border border-soft bg-background py-1 shadow-xl animate-accordion-down">
          {activeChildren.map((child: NavigationItem) => (
            <span key={child.id} className="flex cursor-default items-center border-l-2 border-transparent px-4 py-2 typo-body-sm text-muted-foreground transition-all duration-200 hover:border-primary/50 hover:bg-muted hover:text-foreground">
              {child.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface NavigationPreviewProps {
  group: NavGroup;
  items: NavigationItem[];
}

// 그룹별(쇼핑몰 상단/사이드바/푸터) 실제 렌더 모습을 근사한 미리보기.
export default function NavigationPreview({ group, items }: NavigationPreviewProps) {
  const activeItems = items.filter((i) => i.is_active);

  if (group === 'gnb') {
    return (
      <div className="surface-card px-4 py-3">
        <div className="flex items-center gap-1 typo-body-sm text-foreground">
          <span className="mr-4 font-bold text-primary">옥화당</span>
          {activeItems.length === 0 ? (
            <span className="typo-label text-muted-foreground">(메뉴 없음)</span>
          ) : (
            activeItems.map((item) => (
              <GNBDropdownPreviewItem key={item.id} item={item} />
            ))
          )}
        </div>
      </div>
    );
  }

  if (group === 'sidebar') {
    return (
      <div className="surface-card w-48 py-2 typo-body-sm shadow-md">
        {activeItems.length === 0 ? (
          <p className="px-4 py-2 typo-label text-muted-foreground">(메뉴 없음)</p>
        ) : (
          activeItems.map((item) => (
            <div key={item.id}>
              <div className="flex items-center justify-between px-4 py-1.5 typo-body-sm text-foreground hover:bg-muted">
                <span>{item.label}</span>
                {item.children.filter(c => c.is_active).length > 0 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
              {item.children.filter(c => c.is_active).map(child => (
                <div key={child.id} className="px-8 py-1 typo-body-sm text-muted-foreground hover:bg-muted">
                  {child.label}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    );
  }

  // footer
  return (
    <div className="surface-card bg-muted/50 px-6 py-4">
      <div className="flex flex-wrap gap-4 typo-body-sm text-muted-foreground">
        {activeItems.length === 0 ? (
          <span className="text-muted-foreground">(메뉴 없음)</span>
        ) : (
          activeItems.map((item) => (
            <span key={item.id} className="flex items-center gap-0.5 transition-colors hover:text-foreground">
              {item.label}
              <ExternalLink className="h-2.5 w-2.5" />
            </span>
          ))
        )}
      </div>
    </div>
  );
}
