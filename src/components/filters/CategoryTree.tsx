'use client';

import { useState } from 'react';
import { cn } from '@/components/ui/utils';
import type { Category } from '@/lib/api';

interface CategoryTreeProps {
  categories: Category[];
  selectedId?: number;
  onSelect: (id: number | undefined) => void;
}

export default function CategoryTree({ categories, selectedId, onSelect }: CategoryTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (categories.length === 0) return null;

  return (
    <ul className="flex flex-col gap-1">
      <li>
        <button
          type="button"
          onClick={() => onSelect(undefined)}
          className={cn(
            'w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors',
            selectedId === undefined
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          전체
        </button>
      </li>
      {categories.map((category) => {
        const hasChildren = category.children && category.children.length > 0;
        const isSelected = selectedId === Number(category.id);
        const isChildSelected = hasChildren && category.children!.some((c) => Number(c.id) === selectedId);
        const isExpanded = expandedIds.has(Number(category.id));

        return (
          <li key={category.id}>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  if (hasChildren) {
                    toggleExpand(category.id);
                  }
                  onSelect(category.id);
                }}
                className={cn(
                  'flex-1 rounded-md px-3 py-1.5 text-left text-sm transition-colors',
                  isSelected || isChildSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <span className="flex items-center justify-between">
                  <span>{category.name}</span>
                  {hasChildren && (
                    <span className="text-xs ml-1">{isExpanded ? '▲' : '▼'}</span>
                  )}
                </span>
              </button>
            </div>
            {hasChildren && isExpanded && (
              <ul className="ml-3 mt-1 flex flex-col gap-1">
                {category.children!.map((child) => (
                  <li key={child.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(child.id)}
                      className={cn(
                        'w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors',
                        selectedId === Number(child.id)
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      {child.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}