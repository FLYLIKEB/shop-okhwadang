'use client';

import React, { useEffect, useState } from 'react';
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
import Modal from '@/components/ui/Modal';
import { AdminTable } from '@/components/shared/admin/AdminTable';
import { StatusBadge } from '@/components/shared/admin/StatusBadge';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import { AdminFilterChips } from '@/components/shared/admin/AdminFilterChips';

const FAQ_CATEGORIES = ['배송', '결제', '교환/반품', '회원', '기타'] as const;

const FAQ_FILTERS = [
  { label: '전체', value: '전체' },
  ...FAQ_CATEGORIES.map((category) => ({ label: category, value: category })),
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

  const { formData, setFormData } = useFormModal<CreateFaqData>(
    FAQ_DEFAULTS,
    editingFaq
      ? {
        category: editingFaq.category,
        question: editingFaq.question,
        answer: editingFaq.answer,
        sortOrder: editingFaq.sortOrder,
        isPublished: editingFaq.isPublished,
      }
      : null,
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
    { errorMessage: 'FAQ 목록을 불러오지 못했습니다.' },
  );

  useEffect(() => {
    if (isAdmin) void loadFaqs();
  }, [isAdmin, loadFaqs]);

  const filtered = filters.category === '전체'
    ? faqs
    : faqs.filter((faq) => faq.category === filters.category);

  const handleSave = async () => {
    if (!formData.question.trim() || !formData.answer.trim()) {
      toast.error('질문과 답변을 입력해주세요.');
      return;
    }

    try {
      if (editingId) {
        const updated = await adminFaqsApi.update(editingId, formData);
        setFaqs((prev) => prev.map((faq) => (faq.id === editingId ? updated : faq)));
        toast.success('FAQ가 수정되었습니다.');
      } else {
        const created = await adminFaqsApi.create(formData);
        setFaqs((prev) => [...prev, created]);
        toast.success('FAQ가 생성되었습니다.');
      }
      close();
    } catch (err) {
      toast.error(handleApiError(err, 'FAQ 저장에 실패했습니다.'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('이 FAQ를 삭제하시겠습니까?')) return;

    try {
      await adminFaqsApi.remove(id);
      setFaqs((prev) => prev.filter((faq) => faq.id !== id));
      toast.success('FAQ가 삭제되었습니다.');
    } catch (err) {
      toast.error(handleApiError(err, 'FAQ 삭제에 실패했습니다.'));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="typo-h1">FAQ 관리</h1>
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonBox key={index} className="h-14 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="FAQ 관리"
        titleClassName="typo-h1"
        action={<Button onClick={openCreate}>새 FAQ</Button>}
      />

      <AdminFilterChips
        items={FAQ_FILTERS}
        value={filters.category}
        onToggle={(value) => setFilter('category', value)}
        ariaLabel="FAQ 카테고리 필터"
        tone="inverted"
        radius="md"
        size="sm"
      />

      <AdminTable
        columns={[
          { label: '순서', width: 'w-16' },
          { label: '카테고리', width: 'w-24' },
          { label: '질문' },
          { label: '상태', width: 'w-20' },
          { label: '작업', width: 'w-28' },
        ]}
        isEmpty={filtered.length === 0}
        emptyMessage="FAQ가 없습니다."
      >
        {filtered.map((faq) => (
          <tr key={faq.id} className="border-b hover:bg-muted/50 transition-colors">
            <td className="px-4 py-3 typo-body-sm text-muted-foreground">{faq.sortOrder}</td>
            <td className="px-4 py-3 typo-body-sm text-muted-foreground">{faq.category}</td>
            <td className="px-4 py-3 typo-body-sm font-medium truncate max-w-xs">{faq.question}</td>
            <td className="px-4 py-3">
              <StatusBadge isActive={faq.isPublished} />
            </td>
            <td className="px-4 py-3">
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(faq.id, {
                    category: faq.category,
                    question: faq.question,
                    answer: faq.answer,
                    sortOrder: faq.sortOrder,
                    isPublished: faq.isPublished,
                  })}
                  className="typo-body-sm text-foreground hover:underline"
                >
                  수정
                </button>
                <button
                  onClick={() => handleDelete(faq.id)}
                  className="typo-body-sm text-destructive hover:underline"
                >
                  삭제
                </button>
              </div>
            </td>
          </tr>
        ))}
      </AdminTable>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="space-y-4 p-6">
          <h2 className="typo-h2">{editingId ? 'FAQ 수정' : '새 FAQ'}</h2>
          <div>
            <label className="block typo-body-sm font-medium mb-1.5">카테고리</label>
            <select
              value={formData.category}
              onChange={(event) => setFormData({ ...formData, category: event.target.value })}
              className="w-full border border-border rounded-md px-3 py-2.5 typo-body-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {FAQ_CATEGORIES.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <FormInput
            label="질문"
            value={formData.question}
            onChange={(event) => setFormData({ ...formData, question: event.target.value })}
            placeholder="자주 묻는 질문을 입력하세요"
          />
          <div>
            <label className="block typo-body-sm font-medium mb-1.5">답변</label>
            <textarea
              value={formData.answer}
              onChange={(event) => setFormData({ ...formData, answer: event.target.value })}
              rows={5}
              placeholder="답변을 입력하세요"
              className="w-full border border-border rounded-md px-3 py-2.5 typo-body-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <FormInput
            label="정렬 순서"
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
            발행
          </label>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={close} className="flex-1">취소</Button>
            <Button onClick={handleSave} className="flex-1">
              {editingId != null ? '수정' : '생성'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
