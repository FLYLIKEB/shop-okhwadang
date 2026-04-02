'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { handleApiError } from '@/utils/error';
import { adminCategoriesApi } from '@/lib/api';
import type { AdminCategory, CreateCategoryData } from '@/lib/api';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import CategoryTreeView from '@/components/admin/CategoryTreeView';
import CategoryFormModal from '@/components/admin/CategoryFormModal';

export default function AdminCategoriesPage() {
  const { isLoading: authLoading, isAdmin } = useAdminGuard();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [flatList, setFlatList] = useState<AdminCategory[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminCategory | null>(null);

  const { execute: loadCategories, isLoading: loading } = useAsyncAction(
    async () => {
      const data = await adminCategoriesApi.getAll();
      setFlatList(data);
      setCategories(buildTree(data));
    },
    { errorMessage: '카테고리 목록을 불러오지 못했습니다.' },
  );

  useEffect(() => {
    if (isAdmin) {
      void loadCategories();
    }
  }, [isAdmin, loadCategories]);

  function buildTree(items: AdminCategory[]): AdminCategory[] {
    const map = new Map<number, AdminCategory>();
    const roots: AdminCategory[] = [];

    for (const item of items) {
      map.set(item.id, { ...item, children: [] });
    }
    for (const item of items) {
      const node = map.get(item.id)!;
      if (item.parentId === null) {
        roots.push(node);
      } else {
        const parent = map.get(item.parentId);
        if (parent) {
          parent.children = [...(parent.children ?? []), node];
        } else {
          roots.push(node);
        }
      }
    }
    return roots.sort((a, b) => a.sortOrder - b.sortOrder);
  }

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

  const getSiblings = (category: AdminCategory): AdminCategory[] => {
    if (category.parentId === null) {
      return categories;
    }
    const parent = flatList.find((c) => c.id === category.parentId);
    if (!parent) return [];
    const parentNode = findInTree(categories, parent.id);
    return parentNode?.children ?? [];
  };

  const findInTree = (nodes: AdminCategory[], id: number): AdminCategory | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = findInTree(node.children ?? [], id);
      if (found) return found;
    }
    return null;
  };

  const { execute: moveUp } = useAsyncAction(
    async (category: AdminCategory) => {
      const siblings = getSiblings(category);
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
      const siblings = getSiblings(category);
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

  const handleMoveUp = (category: AdminCategory) => void moveUp(category);
  const handleMoveDown = (category: AdminCategory) => void moveDown(category);

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">카테고리 관리</h1>
        <button
          onClick={handleOpenCreate}
          className="rounded-md bg-foreground px-4 py-2 text-sm text-background hover:opacity-90"
        >
          + 카테고리 추가
        </button>
      </div>

      <CategoryTreeView
        categories={categories}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        onMoveUp={handleMoveUp}
        onMoveDown={handleMoveDown}
      />

      <CategoryFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        categories={flatList}
        initial={editTarget}
      />
    </div>
  );
}
