'use client';

import { localMessage } from '@/utils/localMessages';
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

  const initialFormData = useMemo(
    () => editingItem
      ? {
          message: editingItem.message,
          message_en: editingItem.message_en ?? '',
          href: editingItem.href ?? '',
          sort_order: editingItem.sort_order,
          is_active: editingItem.is_active,
        }
      : null,
    [editingItem],
  );

  const { formData, setFormData } = useFormModal<CreateAnnouncementBarData>(
    FORM_DEFAULTS,
    initialFormData,
    isModalOpen,
  );

  const { execute: loadItems, isLoading } = useAsyncAction(
    async () => {
      const data = await adminAnnouncementBarsApi.getAll();
      setItems(data);
    },
    { errorMessage: localMessage('adminEnglish.unableToLoadAnnouncementBars') },
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
    if (!window.confirm(localMessage('adminEnglish.deleteThisAnnouncementBar'))) return;

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
      <div className="mx-auto max-w-6xl px-4 py-8 surface-card">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminPageHeader
        title={localMessage('admin.common.sections.announcementBars')}
        description={localMessage('adminEnglish.manageTranslatedTopBarAnnouncementsAndTheir')}
        action={<Button onClick={openCreate}>{localMessage('adminEnglish.newAnnouncementBar')}</Button>}
      />

      <AdminTable
        columns={[
          { label: localMessage('adminEnglish.order'), width: 'w-20' },
          { label: localMessage('adminEnglish.koreanMessage') },
          { label: localMessage('adminEnglish.englishMessage') },
          { label: localMessage('adminEnglish.link'), width: 'w-56' },
          { label: localMessage('popups.status'), width: 'w-24' },
          { label: localMessage('popups.actions'), width: 'w-48' },
        ]}
        isEmpty={items.length === 0}
        emptyMessage={localMessage('adminEnglish.noAnnouncementBarsYet')}
      >
        {items.map((item, index) => (
          <tr key={item.id} className="transition-colors hover:bg-muted/40">
            <td className="admin-row px-4 py-3 typo-body-sm text-muted-foreground">{item.sort_order}</td>
            <td className="admin-row px-4 py-3 typo-body-sm font-medium">{item.message}</td>
            <td className="admin-row px-4 py-3 typo-body-sm text-muted-foreground">{item.message_en ?? '-'}</td>
            <td className="admin-row max-w-56 truncate px-4 py-3 typo-body-sm text-muted-foreground">{item.href ?? '-'}</td>
            <td className="admin-row px-4 py-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => toggleActive(item)}
                aria-pressed={item.is_active}
                className="h-auto px-0 text-left typo-body-sm"
              >
                <StatusBadge isActive={item.is_active} />
              </Button>
            </td>
            <td className="admin-row px-4 py-3">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" aria-label={localMessage('adminEnglish.moveUp')} onClick={() => moveItem(item.id, -1)} disabled={index === 0} className="h-9 min-h-9 w-9 typo-body-sm">↑</Button>
                <Button variant="ghost" size="icon" aria-label={localMessage('adminEnglish.moveDown')} onClick={() => moveItem(item.id, 1)} disabled={index === items.length - 1} className="h-9 min-h-9 w-9 typo-body-sm">↓</Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(item.id)} className="typo-body-sm">{localMessage('popups.edit')}</Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="typo-body-sm text-destructive hover:text-destructive">{localMessage('popups.delete')}</Button>
              </div>
            </td>
          </tr>
        ))}
      </AdminTable>

      <Modal isOpen={isModalOpen} onClose={closeModal} className="surface-card">
        <div className="space-y-4">
          <h2 className="typo-h3">{editingId == null ? localMessage('adminEnglish.newAnnouncementBar') : localMessage('adminEnglish.editAnnouncementBar')}</h2>

          <FormInput
            label={localMessage('adminEnglish.koreanMessage')}
            value={formData.message ?? ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
            placeholder={localMessage('adminEnglish.enterTheKoreanMessage')}
          />

          <FormInput
            label={localMessage('adminEnglish.englishMessage')}
            value={formData.message_en ?? ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, message_en: e.target.value }))}
            placeholder={localMessage('adminEnglish.enterTheEnglishMessageOptional')}
          />

          <FormInput
            label={localMessage('adminEnglish.linkUrl')}
            value={formData.href ?? ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, href: e.target.value }))}
            placeholder={localMessage('adminEnglish.eGProducts')}
          />

          <FormInput
            label={localMessage('adminEnglish.sortOrder')}
            type="number"
            value={String(formData.sort_order ?? 0)}
            onChange={(e) => setFormData((prev) => ({ ...prev, sort_order: Number(e.target.value) }))}
          />

          <label className="flex items-center gap-2 field-soft rounded-md px-3 py-2 typo-body-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-soft accent-foreground"
              checked={formData.is_active ?? true}
              onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
            />
            {localMessage('adminEnglish.active2')}
          </label>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={closeModal} className="flex-1">{localMessage('popups.cancel')}</Button>
            <Button onClick={handleSave} className="flex-1">{editingId == null ? localMessage('admin.reviews.import.summary.create') : localMessage('popups.save')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
