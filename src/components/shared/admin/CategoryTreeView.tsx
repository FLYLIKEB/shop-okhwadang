'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import type { AdminCategory } from '@/lib/api';

interface CategoryTreeViewProps {
  categories: AdminCategory[];
  onEdit: (category: AdminCategory) => void;
  onDelete: (category: AdminCategory) => void;
  onMoveUp: (category: AdminCategory) => void;
  onMoveDown: (category: AdminCategory) => void;
}

interface TreeNodeProps {
  category: AdminCategory;
  siblings: AdminCategory[];
  depth: number;
  expandedIds: Set<number>;
  onToggle: (id: number) => void;
  onEdit: (category: AdminCategory) => void;
  onDelete: (category: AdminCategory) => void;
  onMoveUp: (category: AdminCategory) => void;
  onMoveDown: (category: AdminCategory) => void;
}

function TreeNode({
  category,
  siblings,
  depth,
  expandedIds,
  onToggle,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: TreeNodeProps) {
  const index = siblings.findIndex((s) => s.id === category.id);
  const isFirst = index === 0;
  const isLast = index === siblings.length - 1;
  const hasChildren = category.children && category.children.length > 0;
  const isExpanded = expandedIds.has(category.id);

  return (
    <div>
      <div
        className={cn(
          'flex items-center justify-between rounded-md border p-3',
          'hover:bg-muted/50',
          !category.isActive && 'opacity-50',
        )}
        style={{ marginLeft: depth * 20 }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => hasChildren && onToggle(category.id)}
            className={cn(
              'shrink-0 rounded p-0.5 transition-colors',
              hasChildren ? 'cursor-pointer hover:bg-muted' : 'cursor-default',
            )}
            aria-label={hasChildren ? (isExpanded ? '접기' : '펼치기') : undefined}
          >
            <ChevronRight
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform duration-200',
                isExpanded && 'rotate-90',
              )}
            />
          </button>
          <span className="text-xs text-muted-foreground select-none">
            {'└'.repeat(depth > 0 ? 1 : 0)}
          </span>
          <div className="min-w-0">
            <span className="text-sm font-medium truncate">{category.name}</span>
            <span className="ml-2 text-xs text-muted-foreground">#{category.id} · {category.slug}</span>
            {!category.isActive && (
              <span className="ml-2 text-xs text-destructive">(비활성)</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onMoveUp(category)}
            disabled={isFirst}
            aria-label="위로 이동"
            className={cn(
              'rounded px-2 py-1 text-xs',
              'hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed',
            )}
          >
            ↑
          </button>
          <button
            onClick={() => onMoveDown(category)}
            disabled={isLast}
            aria-label="아래로 이동"
            className={cn(
              'rounded px-2 py-1 text-xs',
              'hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed',
            )}
          >
            ↓
          </button>
          <button
            onClick={() => onEdit(category)}
            className="rounded px-2 py-1 text-xs hover:bg-muted"
          >
            수정
          </button>
          <button
            onClick={() => onDelete(category)}
            className="rounded px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
          >
            삭제
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {category.children!.map((child) => (
            <TreeNode
              key={child.id}
              category={child}
              siblings={category.children!}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategoryTreeView({
  categories,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: CategoryTreeViewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    for (const cat of categories) {
      if (cat.children && cat.children.length > 0) {
        initial.add(cat.id);
      }
    }
    return initial;
  });

  function handleToggle(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const roots = categories.filter((c) => c.parentId === null);

  if (roots.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        카테고리가 없습니다. 새 카테고리를 추가하세요.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {roots.map((cat) => (
        <TreeNode
          key={cat.id}
          category={cat}
          siblings={roots}
          depth={0}
          expandedIds={expandedIds}
          onToggle={handleToggle}
          onEdit={onEdit}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
        />
      ))}
    </div>
  );
}
