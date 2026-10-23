'use client';

import { localMessage } from '@/utils/localMessages';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import type { NavigationItem } from '@/lib/api';
import { Button } from '@/components/ui/button';


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
          'surface-card mb-2 flex items-center gap-3 px-3 py-3',
          isDragging && 'opacity-50',
          !item.is_active && 'opacity-50 bg-muted/30',
        )}
        style={{ marginLeft: depth * 24 }}
      >
        {depth > 0 && (
          <span className="text-xs text-muted-foreground">└</span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          {...listeners}
          title={localMessage('adminEnglish.dragToReorder')}
          className="h-9 w-9 cursor-grab text-muted-foreground hover:text-foreground"
          aria-label={localMessage('adminEnglish.dragToReorder')}
        >
          <GripVertical className="h-4 w-4" />
        </Button>

        <div className="flex flex-1 flex-col min-w-0">
          <span className={cn('typo-body-sm truncate font-semibold', !item.is_active && 'line-through text-muted-foreground')}>
            {item.label}
          </span>
          <span className="typo-label truncate text-muted-foreground">{item.url}</span>
        </div>

        {item.children.length > 0 && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-1 typo-label text-muted-foreground">
            {localMessage('adminEnglish.child')} {item.children.length}
          </span>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onToggleActive(item)}
          title={item.is_active ? localMessage('adminEnglish.clickToHideThisMenuDeactivate') : localMessage('adminEnglish.clickToShowThisMenuActivate')}
          className={cn('h-9 w-9 shrink-0', item.is_active ? 'text-green-600 hover:text-muted-foreground' : 'text-muted-foreground hover:text-green-600')}
          aria-label={item.is_active ? localMessage('admin.couponRules.deactivate') : localMessage('adminEnglish.active2')}
        >
          {item.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onEdit(item)}
          title={localMessage('adminEnglish.editTheMenuNameUrlAndParent')}
          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={localMessage('popups.edit')}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onDelete(item)}
          title={localMessage('adminEnglish.deleteMenuAlsoDeletesSubmenus')}
          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
          aria-label={localMessage('popups.delete')}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
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
