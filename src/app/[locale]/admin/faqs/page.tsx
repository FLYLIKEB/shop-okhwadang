'use client';

import { localMessage } from '@/utils/localMessages';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { useFormModal } from '@/components/shared/hooks/useFormModal';
import { useAdminListPage } from '@/components/shared/hooks/useAdminListPage';
import { adminFaqsApi } from '@/lib/api';
import type { Faq, CreateFaqData } from '@/lib/api';
import { handleApiError } from '@/utils/error';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/button';
import FormInput from '@/components/ui/FormInput';
import FormSelect from '@/components/ui/FormSelect';
import Modal from '@/components/ui/Modal';
import { AdminTable } from '@/components/shared/admin/AdminTable';
import { StatusBadge } from '@/components/shared/admin/StatusBadge';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import { AdminFilterChips } from '@/components/shared/admin/AdminFilterChips';
import { toastMessage } from '@/utils/toastMessages';

const FAQ_CATEGORIES = ['배송', '결제', '교환/반품', '회원', '기타'] as const;
const FAQ_CATEGORY_KEYS: Record<string, string> = {
  '배송': 'shipping', '결제': 'payment', '교환/반품': 'exchange', '회원': 'member', '기타': 'other',
};

function categoryLabel(category: string): string {
  const key = FAQ_CATEGORY_KEYS[category];
  return key ? localMessage(`faqPage.categories.${key}`) : category;
}

const FAQ_FILTERS = [
  { label: localMessage('common.all'), value: '전체' },
  ...FAQ_CATEGORIES.map((category) => ({ label: categoryLabel(category), value: category })),
] as const;

const FAQ_DEFAULTS: CreateFaqData = {
  category: FAQ_CATEGORIES[0],
  question: '',
  answer: '',
  sortOrder: 0,
  isPublished: true,
};

