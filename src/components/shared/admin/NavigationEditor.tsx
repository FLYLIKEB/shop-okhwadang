'use client';

import { useState } from 'react';
import { useAdminDndSensors } from '@/components/shared/hooks/useDndSensors';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Plus, Eye } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import type { NavigationItem } from '@/lib/api';
import { GROUP_INFO, type NavGroup } from './navigation/navigationGroups';
import { flattenItems } from './navigation/flattenItems';
import NavigationPreview from './navigation/NavigationPreview';
import SortableNavigationRow from './navigation/SortableNavigationRow';
import NavigationFormModal, { type NavigationFormData } from './navigation/NavigationFormModal';

interface NavigationEditorProps {
  group: NavGroup;
  items: NavigationItem[];
  onReload: () => Promise<void>;
  onCreate: (data: NavigationFormData) => Promise<void>;
  onUpdate: (id: number, data: {
    label?: string;
    url?: string;
    is_active?: boolean;
    parent_id?: number | null;
  }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onReorder: (orders: Array<{ id: number; sort_order: number }>) => Promise<void>;
}

export default function NavigationEditor({
  group,
  items,
  onReload,
  onCreate,
  onUpdate,
  onDelete,
  onReorder,
}: NavigationEditorProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<NavigationItem | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const sensors = useAdminDndSensors();

  const flatItems = flattenItems(items);
  const rootIds = items.map((i) => i.id);
  const info = GROUP_INFO[group];

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = rootIds.indexOf(Number(active.id));
    const newIndex = rootIds.indexOf(Number(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    const orders = reordered.map((item, index) => ({
      id: Number(item.id),
      sort_order: index,
    }));

    await onReorder(orders);
    await onReload();
  };

  const handleEdit = (item: NavigationItem) => {
    setEditTarget(item);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  const handleToggleActive = async (item: NavigationItem) => {
    await onUpdate(Number(item.id), { is_active: !item.is_active });
    await onReload();
  };

  const handleDeleteItem = async (item: NavigationItem) => {
    const hasChildren = item.children.length > 0;
    const msg = hasChildren
      ? `"${item.label}" 메뉴를 삭제하면 하위 메뉴 ${item.children.length}개도 함께 삭제됩니다.\n계속하시겠습니까?`
      : `"${item.label}" 메뉴를 삭제하시겠습니까?`;
    if (!window.confirm(msg)) return;
    await onDelete(Number(item.id));
    await onReload();
  };

  const handleSubmit = async (data: NavigationFormData) => {
    if (editTarget) {
      await onUpdate(Number(editTarget.id), {
        label: data.label,
        url: data.url,
        parent_id: data.parent_id,
        is_active: data.is_active,
      });
    } else {
      await onCreate(data);
    }
    await onReload();
  };

  return (
    <div>
      {/* 그룹 설명 */}
      <div className="mb-4 rounded-lg border bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
        <p className="font-medium mb-0.5">ℹ️ {info.label}</p>
        <p className="text-xs leading-relaxed">{info.desc}</p>
      </div>

      {/* 액션 바 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            총 {flatItems.length}개 메뉴 ({items.filter(i => i.is_active).length}개 활성)
          </span>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={cn(
              'flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs transition-colors',
              showPreview ? 'bg-foreground text-background' : 'hover:bg-muted',
            )}
          >
            <Eye className="h-3.5 w-3.5" />
            {showPreview ? '미리보기 닫기' : '미리보기'}
          </button>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-1 rounded-md bg-foreground px-4 py-2 text-sm text-background hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          메뉴 추가
        </button>
      </div>

      {/* 미리보기 */}
      {showPreview && (
        <div className="mb-4 rounded-lg border bg-muted/30 p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            쇼핑몰 미리보기 — 활성화된 메뉴만 표시됩니다
          </p>
          <NavigationPreview group={group} items={items} />
        </div>
      )}

      {/* 사용 안내 */}
      <div className="mb-3 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
        <p>⠿ <b>드래그</b>로 순서 변경 · 👁 아이콘으로 표시/숨김 · ✏️ 수정 · 🗑 삭제</p>
        <p>하위 메뉴는 수정 모달의 <b>상위 메뉴</b> 선택으로 만들 수 있습니다.</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <p className="text-sm font-medium text-foreground">등록된 메뉴가 없습니다</p>
          <p className="mt-1 text-xs text-muted-foreground">우측 상단 &quot;메뉴 추가&quot; 버튼으로 첫 메뉴를 만들어보세요.</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={rootIds} strategy={verticalListSortingStrategy}>
            {items.map((item) => (
              <SortableNavigationRow
                key={item.id}
                item={item}
                depth={0}
                onEdit={handleEdit}
                onDelete={handleDeleteItem}
                onToggleActive={handleToggleActive}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      <NavigationFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initial={editTarget}
        group={group}
        flatItems={flatItems}
      />
    </div>
  );
}
