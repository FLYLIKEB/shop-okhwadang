'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import type { NavigationItem } from '@/lib/api';

interface SortableNavigationRowProps {
  item: NavigationItem;
  depth: number;
  onEdit: (item: NavigationItem) => void;
  onDelete: (item: NavigationItem) => void;
  onToggleActive: (item: NavigationItem) => void;
}

// 드래그 가능한 단일 행 + 자식 재귀 렌더. depth>0 은 non-sortable (루트 순서만 DnD 대상).
export default function SortableNavigationRow({
  item,
  depth,
  onEdit,
  onDelete,
  onToggleActive,
}: SortableNavigationRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        className={cn(
          'flex items-center gap-3 rounded-md border bg-background px-3 py-2 mb-1',
          isDragging && 'opacity-50',
          !item.is_active && 'opacity-50 bg-muted/30',
        )}
        style={{ marginLeft: depth * 24 }}
      >
        {depth > 0 && (
          <span className="text-xs text-muted-foreground">└</span>
        )}
        <button
          type="button"
          {...listeners}
          title="드래그하여 순서 변경"
          className="cursor-grab text-muted-foreground hover:text-foreground"
          aria-label="드래그하여 순서 변경"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex flex-1 flex-col min-w-0">
          <span className={cn('text-sm font-medium truncate', !item.is_active && 'line-through text-muted-foreground')}>
            {item.label}
          </span>
          <span className="text-xs text-muted-foreground truncate">{item.url}</span>
        </div>

        {item.children.length > 0 && (
          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            하위 {item.children.length}
          </span>
        )}

        <button
          type="button"
          onClick={() => onToggleActive(item)}
          title={item.is_active ? '클릭하면 이 메뉴가 숨겨집니다 (비활성화)' : '클릭하면 이 메뉴가 표시됩니다 (활성화)'}
          className={cn('shrink-0', item.is_active ? 'text-green-600 hover:text-muted-foreground' : 'text-muted-foreground hover:text-green-600')}
          aria-label={item.is_active ? '비활성화' : '활성화'}
        >
          {item.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => onEdit(item)}
          title="메뉴 이름·URL·상위 메뉴 수정"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="수정"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(item)}
          title="메뉴 삭제 (하위 메뉴도 함께 삭제됩니다)"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          aria-label="삭제"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {item.children.length > 0 && (
        <div>
          {item.children.map((child) => (
            <SortableNavigationRow
              key={child.id}
              item={child}
              depth={depth + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleActive={onToggleActive}
            />
          ))}
        </div>
      )}
    </div>
  );
}
