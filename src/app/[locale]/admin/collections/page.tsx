'use client';

import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useFormModal } from '@/hooks/useFormModal';
import { adminCollectionsApi, type Collection, type CreateCollectionData, CollectionType } from '@/lib/api';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/button';
import FormInput from '@/components/ui/FormInput';
import Modal from '@/components/ui/Modal';
import { AdminTable, AdminTableRowActions } from '@/components/admin/AdminTable';
import { StatusBadge } from '@/components/admin/StatusBadge';

const TYPE_LABELS: Record<CollectionType, string> = {
  [CollectionType.CLAY]: '니료',
  [CollectionType.SHAPE]: '형태',
};

const COLLECTION_DEFAULTS: CreateCollectionData = {
  type: CollectionType.CLAY,
  name: '',
  nameKo: '',
  color: '',
  description: '',
  imageUrl: '',
  productUrl: '',
  sortOrder: 0,
  isActive: true,
};

function toFormData(c: Collection): CreateCollectionData {
  return {
    type: c.type,
    name: c.name,
    nameKo: c.nameKo ?? '',
    color: c.color ?? '',
    description: c.description ?? '',
    imageUrl: c.imageUrl ?? '',
    productUrl: c.productUrl,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
  };
}

function CollectionRow({
  collection,
  onEdit,
  onDelete,
}: {
  collection: Collection;
  onEdit: (c: Collection) => void;
  onDelete: (c: Collection) => void;
}) {
  return (
    <tr className="border-b border-border hover:bg-muted/50 transition-colors">
      <td className="py-3 px-4">
        <span
          className="inline-block w-6 h-6 rounded"
          style={{ backgroundColor: collection.color ?? '#ccc' }}
        />
      </td>
      <td className="py-3 px-4">
        <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted">
          {TYPE_LABELS[collection.type]}
        </span>
      </td>
      <td className="py-3 px-4">
        <span className="font-medium">{collection.name}</span>
        {collection.nameKo && (
          <span className="text-muted-foreground ml-2">({collection.nameKo})</span>
        )}
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground max-w-xs truncate">
        {collection.description}
      </td>
      <td className="py-3 px-4 text-sm">
        <StatusBadge isActive={collection.isActive} />
      </td>
      <td className="py-3 px-4">
        <AdminTableRowActions onEdit={() => onEdit(collection)} onDelete={() => onDelete(collection)} />
      </td>
    </tr>
  );
}

function CollectionFormModal({
  open,
  onClose,
  onSubmit,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCollectionData) => Promise<void>;
  initial?: Collection | null;
}) {
  const initialFormData = useMemo(
    () => (initial ? toFormData(initial) : null),
    [initial],
  );
  const { formData: form, setFormData: setForm, loading, handleSubmit } = useFormModal<CreateCollectionData>(
    COLLECTION_DEFAULTS,
    initialFormData,
    open,
  );

  return (
    <Modal isOpen={open} onClose={onClose} maxWidth="md">
      <h2 className="text-lg font-semibold mb-4">{initial ? '컬렉션 수정' : '컬렉션 추가'}</h2>
      <form onSubmit={(e) => handleSubmit(e, onSubmit, onClose)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">타입</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as CollectionType })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value={CollectionType.CLAY}>니료</option>
              <option value={CollectionType.SHAPE}>형태</option>
            </select>
          </div>
          <FormInput
            label="정렬 순서"
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="이름 (中文)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="朱泥"
            required
          />
          <FormInput
            label="이름 (한글)"
            value={form.nameKo}
            onChange={(e) => setForm({ ...form, nameKo: e.target.value })}
            placeholder="주니"
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">색상</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={form.color ?? '#000000'}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="w-10 h-10 rounded border border-input cursor-pointer"
            />
            <FormInput
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              placeholder="#8B4513"
              className="flex-1"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">설명</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="니료에 대한 설명..."
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
          />
        </div>

        <FormInput
          label="이미지 URL"
          value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          placeholder="https://..."
        />

        <FormInput
          label="상품 URL"
          value={form.productUrl}
          onChange={(e) => setForm({ ...form, productUrl: e.target.value })}
          placeholder="/products?clayType=주니"
          required
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="isActive" className="text-sm">활성 상태</label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? '저장 중...' : initial ? '수정' : '추가'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const CLAY_COLUMNS = [
  { label: '색상', width: 'w-16' },
  { label: '타입', width: 'w-24' },
  { label: '이름' },
  { label: '설명' },
  { label: '상태', width: 'w-20' },
  { label: '작업', width: 'w-28' },
];

export default function AdminCollectionsPage() {
  const { isLoading: authLoading, isAdmin } = useAdminGuard();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Collection | null>(null);

  const { execute: loadCollections, isLoading: loading } = useAsyncAction(
    async () => {
      const data = await adminCollectionsApi.getAll();
      setCollections(data);
    },
    { errorMessage: '컬렉션 목록을 불러오지 못했습니다.' },
  );

  useEffect(() => {
    if (isAdmin) {
      void loadCollections();
    }
  }, [isAdmin, loadCollections]);

  const handleOpenCreate = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (collection: Collection) => {
    setEditTarget(collection);
    setModalOpen(true);
  };

  const handleSubmit = async (data: CreateCollectionData) => {
    if (editTarget) {
      await adminCollectionsApi.update(editTarget.id, data);
      toast.success('컬렉션이 수정되었습니다.');
    } else {
      await adminCollectionsApi.create(data);
      toast.success('컬렉션이 추가되었습니다.');
    }
    await loadCollections();
  };

  const { execute: deleteCollection } = useAsyncAction(
    async (collection: Collection) => {
      await adminCollectionsApi.remove(collection.id);
      await loadCollections();
    },
    { successMessage: '컬렉션이 삭제되었습니다.', errorMessage: '삭제에 실패했습니다.' },
  );

  const handleDelete = (collection: Collection) => {
    if (!window.confirm(`"${collection.name}" 컬렉션을 삭제하시겠습니까?`)) return;
    void deleteCollection(collection);
  };

  const clayCollections = collections.filter((c) => c.type === CollectionType.CLAY);
  const shapeCollections = collections.filter((c) => c.type === CollectionType.SHAPE);

  if (authLoading || loading) {
    return (
      <div className="space-y-4">
        <SkeletonBox height="h-8 w-48" />
        <SkeletonBox height="h-12 w-full" />
        <SkeletonBox height="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">컬렉션 관리</h1>
        <button
          onClick={handleOpenCreate}
          className="rounded-md bg-foreground px-4 py-2 text-sm text-background hover:opacity-90"
        >
          + 컬렉션 추가
        </button>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-semibold mb-3">니료 컬렉션</h2>
          <AdminTable
            columns={CLAY_COLUMNS}
            isEmpty={clayCollections.length === 0}
            emptyMessage="등록된 니료 컬렉션이 없습니다."
          >
            {clayCollections.map((c) => (
              <CollectionRow key={c.id} collection={c} onEdit={handleOpenEdit} onDelete={handleDelete} />
            ))}
          </AdminTable>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">형태 컬렉션</h2>
          <AdminTable
            columns={CLAY_COLUMNS}
            isEmpty={shapeCollections.length === 0}
            emptyMessage="등록된 형태 컬렉션이 없습니다."
          >
            {shapeCollections.map((c) => (
              <CollectionRow key={c.id} collection={c} onEdit={handleOpenEdit} onDelete={handleDelete} />
            ))}
          </AdminTable>
        </section>
      </div>

      <CollectionFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initial={editTarget}
      />
    </div>
  );
}
