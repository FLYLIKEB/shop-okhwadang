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
import type { NavigationItem } from '@/lib/api';
import { GROUP_INFO, type NavGroup } from './navigation/navigationGroups';
import { flattenItems } from './navigation/flattenItems';
import NavigationPreview from './navigation/NavigationPreview';
import SortableNavigationRow from './navigation/SortableNavigationRow';
import NavigationFormModal, { type NavigationFormData } from './navigation/NavigationFormModal';
import { AdminEmptyState } from './AdminStates';
import { Button } from '@/components/ui/button';

type NavigationSubmitData = Omit<NavigationFormData, 'labelEn'> & { labelEn: string | null };

interface NavigationEditorProps {
  group: NavGroup;
  items: NavigationItem[];
  onReload: () => Promise<void>;
  onCreate: (data: NavigationSubmitData) => Promise<void>;
  onUpdate: (id: number, data: {
    label?: string;
    labelEn?: string | null;
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
        labelEn: data.labelEn.trim() || null,
        url: data.url,
        parent_id: data.parent_id,
        is_active: data.is_active,
      });
    } else {
      await onCreate({ ...data, labelEn: data.labelEn.trim() || null });
    }
    await onReload();
  };

  return (
    <div className="space-y-4">
      {/* 그룹 설명 */}
      <div className="surface-card bg-primary/5 p-4">
        <p className="typo-body-sm font-semibold text-primary">{info.label}</p>
        <p className="mt-1 typo-body-sm leading-relaxed text-muted-foreground">{info.desc}</p>
      </div>

      {/* 액션 바 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="typo-body-sm text-muted-foreground">
            총 {flatItems.length}개 메뉴 ({items.filter(i => i.is_active).length}개 활성)
          </span>
          <Button
            type="button"
            variant={showPreview ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="h-3.5 w-3.5" />
            {showPreview ? '미리보기 닫기' : '미리보기'}
          </Button>
        </div>
        <Button
          onClick={handleCreate}
        >
          <Plus className="h-4 w-4" />
          메뉴 추가
        </Button>
      </div>

      {/* 미리보기 */}
      {showPreview && (
        <div className="surface-card bg-muted/30 p-4">
          <p className="mb-2 typo-label font-semibold uppercase tracking-wide text-muted-foreground">
            쇼핑몰 미리보기 — 활성화된 메뉴만 표시됩니다
          </p>
          <NavigationPreview group={group} items={items} />
        </div>
      )}

      {/* 사용 안내 */}
      <div className="surface-card px-4 py-3 typo-body-sm text-muted-foreground space-y-0.5">
        <p><b className="text-foreground">드래그</b>로 순서 변경 · 표시/숨김 · 수정 · 삭제</p>
        <p>하위 메뉴는 수정 모달의 <b className="text-foreground">상위 메뉴</b> 선택으로 만들 수 있습니다.</p>
      </div>

      {items.length === 0 ? (
        <AdminEmptyState
          title="등록된 메뉴가 없습니다"
          description="우측 상단 ‘메뉴 추가’ 버튼으로 첫 메뉴를 만들어보세요."
          className="surface-card border-0"
        />
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
