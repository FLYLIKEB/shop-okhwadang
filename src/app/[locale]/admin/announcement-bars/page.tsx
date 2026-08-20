'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { useFormModal } from '@/components/shared/hooks/useFormModal';
import { AdminTable } from '@/components/shared/admin/AdminTable';
import { StatusBadge } from '@/components/shared/admin/StatusBadge';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import Modal from '@/components/ui/Modal';
import FormInput from '@/components/ui/FormInput';
import { adminAnnouncementBarsApi, type AnnouncementBarItem, type CreateAnnouncementBarData } from '@/lib/api';
import { handleApiError } from '@/utils/error';
import { toastMessage } from '@/utils/toastMessages';

const FORM_DEFAULTS: CreateAnnouncementBarData = {
  message: '',
  message_en: '',
  href: '',
  sort_order: 0,
  is_active: true,
};

export default function AdminAnnouncementBarsPage() {
  const { isAdmin } = useAdminGuard();
  const [items, setItems] = useState<AnnouncementBarItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const editingItem = useMemo(
    () => (editingId == null ? null : items.find((item) => item.id === editingId) ?? null),
    [editingId, items],
  );

  const { formData, setFormData } = useFormModal<CreateAnnouncementBarData>(
    FORM_DEFAULTS,
    editingItem
      ? {
          message: editingItem.message,
          message_en: editingItem.message_en ?? '',
          href: editingItem.href ?? '',
          sort_order: editingItem.sort_order,
          is_active: editingItem.is_active,
        }
      : null,
    isModalOpen,
  );

  const { execute: loadItems, isLoading } = useAsyncAction(
    async () => {
      const data = await adminAnnouncementBarsApi.getAll();
      setItems(data);
    },
    { errorMessage: '안내 바 목록을 불러오지 못했습니다.' },
  );

  useEffect(() => {
    if (isAdmin) {
      void loadItems();
    }
  }, [isAdmin, loadItems]);

  const openCreate = () => {
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEdit = (id: number) => {
    setEditingId(id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleSave = async () => {
    if (!formData.message?.trim()) {
      toast.error(toastMessage('announcementMessageKoRequired'));
      return;
    }

    const payload: CreateAnnouncementBarData = {
      message: formData.message.trim(),
      message_en: formData.message_en?.trim() ? formData.message_en.trim() : null,
      href: formData.href?.trim() ? formData.href.trim() : null,
      sort_order: formData.sort_order ?? 0,
      is_active: formData.is_active ?? true,
    };

    try {
      if (editingId == null) {
        const created = await adminAnnouncementBarsApi.create(payload);
        setItems((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order));
        toast.success(toastMessage('announcementCreated'));
      } else {
        const updated = await adminAnnouncementBarsApi.update(editingId, payload);
        setItems((prev) => prev.map((item) => (item.id === editingId ? updated : item)).sort((a, b) => a.sort_order - b.sort_order));
        toast.success(toastMessage('announcementUpdated'));
      }

      closeModal();
    } catch (error) {
      toast.error(handleApiError(error, toastMessage('announcementSaveError')));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('이 안내 바를 삭제하시겠습니까?')) return;

    try {
      await adminAnnouncementBarsApi.remove(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success(toastMessage('announcementDeleted'));
    } catch (error) {
      toast.error(handleApiError(error, toastMessage('announcementDeleteError')));
    }
  };

  const saveOrder = async (nextItems: AnnouncementBarItem[]) => {
    const orders = nextItems.map((item, index) => ({ id: item.id, sort_order: index }));

    try {
      await adminAnnouncementBarsApi.reorder(orders);
      setItems(
        nextItems.map((item, index) => ({
          ...item,
          sort_order: index,
        })),
      );
    } catch (error) {
      toast.error(handleApiError(error, toastMessage('sortError')));
    }
  };

  const moveItem = async (id: number, direction: -1 | 1) => {
    const index = items.findIndex((item) => item.id === id);
    const targetIndex = index + direction;

    if (index < 0 || targetIndex < 0 || targetIndex >= items.length) {
      return;
    }

    const nextItems = [...items];
    const [selected] = nextItems.splice(index, 1);
    nextItems.splice(targetIndex, 0, selected);

    await saveOrder(nextItems);
  };

  const toggleActive = async (item: AnnouncementBarItem) => {
    try {
      const updated = await adminAnnouncementBarsApi.update(item.id, { is_active: !item.is_active });
      setItems((prev) => prev.map((prevItem) => (prevItem.id === item.id ? updated : prevItem)));
      toast.success(toastMessage('announcementStatusChanged', { status: toastMessage(updated.is_active ? 'active' : 'inactive') }));
    } catch (error) {
      toast.error(handleApiError(error, toastMessage('statusChangeError')));
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminPageHeader
        title="안내 바 관리"
        description="상단 안내 메시지를 다국어로 관리하고 노출 순서를 조정하세요."
        action={<Button onClick={openCreate}>새 안내 바</Button>}
      />

      <AdminTable
        columns={[
          { label: '순서', width: 'w-20' },
          { label: '국문 메시지' },
          { label: '영문 메시지' },
          { label: '링크', width: 'w-56' },
          { label: '상태', width: 'w-24' },
          { label: '작업', width: 'w-48' },
        ]}
        isEmpty={items.length === 0}
        emptyMessage="등록된 안내 바가 없습니다."
      >
        {items.map((item, index) => (
          <tr key={item.id} className="border-soft transition-colors hover:bg-muted/40">
            <td className="admin-row px-4 py-3 typo-body-sm text-muted-foreground">{item.sort_order}</td>
            <td className="admin-row px-4 py-3 typo-body-sm font-medium">{item.message}</td>
            <td className="admin-row px-4 py-3 typo-body-sm text-muted-foreground">{item.message_en ?? '-'}</td>
            <td className="admin-row max-w-56 truncate px-4 py-3 typo-body-sm text-muted-foreground">{item.href ?? '-'}</td>
            <td className="admin-row px-4 py-3">
              <button type="button" onClick={() => toggleActive(item)} className="text-left">
                <StatusBadge isActive={item.is_active} />
              </button>
            </td>
            <td className="admin-row px-4 py-3">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" aria-label="위로 이동" onClick={() => moveItem(item.id, -1)} disabled={index === 0} className="h-9 min-h-9 w-9 typo-body-sm">↑</Button>
                <Button variant="ghost" size="icon" aria-label="아래로 이동" onClick={() => moveItem(item.id, 1)} disabled={index === items.length - 1} className="h-9 min-h-9 w-9 typo-body-sm">↓</Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(item.id)}>수정</Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-destructive hover:text-destructive">삭제</Button>
              </div>
            </td>
          </tr>
        ))}
      </AdminTable>

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <div className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">{editingId == null ? '새 안내 바' : '안내 바 수정'}</h2>

          <FormInput
            label="국문 메시지"
            value={formData.message ?? ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
            placeholder="국문 메시지를 입력하세요"
          />

          <FormInput
            label="영문 메시지"
            value={formData.message_en ?? ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, message_en: e.target.value }))}
            placeholder="영문 메시지를 입력하세요 (선택)"
          />

          <FormInput
            label="링크 URL"
            value={formData.href ?? ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, href: e.target.value }))}
            placeholder="예: /products"
          />

          <FormInput
            label="정렬 순서"
            type="number"
            value={String(formData.sort_order ?? 0)}
            onChange={(e) => setFormData((prev) => ({ ...prev, sort_order: Number(e.target.value) }))}
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formData.is_active ?? true}
              onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
            />
            활성화
          </label>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={closeModal} className="flex-1">취소</Button>
            <Button onClick={handleSave} className="flex-1">{editingId == null ? '생성' : '저장'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
