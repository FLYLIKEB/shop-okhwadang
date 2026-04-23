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
      <span className="flex items-center gap-1 px-3 py-1 text-slate-200 hover:text-white text-xs cursor-default transition-colors duration-200">
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
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 min-w-36 rounded-lg border border-slate-600 bg-slate-800 shadow-xl py-1 z-10 animate-accordion-down">
          {activeChildren.map((child: NavigationItem) => (
            <span key={child.id} className="flex items-center gap-2 px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all duration-200 cursor-default border-l-2 border-transparent hover:border-slate-400/50">
              <span className="text-slate-500">└</span>
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
      <div className="rounded-lg border bg-slate-900 px-4 py-3">
        <div className="flex items-center gap-1 text-sm text-white">
          <span className="mr-4 font-bold text-white">로고</span>
          {activeItems.length === 0 ? (
            <span className="text-xs text-slate-400">(메뉴 없음)</span>
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
      <div className="rounded-lg border bg-white shadow-md w-48 py-2 text-sm">
        {activeItems.length === 0 ? (
          <p className="px-4 py-2 text-xs text-muted-foreground">(메뉴 없음)</p>
        ) : (
          activeItems.map((item) => (
            <div key={item.id}>
              <div className="flex items-center justify-between px-4 py-1.5 hover:bg-muted text-foreground text-xs">
                <span>{item.label}</span>
                {item.children.filter(c => c.is_active).length > 0 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
              {item.children.filter(c => c.is_active).map(child => (
                <div key={child.id} className="px-8 py-1 text-xs text-muted-foreground hover:bg-muted">
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
    <div className="rounded-lg border bg-slate-800 px-6 py-4">
      <div className="flex flex-wrap gap-4 text-xs text-slate-300">
        {activeItems.length === 0 ? (
          <span className="text-slate-500">(메뉴 없음)</span>
        ) : (
          activeItems.map((item) => (
            <span key={item.id} className="hover:text-white flex items-center gap-0.5">
              {item.label}
              <ExternalLink className="h-2.5 w-2.5" />
            </span>
          ))
        )}
      </div>
    </div>
  );
}