export default function AdminFaqsPage() {
  const { isAdmin } = useAdminGuard();

  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { filters, setFilter } = useAdminListPage({
    initialFilters: {
      category: '전체',
    },
  });

  const editingFaq = editingId != null ? faqs.find((faq) => faq.id === editingId) ?? null : null;

  const initialFormData = useMemo(() => editingFaq
      ? {
        category: editingFaq.category,
        question: editingFaq.question,
        answer: editingFaq.answer,
        sortOrder: editingFaq.sortOrder,
        isPublished: editingFaq.isPublished,
      }
      : null, [editingFaq]);

  const { formData, setFormData } = useFormModal<CreateFaqData>(
    FAQ_DEFAULTS,
    initialFormData,
    modalOpen,
  );

  const openCreate = () => {
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (id: number, data: CreateFaqData) => {
    setEditingId(id);
    setFormData(data);
    setModalOpen(true);
  };

  const close = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const { execute: loadFaqs, isLoading } = useAsyncAction(
    async () => {
      const data = await adminFaqsApi.getAll();
      setFaqs(Array.isArray(data) ? data : []);
    },
    { errorMessage: localMessage('adminEnglish.unableToLoadFaqs') },
  );

  useEffect(() => {
    if (isAdmin) void loadFaqs();
  }, [isAdmin, loadFaqs]);

  const filtered = filters.category === '전체'
    ? faqs
    : faqs.filter((faq) => faq.category === filters.category);

  const handleSave = async () => {
    if (!formData.question.trim() || !formData.answer.trim()) {
      toast.error(toastMessage('faqQuestionAnswerRequired'));
      return;
    }

    try {
      if (editingId) {
        const updated = await adminFaqsApi.update(editingId, formData);
        setFaqs((prev) => prev.map((faq) => (faq.id === editingId ? updated : faq)));
        toast.success(toastMessage('faqUpdated'));
      } else {
        const created = await adminFaqsApi.create(formData);
        setFaqs((prev) => [...prev, created]);
        toast.success(toastMessage('faqCreated'));
      }
      close();
    } catch (err) {
      toast.error(handleApiError(err, toastMessage('faqSaveError')));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(localMessage('adminEnglish.deleteThisFaq'))) return;

    try {
      await adminFaqsApi.remove(id);
      setFaqs((prev) => prev.filter((faq) => faq.id !== id));
      toast.success(toastMessage('faqDeleted'));
    } catch (err) {
      toast.error(handleApiError(err, toastMessage('faqDeleteError')));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <AdminPageHeader title={localMessage('admin.sidebar.faqs')} titleClassName="typo-h1" />
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonBox key={index} className="h-14 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={localMessage('admin.sidebar.faqs')}
        titleClassName="typo-h1"
        action={<Button onClick={openCreate}>{localMessage('adminEnglish.newFaq')}</Button>}
      />

      <AdminFilterChips
        items={FAQ_FILTERS}
        value={filters.category}
        onToggle={(value) => setFilter('category', value)}
        ariaLabel={localMessage('adminEnglish.filterFaqCategory')}
        tone="inverted"
        radius="md"
        size="sm"
      />

      <AdminTable
        columns={[
          { label: localMessage('adminEnglish.order'), width: 'w-16' },
          { label: localMessage('product.filter.category'), width: 'w-24' },
          { label: localMessage('adminEnglish.question') },
          { label: localMessage('popups.status'), width: 'w-20' },
          { label: localMessage('popups.actions'), width: 'w-28' },
        ]}
        isEmpty={filtered.length === 0}
        emptyMessage={localMessage('adminEnglish.noFaqsYet')}
      >
        {filtered.map((faq) => (
          <tr key={faq.id} className="border-b border-soft hover:bg-muted/50 transition-colors">
            <td className="px-4 py-3 typo-body-sm text-muted-foreground">{faq.sortOrder}</td>
            <td className="px-4 py-3 typo-body-sm text-muted-foreground">{categoryLabel(faq.category)}</td>
            <td className="px-4 py-3 typo-body-sm font-medium truncate max-w-xs">{faq.question}</td>
            <td className="px-4 py-3">
              <StatusBadge isActive={faq.isPublished} />
            </td>
            <td className="px-4 py-3">
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => openEdit(faq.id, {
                    category: faq.category,
                    question: faq.question,
                    answer: faq.answer,
                    sortOrder: faq.sortOrder,
                    isPublished: faq.isPublished,
                  })}
                  className="typo-body-sm px-2"
                >
                  {localMessage('popups.edit')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleDelete(faq.id)}
                  className="typo-body-sm px-2 text-destructive hover:text-destructive"
                >
                  {localMessage('popups.delete')}
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </AdminTable>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="space-y-4 p-6">
          <h2 className="typo-h2">{editingId ? localMessage('adminEnglish.editFaq') : localMessage('adminEnglish.newFaq')}</h2>
          <div>
            <FormSelect
              label={localMessage('product.filter.category')}
              value={formData.category}
              onChange={(event) => setFormData({ ...formData, category: event.target.value })}
              options={FAQ_CATEGORIES.map((category) => ({ value: category, label: categoryLabel(category) }))}
            />
          </div>
          <FormInput
            label={localMessage('adminEnglish.question')}
            value={formData.question}
            onChange={(event) => setFormData({ ...formData, question: event.target.value })}
            placeholder={localMessage('adminEnglish.enterAFrequentlyAskedQuestion')}
          />
          <div>
            <label className="block typo-body-sm font-medium mb-1.5">{localMessage('product.tabs.inquiryPanel.answerLabel')}</label>
            <textarea
              value={formData.answer}
              onChange={(event) => setFormData({ ...formData, answer: event.target.value })}
              rows={5}
              placeholder={localMessage('adminEnglish.enterAnAnswer')}
              className="field-soft w-full rounded-md px-3 py-2.5 typo-body-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <FormInput
            label={localMessage('adminEnglish.sortOrder')}
            type="number"
            value={String(formData.sortOrder ?? 0)}
            onChange={(event) => setFormData({ ...formData, sortOrder: Number(event.target.value) })}
          />
          <label className="flex items-center gap-2 typo-body-sm">
            <input
              type="checkbox"
              checked={formData.isPublished ?? true}
              onChange={(event) => setFormData({ ...formData, isPublished: event.target.checked })}
              className="rounded border-border"
            />
            {localMessage('adminEnglish.published2')}
          </label>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={close} className="flex-1">{localMessage('popups.cancel')}</Button>
            <Button onClick={handleSave} className="flex-1">
              {editingId != null ? localMessage('popups.edit') : localMessage('admin.reviews.import.summary.create')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
