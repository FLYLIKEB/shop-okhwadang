'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { useFormModal } from '@/components/shared/hooks/useFormModal';
import { adminJournalsApi, type Journal, type CreateJournalData, JournalCategory } from '@/lib/api';
import { Button } from '@/components/ui/button';
import FormInput from '@/components/ui/FormInput';
import FormSelect from '@/components/ui/FormSelect';
import Modal from '@/components/ui/Modal';
import { AdminTable } from '@/components/shared/admin/AdminTable';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import { AdminLoadingState } from '@/components/shared/admin/AdminStates';

import { JournalStatusBadge } from '@/components/shared/admin/StatusBadge';
import ProductImageUploader from '@/components/shared/admin/ProductImageUploader';
import { toastMessage } from '@/utils/toastMessages';

const CATEGORY_LABELS: Record<JournalCategory, string> = {
  [JournalCategory.CULTURE]: '다문화',
  [JournalCategory.USAGE]: '사용법',
  [JournalCategory.TABLE_SETTING]: '찻자리 세팅',
  [JournalCategory.NEWS]: '소식',
};

const JOURNAL_DEFAULTS: CreateJournalData = {
  slug: '',
  title: '',
  subtitle: '',
  category: JournalCategory.CULTURE,
  date: new Date().toISOString().split('T')[0],
  readTime: '',
  summary: '',
  content: '',
  coverImageUrl: '',
  isPublished: false,
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function toFormData(j: Journal): CreateJournalData {
  return {
    slug: j.slug,
    title: j.title,
    subtitle: j.subtitle ?? '',
    category: j.category,
    date: j.date,
    readTime: j.readTime ?? '',
    summary: j.summary ?? '',
    content: j.content ?? '',
    coverImageUrl: j.coverImageUrl ?? '',
    isPublished: j.isPublished,
  };
}

function JournalRow({
  journal,
  onEdit,
  onDelete,
  onTogglePublish,
}: {
  journal: Journal;
  onEdit: (j: Journal) => void;
  onDelete: (j: Journal) => void;
  onTogglePublish: (j: Journal) => void;
}) {
  return (
    <tr className="transition-colors hover:bg-muted/30">
      <td className="admin-row px-4">
        {journal.coverImageUrl ? (
          <Image
            src={journal.coverImageUrl}
            alt={journal.title}
            width={48}
            height={48}
            className="surface-card h-12 w-12 rounded-lg object-cover"
          />
        ) : (
          <div className="surface-card h-12 w-12 rounded-lg bg-muted" />
        )}
      </td>
      <td className="admin-row px-4">
        <span className="typo-body font-medium">{journal.title}</span>
        {journal.subtitle && (
          <span className="typo-body-sm ml-2 text-muted-foreground">({journal.subtitle})</span>
        )}
      </td>
      <td className="admin-row px-4">
        <span className="typo-label rounded-full bg-muted px-2 py-1 font-medium">
          {CATEGORY_LABELS[journal.category]}
        </span>
      </td>
      <td className="admin-row px-4 typo-body-sm text-muted-foreground">{journal.date}</td>
      <td className="admin-row px-4">
        <JournalStatusBadge isPublished={journal.isPublished} onClick={() => onTogglePublish(journal)} />
      </td>
      <td className="admin-row px-4">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(journal)}
            className="typo-body-sm"
          >
            수정
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(journal)}
            className="typo-body-sm text-destructive hover:text-destructive"
          >
            삭제
          </Button>
        </div>
      </td>
    </tr>
  );
}

