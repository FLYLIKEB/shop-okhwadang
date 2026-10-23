'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { adminPopupsApi, type CreatePopupData, type Popup } from '@/lib/api';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { useFormModal } from '@/components/shared/hooks/useFormModal';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import { AdminTable } from '@/components/shared/admin/AdminTable';
import ProductImageUploader from '@/components/shared/admin/ProductImageUploader';
import { Button } from '@/components/ui/button';
import FormInput from '@/components/ui/FormInput';
import Modal from '@/components/ui/Modal';

const DEFAULTS: CreatePopupData = {
  title: '', imageUrl: '', linkUrl: '', sortOrder: 0, isActive: false, startsAt: '', endsAt: '',
};

function localDateTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function AdminPopupsPage() {
  const t = useTranslations('popups');
  const { isAdmin } = useAdminGuard();
  const [items, setItems] = useState<Popup[]>([]);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Popup | null>(null);
  const initial = useMemo(() => editing ? {
    ...editing, linkUrl: editing.linkUrl ?? '', startsAt: localDateTime(editing.startsAt), endsAt: localDateTime(editing.endsAt),
  } : null, [editing]);
  const { formData, setFormData } = useFormModal(DEFAULTS, initial, open);
  const { execute: load, isLoading } = useAsyncAction(async () => {
    setFailed(false);
    setItems(await adminPopupsApi.getAll());
  }, { errorMessage: t('fetchError'), onError: () => setFailed(true) });
  useEffect(() => { if (isAdmin) void load(); }, [isAdmin, load]);

  const { execute: save, isLoading: saving } = useAsyncAction(async () => {
    const startsAt = formData.startsAt ? new Date(formData.startsAt).toISOString() : null;
    const endsAt = formData.endsAt ? new Date(formData.endsAt).toISOString() : null;
    if (startsAt && endsAt && startsAt >= endsAt) {
      toast.error(t('invalidDates'));
      return;
    }
    if (!formData.title.trim() || !formData.imageUrl.trim()) {
      toast.error(t('requiredFields'));
      return;
    }
    const payload: CreatePopupData = {
      title: formData.title.trim(), imageUrl: formData.imageUrl.trim(),
      linkUrl: formData.linkUrl?.trim() || null, sortOrder: formData.sortOrder,
      isActive: formData.isActive, startsAt, endsAt,
    };
    const result = editing ? await adminPopupsApi.update(editing.id, payload) : await adminPopupsApi.create(payload);
    setItems((previous) => [...previous.filter((item) => item.id !== result.id), result].sort((first, second) => first.sortOrder - second.sortOrder || first.id - second.id));
    toast.success(t('saved'));
    setOpen(false);
  }, { errorMessage: t('saveError') });
  const { execute: remove, isLoading: deleting } = useAsyncAction(async (id: number) => {
    await adminPopupsApi.remove(id);
    setItems((previous) => previous.filter((item) => item.id !== id));
  }, { successMessage: t('deleted'), errorMessage: t('deleteError') });

  if (!isAdmin) return null;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminPageHeader title={t('heading')} description={t('description')} action={<Button onClick={() => { setEditing(null); setOpen(true); }}>{t('create')}</Button>} />
      {isLoading ? <div className="h-24 animate-skeleton-shimmer rounded-lg bg-muted" role="status" aria-label={t('loading')} /> : failed ? (
        <div role="alert" className="space-y-3"><p>{t('fetchError')}</p><Button onClick={() => void load()}>{t('retry')}</Button></div>
      ) : (
        <div className="overflow-x-auto">
          <AdminTable columns={['order', 'title', 'status', 'actions'].map((key) => ({ label: t(key) }))} isEmpty={!items.length} emptyMessage={t('empty')}>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 typo-body-sm">{item.sortOrder}</td>
                <td className="px-4 py-3 typo-body-sm">{item.title}</td>
                <td className="px-4 py-3 typo-body-sm">{t(item.isActive ? 'active' : 'inactive')}</td>
                <td className="px-4 py-3"><div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(item); setOpen(true); }}>{t('edit')}</Button>
                  <Button variant="ghost" size="sm" disabled={deleting} onClick={() => { if (window.confirm(t('deleteConfirm'))) void remove(item.id); }}>{t('delete')}</Button>
                </div></td>
              </tr>
            ))}
          </AdminTable>
        </div>
      )}
      <Modal isOpen={open} onClose={() => { if (!saving) setOpen(false); }} ariaLabelledBy="popup-form-title" className="max-h-screen overflow-y-auto">
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <h2 id="popup-form-title" className="typo-h3">{t(editing ? 'edit' : 'create')}</h2>
          <fieldset disabled={saving} className="space-y-4">
            <FormInput label={t('title')} value={formData.title} required maxLength={200} onChange={(event) => setFormData((previous) => ({ ...previous, title: event.target.value }))} />
            <ProductImageUploader imageUrl={formData.imageUrl} altText={formData.title || t('image')} onChange={(imageUrl) => setFormData((previous) => ({ ...previous, imageUrl }))} />
            <FormInput label={t('image')} value={formData.imageUrl} required maxLength={2048} onChange={(event) => setFormData((previous) => ({ ...previous, imageUrl: event.target.value }))} />
            <FormInput label={t('link')} description={t('linkHelp')} value={formData.linkUrl ?? ''} maxLength={2048} onChange={(event) => setFormData((previous) => ({ ...previous, linkUrl: event.target.value }))} />
            <FormInput label={t('order')} type="number" min={0} step={1} required value={formData.sortOrder} onChange={(event) => setFormData((previous) => ({ ...previous, sortOrder: Number(event.target.value) }))} />
            <p className="typo-body-sm text-muted-foreground">{t('timeHelp')}</p>
            <FormInput label={t('startsAt')} type="datetime-local" value={formData.startsAt ?? ''} onChange={(event) => setFormData((previous) => ({ ...previous, startsAt: event.target.value }))} />
            <FormInput label={t('endsAt')} type="datetime-local" value={formData.endsAt ?? ''} onChange={(event) => setFormData((previous) => ({ ...previous, endsAt: event.target.value }))} />
            <label className="flex items-center gap-2 typo-body-sm"><input type="checkbox" checked={formData.isActive} onChange={(event) => setFormData((previous) => ({ ...previous, isActive: event.target.checked }))} />{t('active')}</label>
            <p className="typo-body-sm text-muted-foreground">{t('activeHelp')}</p>
            <div className="flex gap-3"><Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('cancel')}</Button><Button type="submit">{t('save')}</Button></div>
          </fieldset>
        </form>
      </Modal>
    </div>
  );
}
