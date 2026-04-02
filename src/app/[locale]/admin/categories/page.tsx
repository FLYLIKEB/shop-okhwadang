'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { adminCategoriesApi } from '@/lib/api';
import type { AdminCategory, CreateCategoryData } from '@/lib/api';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import CategoryFormModal from '@/components/admin/CategoryFormModal';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/components/ui/utils';

export default function AdminCategoriesPage() {
  const { isLoading: authLoading, isAdmin } = useAdminGuard();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminCategory | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

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

  const getSiblings = (category: AdminCategory, list: AdminCategory[]): AdminCategory[] => {
    if (category.parentId === null) {
      return list.filter((c) => c.parentId === null);
    }
    return list.filter((c) => c.parentId === category.parentId);
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

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  const rootCategories = categories.filter((c) => c.parentId === null);

  return (
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
                <th className="px-4 py-3 text-left w-8"></th>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">카테고리명</th>
                <th className="px-4 py-3 text-left">슬러그</th>
                <th className="px-4 py-3 text-left">상태</th>
                <th className="px-4 py-3 text-center">순서</th>
                <th className="px-4 py-3 text-right">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rootCategories.map((cat) => (
                <CategoryRow
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
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CategoryFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        categories={categories}
        initial={editTarget}
      />
    </div>
  );
}

interface CategoryRowProps {
  category: AdminCategory;
  categories: AdminCategory[];
  expandedIds: Set<number>;
  onToggleExpand: (id: number) => void;
  onEdit: (category: AdminCategory) => void;
  onDelete: (category: AdminCategory) => void;
  onMoveUp: (category: AdminCategory) => void;
  onMoveDown: (category: AdminCategory) => void;
  getSiblings: (category: AdminCategory, list: AdminCategory[]) => AdminCategory[];
  depth?: number;
}

function CategoryRow({
  category,
  categories,
  expandedIds,
  onToggleExpand,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  getSiblings,
  depth = 0,
}: CategoryRowProps) {
  const hasChildren = category.children && category.children.length > 0;
  const isExpanded = expandedIds.has(category.id);
  const siblings = getSiblings(category, categories);
  const index = siblings.findIndex((s) => s.id === category.id);
  const isFirst = index === 0;
  const isLast = index === siblings.length - 1;

  return (
    <>
      <tr className="hover:bg-secondary/30">
        <td className="px-4 py-3">
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
        </td>
        <td className="px-4 py-3 text-muted-foreground">{category.id}</td>
        <td className={cn('px-4 py-3 font-medium', depth > 0 && 'pl-8')}>
          {category.name}
        </td>
        <td className="px-4 py-3 text-muted-foreground">{category.slug}</td>
        <td className="px-4 py-3">
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              category.isActive
                ? 'bg-green-100 text-green-700'
                : 'bg-secondary text-muted-foreground'
            }`}
          >
            {category.isActive ? '활성' : '비활성'}
          </span>
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
      {hasChildren && isExpanded && category.children!.map((child) => (
        <CategoryRow
          key={child.id}
          category={child}
          categories={categories}
          expandedIds={expandedIds}
          onToggleExpand={onToggleExpand}
          onEdit={onEdit}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          getSiblings={getSiblings}
          depth={depth + 1}
        />
      ))}
    </>
  );
}