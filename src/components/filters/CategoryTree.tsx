'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/components/ui/utils';
import type { Category } from '@/lib/api';

interface CategoryTreeProps {
  categories: Category[];
  selectedId?: number;
  onSelect: (id: number | undefined) => void;
}

function CategoryItem({
  category,
  selectedId,
  onSelect,
}: {
  category: Category;
  selectedId?: number;
  onSelect: (id: number | undefined) => void;
}) {
  const hasChildren = category.children && category.children.length > 0;
  const isSelected = selectedId === Number(category.id);
  const isChildSelected = hasChildren && category.children!.some((c) => Number(c.id) === selectedId);
  const [expanded, setExpanded] = useState(isSelected || isChildSelected);

  const handleClick = () => {
    if (hasChildren) {
      setExpanded((prev) => !prev);
    }
    onSelect(category.id);
  };

  return (
    <li>
      <button
        type="button"
        onClick={handleClick}
        aria-expanded={hasChildren ? expanded : undefined}
        className={cn(
          'w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors flex items-center gap-2',
          isSelected || isChildSelected
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )}
      >
        {category.imageUrl && (
          <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded">
            <Image
              src={category.imageUrl}
              alt={category.name}
              fill
              className="object-cover"
              sizes="24px"
            />
          </span>
        )}
        <span className="flex flex-1 items-center justify-between">
          <span>{category.name}</span>
          {hasChildren && (
            <span className="text-xs">{expanded ? '▲' : '▼'}</span>
          )}
        </span>
      </button>
      {hasChildren && expanded && (
        <ul className="ml-3 mt-1 flex flex-col gap-1">
          {category.children!.map((child) => (
            <li key={child.id} className="flex items-center gap-2">
              {child.imageUrl && (
                <span className="relative h-5 w-5 shrink-0 overflow-hidden rounded">
                  <Image
                    src={child.imageUrl}
                    alt={child.name}
                    fill
                    className="object-cover"
                    sizes="20px"
                  />
                </span>
              )}
              <button
                type="button"
                onClick={() => onSelect(child.id)}
                className={cn(
                  'flex-1 rounded-md px-3 py-1.5 text-left text-sm transition-colors',
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
}

export default function CategoryTree({ categories, selectedId, onSelect }: CategoryTreeProps) {
  if (categories.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-foreground">카테고리</h2>
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
        {categories.map((category) => (
          <CategoryItem
            key={category.id}
            category={category}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </div>
  );
}
