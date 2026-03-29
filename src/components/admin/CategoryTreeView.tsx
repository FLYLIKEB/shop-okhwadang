'use client';

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
  onEdit: (category: AdminCategory) => void;
  onDelete: (category: AdminCategory) => void;
  onMoveUp: (category: AdminCategory) => void;
  onMoveDown: (category: AdminCategory) => void;
}

function TreeNode({
  category,
  siblings,
  depth,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: TreeNodeProps) {
  const index = siblings.findIndex((s) => s.id === category.id);
  const isFirst = index === 0;
  const isLast = index === siblings.length - 1;

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
          <span className="text-xs text-muted-foreground select-none">
            {'└'.repeat(depth > 0 ? 1 : 0)}
          </span>
          <div className="min-w-0">
            <span className="text-sm font-medium truncate">{category.name}</span>
            <span className="ml-2 text-xs text-muted-foreground">{category.slug}</span>
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

      {category.children && category.children.length > 0 && (
        <div>
          {category.children.map((child) => (
            <TreeNode
              key={child.id}
              category={child}
              siblings={category.children!}
              depth={depth + 1}
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
          onEdit={onEdit}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
        />
      ))}
    </div>
  );
}
