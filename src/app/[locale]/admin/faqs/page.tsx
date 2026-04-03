'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useFormModal } from '@/hooks/useFormModal';
import { adminFaqsApi } from '@/lib/api';
import type { Faq, CreateFaqData } from '@/lib/api';
import { handleApiError } from '@/utils/error';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/button';
import FormInput from '@/components/ui/FormInput';
import Modal from '@/components/ui/Modal';
import { AdminTable } from '@/components/admin/AdminTable';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { cn } from '@/components/ui/utils';

const FAQ_CATEGORIES = ['배송', '결제', '교환/반품', '회원', '기타'];

const FAQ_DEFAULTS: CreateFaqData = {
  category: FAQ_CATEGORIES[0],
  question: '',
  answer: '',
  sortOrder: 0,
  isPublished: true,
};

export default function AdminFaqsPage() {
  useAdminGuard();

  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [filterCategory, setFilterCategory] = useState('전체');
  const { formData, setFormData, isOpen, editingId, openCreate, openEdit, close } =
    useFormModal<CreateFaqData>(FAQ_DEFAULTS);

  const { execute: loadFaqs, isLoading } = useAsyncAction(
    async () => {
      const data = await adminFaqsApi.getAll();
      setFaqs(Array.isArray(data) ? data : []);
    },
    { errorMessage: 'FAQ 목록을 불러오지 못했습니다.' },
  );

  useEffect(() => {
    void loadFaqs();
  }, [loadFaqs]);

  const filtered = filterCategory === '전체'
    ? faqs
    : faqs.filter((f) => f.category === filterCategory);

  const handleSave = async () => {
    if (!formData.question.trim() || !formData.answer.trim()) {
      toast.error('질문과 답변을 입력해주세요.');
      return;
    }
    try {
      if (editingId) {
        const updated = await adminFaqsApi.update(editingId, formData);
        setFaqs((prev) => prev.map((f) => (f.id === editingId ? updated : f)));
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
      setFaqs((prev) => prev.filter((f) => f.id !== id));
      toast.success('FAQ가 삭제되었습니다.');
    } catch (err) {
      toast.error(handleApiError(err, 'FAQ 삭제에 실패했습니다.'));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="typo-h1">FAQ 관리</h1>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBox key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="typo-h1">FAQ 관리</h1>
        <Button onClick={openCreate}>새 FAQ</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['전체', ...FAQ_CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={cn(
              'px-3 py-1.5 typo-body-sm rounded-md border transition-colors',
              filterCategory === cat
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:bg-muted',
            )}
          >
            {cat}
          </button>
        ))}
      </div>

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
              <StatusBadge active={faq.isPublished} />
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

      <Modal open={isOpen} onOpenChange={(open) => !open && close()}>
        <div className="space-y-4 p-6">
          <h2 className="typo-h2">{editingId ? 'FAQ 수정' : '새 FAQ'}</h2>
          <div>
            <label className="block typo-body-sm font-medium mb-1.5">카테고리</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full border border-border rounded-md px-3 py-2.5 typo-body-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {FAQ_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <FormInput
            label="질문"
            value={formData.question}
            onChange={(e) => setFormData({ ...formData, question: e.target.value })}
            placeholder="자주 묻는 질문을 입력하세요"
          />
          <div>
            <label className="block typo-body-sm font-medium mb-1.5">답변</label>
            <textarea
              value={formData.answer}
              onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
              rows={5}
              placeholder="답변을 입력하세요"
              className="w-full border border-border rounded-md px-3 py-2.5 typo-body-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <FormInput
            label="정렬 순서"
            type="number"
            value={String(formData.sortOrder ?? 0)}
            onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
          />
          <label className="flex items-center gap-2 typo-body-sm">
            <input
              type="checkbox"
              checked={formData.isPublished ?? true}
              onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
              className="rounded border-border"
            />
            발행
          </label>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={close} className="flex-1">취소</Button>
            <Button onClick={handleSave} className="flex-1">
              {editingId ? '수정' : '생성'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