function JournalFormModal({
  open,
  onClose,
  onSubmit,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateJournalData) => Promise<void>;
  initial?: Journal | null;
}) {
  const initialFormData = useMemo(() => (initial ? toFormData(initial) : null), [initial]);
  const { formData: form, setFormData: setForm, loading, handleSubmit } = useFormModal<CreateJournalData>(
    JOURNAL_DEFAULTS,
    initialFormData,
    open,
  );
  const [paragraphs, setParagraphs] = useState<string[]>(['']);

  useEffect(() => {
    if (initial && initial.content) {
      try {
        const parsed = JSON.parse(initial.content);
        setParagraphs(Array.isArray(parsed) ? parsed : [initial.content]);
      } catch {
        setParagraphs(initial.content ? [initial.content] : ['']);
      }
    } else if (!initial) {
      setParagraphs(['']);
    }
  }, [initial, open]);

  const handleFormSubmit = async (data: CreateJournalData) => {
    const merged = { ...data, content: JSON.stringify(paragraphs.filter(Boolean)) };
    await onSubmit(merged);
  };

  const handleTitleChange = (value: string) => {
    setForm({ ...form, title: value });
    if (!initial && !form.slug) {
      setForm({ ...form, title: value, slug: slugify(value) });
    }
  };

  const addParagraph = () => setParagraphs([...paragraphs, '']);
  const removeParagraph = (index: number) => {
    if (paragraphs.length > 1) {
      setParagraphs(paragraphs.filter((_, i) => i !== index));
    }
  };
  const updateParagraph = (index: number, value: string) => {
    const updated = [...paragraphs];
    updated[index] = value;
    setParagraphs(updated);
  };

  return (
    <Modal isOpen={open} onClose={onClose} maxWidth="lg">
      <h2 className="typo-h2 mb-4">{initial ? '저널 수정' : '저널 추가'}</h2>
      <form onSubmit={(e) => handleSubmit(e, handleFormSubmit, onClose)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="제목"
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="중국 차 도자기 문화"
            required
          />
          <FormInput
            label="슬러그"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="junzi-tea-culture"
            required
          />
        </div>

        <FormInput
          label="부제목"
          value={form.subtitle ?? ''}
          onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
          placeholder="따뜻한 차 한 잔의 철학"
        />

        <div className="grid grid-cols-3 gap-4">
          <div>
            <FormSelect
              label="카테고리"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as JournalCategory })}
              options={Object.values(JournalCategory).map((category) => ({
                value: category,
                label: CATEGORY_LABELS[category],
              }))}
            />
          </div>
          <FormInput
            label="게시 날짜"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />
          <FormInput
            label="읽는 시간"
            value={form.readTime ?? ''}
            onChange={(e) => setForm({ ...form, readTime: e.target.value })}
            placeholder="5분"
          />
        </div>

        <div>
          <label className="typo-label block mb-1">요약</label>
          <textarea
            value={form.summary ?? ''}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            placeholder="저널 요약..."
            rows={2}
            className="field-soft w-full rounded-md px-3 py-2 typo-body-sm resize-none"
          />
        </div>

        <div>
          <label className="typo-label block mb-1">본문 단락</label>
          <div className="space-y-2">
            {paragraphs.map((p, idx) => (
              <div key={idx} className="flex gap-2">
                <textarea
                  value={p}
                  onChange={(e) => updateParagraph(idx, e.target.value)}
                  placeholder={`단락 ${idx + 1}...`}
                  rows={2}
                  className="field-soft flex-1 rounded-md px-3 py-2 typo-body-sm resize-none"
                />
                {paragraphs.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() => removeParagraph(idx)}
                    aria-label="단락 삭제"
                    className="text-destructive hover:bg-destructive/10"
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button type="button" variant="link" size="sm" onClick={addParagraph} className="mt-2 px-0 typo-body-sm text-muted-foreground">
            + 단락 추가
          </Button>
        </div>

        <div>
          <label className="typo-label block mb-1">커버 이미지</label>
          <ProductImageUploader
            imageUrl={form.coverImageUrl ?? ''}
            onChange={(url) => setForm({ ...form, coverImageUrl: url })}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isPublished"
            checked={form.isPublished}
            onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="isPublished" className="typo-body-sm">공개 상태</label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>취소</Button>
          <Button type="submit" disabled={loading}>
            {loading ? '저장 중...' : initial ? '수정' : '추가'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const COLUMNS = [
  { label: '이미지', width: 'w-16' },
  { label: '제목' },
  { label: '카테고리', width: 'w-28' },
  { label: '날짜', width: 'w-28' },
  { label: '상태', width: 'w-20' },
  { label: '작업', width: 'w-36' },
];

export default function AdminJournalPage() {
  const { isLoading: authLoading, isAdmin } = useAdminGuard();
  const [journals, setJournals] = useState<Journal[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Journal | null>(null);
  const [filterCategory, setFilterCategory] = useState<JournalCategory | ''>('');

  const { execute: loadJournals, isLoading: loading } = useAsyncAction(
    async () => {
      const data = await adminJournalsApi.getAll();
      setJournals(data);
    },
    { errorMessage: '저널 목록을 불러오지 못했습니다.' },
  );

  useEffect(() => {
    if (isAdmin) {
      void loadJournals();
    }
  }, [isAdmin, loadJournals]);

  const handleOpenCreate = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (journal: Journal) => {
    setEditTarget(journal);
    setModalOpen(true);
  };

  const handleSubmit = async (data: CreateJournalData) => {
    if (editTarget) {
      await adminJournalsApi.update(editTarget.id, data);
      toast.success(toastMessage('journalUpdated'));
    } else {
      await adminJournalsApi.create(data);
      toast.success(toastMessage('journalCreated'));
    }
    await loadJournals();
  };

  const { execute: deleteJournal } = useAsyncAction(
    async (journal: Journal) => {
      await adminJournalsApi.remove(journal.id);
      await loadJournals();
    },
    { successMessage: '삭제되었습니다.', errorMessage: '삭제 실패' },
  );

  const handleDelete = (journal: Journal) => {
    if (!window.confirm(`"${journal.title}" 저널을 삭제하시겠습니까?`)) return;
    void deleteJournal(journal);
  };

  const { execute: togglePublish } = useAsyncAction(
    async (journal: Journal) => {
      await adminJournalsApi.update(journal.id, { isPublished: !journal.isPublished });
      toast.success(toastMessage(journal.isPublished ? 'publishOff' : 'publishOn'));
      await loadJournals();
    },
    { errorMessage: '상태 변경에 실패했습니다.' },
  );

  const filteredJournals = filterCategory
    ? journals.filter((j) => j.category === filterCategory)
    : journals;

  const sortedJournals = [...filteredJournals].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  if (authLoading || loading) {
    return (
      <AdminLoadingState title="저널을 불러오는 중입니다." className="surface-card border-soft" />
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="저널 관리"
        titleClassName="typo-h1"
        action={<Button onClick={handleOpenCreate}>+ 저널 추가</Button>}
      />

      <div className="surface-card flex flex-wrap gap-2 p-3">
        <Button
          type="button"
          size="sm"
          variant={filterCategory === '' ? 'black' : 'gray'}
          aria-pressed={filterCategory === ''}
          onClick={() => setFilterCategory('')}
          className="rounded-full"
        >
          전체
        </Button>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={filterCategory === key ? 'black' : 'gray'}
            aria-pressed={filterCategory === key}
            onClick={() => setFilterCategory(key as JournalCategory)}
            className="rounded-full"
          >
            {label}
          </Button>
        ))}
      </div>

      <AdminTable
        columns={COLUMNS}
        isEmpty={sortedJournals.length === 0}
        emptyMessage="저널이 없습니다."
      >
        {sortedJournals.map((j) => (
          <JournalRow
            key={j.id}
            journal={j}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
            onTogglePublish={togglePublish}
          />
        ))}
      </AdminTable>

      <JournalFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initial={editTarget}
      />
    </div>
  );
}
