'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { useFormModal } from '@/components/shared/hooks/useFormModal';
import { adminCollectionsApi, type Collection, type CreateCollectionData, CollectionType } from '@/lib/api';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/button';
import FormInput from '@/components/ui/FormInput';
import Modal from '@/components/ui/Modal';
import { AdminTable } from '@/components/shared/admin/AdminTable';
import { StatusBadge } from '@/components/shared/admin/StatusBadge';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import ProductImageUploader from '@/components/shared/admin/ProductImageUploader';
import { GripVertical } from 'lucide-react';
import { useAdminDndSensors } from '@/components/shared/hooks/useDndSensors';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

interface SortableCollectionRowProps {
  collection: Collection;
  onEdit: (c: Collection) => void;
  onDelete: (c: Collection) => void;
}

function SortableCollectionRow({ collection, onEdit, onDelete }: SortableCollectionRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: collection.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className="border-b border-border hover:bg-muted/50 transition-colors">
      <td className="py-3 px-4">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none rounded p-1 hover:bg-muted active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </td>
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
      <td className="py-3 px-4">
        {collection.imageUrl && (
          <Image
            src={collection.imageUrl}
            alt={collection.name}
            width={40}
            height={40}
            className="h-10 w-10 rounded object-cover"
          />
        )}
      </td>
      <td className="py-3 px-4 text-sm">
        <StatusBadge isActive={collection.isActive} />
      </td>
      <td className="py-3 px-4">
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(collection)}
            className="rounded border px-2 py-1 text-xs hover:bg-secondary"
          >
            수정
          </button>
          <button
            onClick={() => onDelete(collection)}
            className="rounded border border-destructive/30 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
          >
            삭제
          </button>
        </div>
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

        <div>
          <label className="text-sm font-medium block mb-1">이미지</label>
          <ProductImageUploader
            imageUrl={form.imageUrl ?? ''}
            onChange={(url) => setForm({ ...form, imageUrl: url })}
          />
        </div>

        <FormInput
          label="상품 URL"
          value={form.productUrl}
          onChange={(e) => setForm({ ...form, productUrl: e.target.value })}
          placeholder="/products?attrs=clay_type:zhuni"
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
  { label: '', width: 'w-12' },
  { label: '색상', width: 'w-16' },
  { label: '타입', width: 'w-24' },
  { label: '이름' },
  { label: '설명' },
  { label: '이미지', width: 'w-16' },
  { label: '상태', width: 'w-20' },
  { label: '작업', width: 'w-36' },
];

function CollectionSection({
  title,
  collections,
  onEdit,
  onDelete,
}: {
  title: string;
  collections: Collection[];
  onEdit: (c: Collection) => void;
  onDelete: (c: Collection) => void;
}) {
  const ids = collections.map((c) => c.id);

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      <AdminTable
        columns={CLAY_COLUMNS}
        isEmpty={collections.length === 0}
        emptyMessage={`등록된 ${title}이 없습니다.`}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {collections.map((c) => (
            <SortableCollectionRow key={c.id} collection={c} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </SortableContext>
      </AdminTable>
    </section>
  );
}

export default function AdminCollectionsPage() {
  const { isLoading: authLoading, isAdmin } = useAdminGuard();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Collection | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);

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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const { execute: handleReorder } = useAsyncAction(
    async ({ activeId, overId, type }: { activeId: number; overId: number; type: CollectionType }) => {
      if (activeId === overId) return;

      const sameTypeCollections = collections.filter((c) => c.type === type);
      const activeIndex = sameTypeCollections.findIndex((c) => c.id === activeId);
      const overIndex = sameTypeCollections.findIndex((c) => c.id === overId);

      if (activeIndex === -1 || overIndex === -1) return;

      const newOrders: { id: number; sortOrder: number }[] = [];
      const reordered = [...sameTypeCollections];
      const [removed] = reordered.splice(activeIndex, 1);
      reordered.splice(overIndex, 0, removed);

      reordered.forEach((c, idx) => {
        newOrders.push({ id: c.id, sortOrder: idx });
      });

      await adminCollectionsApi.reorder(newOrders);
      await loadCollections();
    },
    { errorMessage: '순서 변경에 실패했습니다.' },
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const activeCollection = collections.find((c) => c.id === active.id);
      if (activeCollection) {
        void handleReorder({
          activeId: active.id as number,
          overId: over.id as number,
          type: activeCollection.type,
        });
      }
    }
  };

  const clayCollections = collections
    .filter((c) => c.type === CollectionType.CLAY)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const shapeCollections = collections
    .filter((c) => c.type === CollectionType.SHAPE)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const activeCollection = activeId ? collections.find((c) => c.id === activeId) : null;

  const sensors = useAdminDndSensors();

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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        <AdminPageHeader
          title="컬렉션 관리"
          action={(
            <button
              onClick={handleOpenCreate}
              className="rounded-md bg-foreground px-4 py-2 text-sm text-background hover:opacity-90"
            >
              + 컬렉션 추가
            </button>
          )}
        />

        <div className="space-y-8">
          <CollectionSection
            title="니료 컬렉션"
            collections={clayCollections}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
          />
          <CollectionSection
            title="형태 컬렉션"
            collections={shapeCollections}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <DragOverlay>
        {activeCollection ? (
          <table className="w-full text-sm">
            <tbody>
              <tr className="shadow-lg ring-2 ring-primary bg-background rounded-lg">
                <td className="py-3 px-4">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </td>
                <td className="py-3 px-4">
                  <span className="inline-block w-6 h-6 rounded" style={{ backgroundColor: activeCollection.color ?? '#ccc' }} />
                </td>
                <td className="py-3 px-4">
                  <span className="font-medium">{activeCollection.name}</span>
                </td>
                <td className="py-3 px-4 text-muted-foreground">{activeCollection.description}</td>
                <td className="py-3 px-4"></td>
                <td className="py-3 px-4">
                  <StatusBadge isActive={activeCollection.isActive} />
                </td>
                <td className="py-3 px-4"></td>
              </tr>
            </tbody>
          </table>
        ) : null}
      </DragOverlay>

      <CollectionFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initial={editTarget}
      />
    </DndContext>
  );
}
