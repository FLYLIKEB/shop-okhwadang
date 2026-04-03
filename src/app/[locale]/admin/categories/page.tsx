'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { adminCategoriesApi } from '@/lib/api';
import type { AdminCategory, CreateCategoryData } from '@/lib/api';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import CategoryFormModal from '@/components/admin/CategoryFormModal';
import { GripVertical } from 'lucide-react';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { SortableCategoryRow } from '@/components/admin/SortableCategoryRow';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface FlattenedCategory extends AdminCategory {
  depth: number;
}

function flattenCategories(
  categories: AdminCategory[],
  parentId: number | null = null,
  depth = 0,
  expandedIds: Set<number> = new Set(),
): FlattenedCategory[] {
  const result: FlattenedCategory[] = [];
  const roots = categories.filter((c) => c.parentId === parentId);

  for (const cat of roots) {
    result.push({ ...cat, depth });
    if (cat.children && cat.children.length > 0 && expandedIds.has(cat.id)) {
      result.push(...flattenCategories(cat.children, cat.id, depth + 1, expandedIds));
    }
  }

  return result;
}

function getSiblings(category: AdminCategory, list: AdminCategory[]): AdminCategory[] {
  if (category.parentId === null) {
    return list.filter((c) => c.parentId === null);
  }
  return list.filter((c) => c.parentId === category.parentId);
}


export default function AdminCategoriesPage() {
  const { isLoading: authLoading, isAdmin } = useAdminGuard();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminCategory | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [activeId, setActiveId] = useState<number | null>(null);

  const { execute: loadCategories, isLoading: loading } = useAsyncAction(
    async () => {
      const data = await adminCategoriesApi.getAll();
      setCategories(data);
    },
    { errorMessage: '카테고리 목록을 불러오지 못했습니다.' },
  );

  useEffect(() => {
    if (isAdmin) {
      void loadCategories();
    }
  }, [isAdmin, loadCategories]);

  const handleOpenCreate = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (category: AdminCategory) => {
    setEditTarget(category);
    setModalOpen(true);
  };

  const handleSubmit = async (data: CreateCategoryData) => {
    if (editTarget) {
      await adminCategoriesApi.update(editTarget.id, data);
      toast.success('카테고리가 수정되었습니다.');
    } else {
      await adminCategoriesApi.create(data);
      toast.success('카테고리가 추가되었습니다.');
    }
    await loadCategories();
  };

  const { execute: deleteCategory } = useAsyncAction(
    async (category: AdminCategory) => {
      await adminCategoriesApi.remove(category.id);
      await loadCategories();
    },
    { successMessage: '카테고리가 삭제되었습니다.', errorMessage: '삭제에 실패했습니다.' },
  );

  const handleDelete = (category: AdminCategory) => {
    if (!window.confirm(`"${category.name}" 카테고리를 삭제하시겠습니까?`)) return;
    void deleteCategory(category);
  };

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

  const { execute: moveUp } = useAsyncAction(
    async (category: AdminCategory) => {
      const siblings = getSiblings(category, categories);
      const index = siblings.findIndex((s) => s.id === category.id);
      if (index <= 0) return;

      const prev = siblings[index - 1];
      const newOrders = [
        { id: category.id, sortOrder: prev.sortOrder },
        { id: prev.id, sortOrder: category.sortOrder },
      ];
      await adminCategoriesApi.reorder(newOrders);
      await loadCategories();
    },
    { errorMessage: '순서 변경에 실패했습니다.' },
  );

  const { execute: moveDown } = useAsyncAction(
    async (category: AdminCategory) => {
      const siblings = getSiblings(category, categories);
      const index = siblings.findIndex((s) => s.id === category.id);
      if (index >= siblings.length - 1) return;

      const next = siblings[index + 1];
      const newOrders = [
        { id: category.id, sortOrder: next.sortOrder },
        { id: next.id, sortOrder: category.sortOrder },
      ];
      await adminCategoriesApi.reorder(newOrders);
      await loadCategories();
    },
    { errorMessage: '순서 변경에 실패했습니다.' },
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const rootCategories = categories.filter((c) => c.parentId === null);
  const flattenedRootCategories = flattenCategories(rootCategories, null, 0, expandedIds);
  const rootCategoryIds = flattenedRootCategories.map((c) => c.id);

  const findCategoryById = (id: number): AdminCategory | undefined => {
    const findInTree = (cats: AdminCategory[]): AdminCategory | undefined => {
      for (const cat of cats) {
        if (cat.id === id) return cat;
        if (cat.children) {
          const found = findInTree(cat.children);
          if (found) return found;
        }
      }
      return undefined;
    };
    return findInTree(categories);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const { execute: handleReorder } = useAsyncAction(
    async ({ activeId, overId }: { activeId: number; overId: number }) => {
      const activeCategory = findCategoryById(activeId);
      const overCategory = findCategoryById(overId);

      if (!activeCategory || !overCategory) return;
      if (activeCategory.parentId !== overCategory.parentId) {
        toast.error('같은 레벨에서만 순서를 변경할 수 있습니다.');
        return;
      }
      if (activeId === overId) return;

      const siblings = getSiblings(activeCategory, categories);
      const activeIndex = siblings.findIndex((s) => s.id === activeId);
      const overIndex = siblings.findIndex((s) => s.id === overId);

      if (activeIndex === -1 || overIndex === -1) return;

      const newOrders: { id: number; sortOrder: number }[] = [];
      const [removed] = siblings.splice(activeIndex, 1);
      siblings.splice(overIndex, 0, removed);

      siblings.forEach((sibling, idx) => {
        newOrders.push({ id: sibling.id, sortOrder: idx });
      });

      await adminCategoriesApi.reorder(newOrders);
      await loadCategories();
    },
    { errorMessage: '순서 변경에 실패했습니다.' },
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      void handleReorder({ activeId: active.id as number, overId: over.id as number });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  const activeCategory = activeId ? findCategoryById(activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">카테고리 관리</h1>
          <button
            onClick={handleOpenCreate}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            + 카테고리 추가
          </button>
        </div>

        {categories.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">카테고리가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-4 py-3 text-left w-12"></th>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">카테고리명</th>
                  <th className="px-4 py-3 text-left">슬러그</th>
                  <th className="px-4 py-3 text-left">상태</th>
                  <th className="px-4 py-3 text-center">순서</th>
                  <th className="px-4 py-3 text-right">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <SortableContext
                  items={rootCategoryIds}
                  strategy={verticalListSortingStrategy}
                >
                  {flattenedRootCategories.map((cat) => (
                    <SortableCategoryRow
                      key={cat.id}
                      category={cat}
                      categories={categories}
                      expandedIds={expandedIds}
                      onToggleExpand={toggleExpand}
                      onEdit={handleOpenEdit}
                      onDelete={handleDelete}
                      onMoveUp={moveUp}
                      onMoveDown={moveDown}
                      getSiblings={getSiblings}
                      isDraggable={cat.depth === 0}
                    />
                  ))}
                </SortableContext>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CategoryFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={editTarget}
        onSubmit={handleSubmit}
        categories={categories}
      />

      <DragOverlay>
        {activeCategory ? (
          <table className="w-full text-sm">
            <tbody>
              <tr className="shadow-lg ring-2 ring-primary">
                <td className="px-4 py-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{activeCategory.id}</td>
                <td className="px-4 py-3 font-medium">{activeCategory.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{activeCategory.slug}</td>
                <td className="px-4 py-3">
                  <StatusBadge isActive={activeCategory.isActive} />
                </td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-right"></td>
              </tr>
            </tbody>
          </table>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
