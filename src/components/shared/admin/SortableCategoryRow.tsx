'use client';

import { ChevronRight, ChevronDown, GripVertical } from 'lucide-react';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import type { AdminCategory } from '@/lib/api';
import { cn } from '@/components/ui/utils';
import { StatusBadge } from '@/components/shared/admin/StatusBadge';

export interface SortableCategoryRowProps {
  category: AdminCategory;
  categories: AdminCategory[];
  expandedIds: Set<number>;
  onToggleExpand: (id: number) => void;
  onEdit: (category: AdminCategory) => void;
  onDelete: (category: AdminCategory) => void;
  onMoveUp: (category: AdminCategory) => void;
  onMoveDown: (category: AdminCategory) => void;
  getSiblings: (category: AdminCategory, list: AdminCategory[]) => AdminCategory[];
  isDraggable: boolean;
}

export function SortableCategoryRow({
  category,
  categories,
  expandedIds,
  onToggleExpand,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  getSiblings,
  isDraggable,
}: SortableCategoryRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasChildren = category.children && category.children.length > 0;
  const isExpanded = expandedIds.has(category.id);
  const siblings = getSiblings(category, categories);
  const index = siblings.findIndex((s) => s.id === category.id);
  const isFirst = index === 0;
  const isLast = index === siblings.length - 1;

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-secondary/30">
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {isDraggable && (
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab touch-none rounded p-1 hover:bg-muted active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          {hasChildren ? (
            <button
              onClick={() => onToggleExpand(category.id)}
              className="rounded p-1 hover:bg-muted"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <span className="w-6" />
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{category.id}</td>
      <td className={cn('px-4 py-3 font-medium')}>
        {category.name}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{category.slug}</td>
      <td className="px-4 py-3">
        <StatusBadge isActive={category.isActive} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => void onMoveUp(category)}
            disabled={isFirst}
            aria-label="위로 이동"
            className="rounded px-2 py-1 text-xs hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ↑
          </button>
          <span className="text-xs text-muted-foreground">{index + 1}</span>
          <button
            onClick={() => void onMoveDown(category)}
            disabled={isLast}
            aria-label="아래로 이동"
            className="rounded px-2 py-1 text-xs hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ↓
          </button>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <button
            onClick={() => onEdit(category)}
            className="rounded border px-2 py-1 text-xs hover:bg-secondary"
          >
            수정
          </button>
          <button
            onClick={() => onDelete(category)}
            className="rounded border border-destructive/30 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
          >
            삭제
          </button>
        </div>
      </td>
    </tr>
  );
}
