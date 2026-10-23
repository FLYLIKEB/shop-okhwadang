'use client';

import { localMessage } from '@/utils/localMessages';
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
      ? localMessage('adminEnglish.confirmDeleteMenuWithChildren', { label: item.label, count: item.children.length })
      : localMessage('adminEnglish.confirmDeleteMenu', { label: item.label });
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
            {localMessage('adminEnglish.menuCount', { total: flatItems.length, active: items.filter(item => item.is_active).length })}
          </span>
          <Button
            type="button"
            variant={showPreview ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="h-3.5 w-3.5" />
            {showPreview ? localMessage('adminEnglish.closePreview') : localMessage('admin.reviews.import.previewButton')}
          </Button>
        </div>
        <Button
          onClick={handleCreate}
        >
          <Plus className="h-4 w-4" />
          {localMessage('adminEnglish.addMenu')}
        </Button>
      </div>

      {/* 미리보기 */}
      {showPreview && (
        <div className="surface-card bg-muted/30 p-4">
          <p className="mb-2 typo-label font-semibold uppercase tracking-wide text-muted-foreground">
            {localMessage('adminEnglish.storefrontPreviewOnlyActiveMenusAreShown')}
          </p>
          <NavigationPreview group={group} items={items} />
        </div>
      )}

      {/* 사용 안내 */}
      <div className="surface-card px-4 py-3 typo-body-sm text-muted-foreground space-y-0.5">
        <p><b className="text-foreground">{localMessage('adminEnglish.drag')}</b>{localMessage('adminEnglish.toReorderShowHideEditDelete')}</p>
        <p>{localMessage('adminEnglish.createSubmenusByChoosingA')} <b className="text-foreground">{localMessage('adminEnglish.parentMenu')}</b> {localMessage('adminEnglish.inTheEditForm')}</p>
      </div>

      {items.length === 0 ? (
        <AdminEmptyState
          title={localMessage('adminEnglish.noMenusYet')}
          description={localMessage('adminEnglish.useAddMenuInTheTopRight')}
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
