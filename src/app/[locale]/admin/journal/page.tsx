'use client';

import { localMessage } from '@/utils/localMessages';
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
  [JournalCategory.CULTURE]: localMessage('journalCategories.culture'),
  [JournalCategory.USAGE]: localMessage('journalCategories.usage'),
  [JournalCategory.TABLE_SETTING]: localMessage('journalCategories.tableSetting'),
  [JournalCategory.NEWS]: localMessage('journalCategories.news'),
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
    coverImageDerivatives: j.coverImageDerivatives ?? undefined,
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
    <tr className="admin-row transition-colors hover:bg-muted/30">
      <td className="admin-row px-4">
        {(journal.coverImageDerivatives?.thumbnail || journal.coverImageUrl) ? (
          <Image
            src={journal.coverImageDerivatives?.thumbnail || journal.coverImageUrl || ''}
            alt={journal.title}
            width={48}
            height={48}
            className="h-12 w-12 rounded-md border-soft object-cover"
          />
        ) : (
          <div className="h-12 w-12 rounded-md border-soft bg-muted" />
        )}
      </td>
      <td className="admin-row px-4">
        <span className="typo-body font-medium">{journal.title}</span>
        {journal.subtitle && (
          <span className="typo-body-sm ml-2 text-muted-foreground">({journal.subtitle})</span>
        )}
      </td>
      <td className="admin-row px-4">
        <span className="rounded-full border-soft bg-muted px-2 py-1 typo-label font-medium">
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
            {localMessage('popups.edit')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(journal)}
            className="typo-body-sm text-destructive hover:text-destructive"
          >
            {localMessage('popups.delete')}
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
    } else {
      setParagraphs(['']);
    }
  }, [initial, open]);

  const handleFormSubmit = async (data: CreateJournalData) => {
    const merged = { ...data, content: JSON.stringify(paragraphs.filter(Boolean)) };
    await onSubmit(merged);
  };

  const handleTitleChange = (value: string) => {
    setForm((previous) => ({ ...previous, title: value, ...(!initial && !previous.slug ? { slug: slugify(value) } : {}) }));
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
      <h2 className="typo-h2 mb-4">{initial ? localMessage('adminEnglish.editJournal') : localMessage('adminEnglish.addJournal')}</h2>
      <form onSubmit={(e) => handleSubmit(e, handleFormSubmit, onClose)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label={localMessage('popups.title')}
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder={localMessage('adminEnglish.chineseTeaAndCeramicCulture')}
            required
          />
          <FormInput
            label={localMessage('adminEnglish.slug')}
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="junzi-tea-culture"
            required
          />
        </div>

        <FormInput
          label={localMessage('adminEnglish.subtitle')}
          value={form.subtitle ?? ''}
          onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
          placeholder={localMessage('adminEnglish.thePhilosophyOfAWarmCupOf')}
        />

        <div className="grid grid-cols-3 gap-4">
          <div>
            <FormSelect
              label={localMessage('product.filter.category')}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as JournalCategory })}
              options={Object.values(JournalCategory).map((category) => ({
                value: category,
                label: CATEGORY_LABELS[category],
              }))}
            />
          </div>
          <FormInput
            label={localMessage('adminEnglish.publicationDate')}
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />
          <FormInput
            label={localMessage('adminEnglish.readingTime')}
            value={form.readTime ?? ''}
            onChange={(e) => setForm({ ...form, readTime: e.target.value })}
            placeholder={localMessage('adminEnglish.label5Min')}
          />
        </div>

        <div>
          <label className="typo-label block mb-1">{localMessage('adminEnglish.summary')}</label>
          <textarea
            value={form.summary ?? ''}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            placeholder={localMessage('adminEnglish.journalSummary')}
            rows={2}
            className="field-soft w-full rounded-md px-3 py-2 typo-body-sm resize-none"
          />
        </div>

        <div>
          <label className="typo-label block mb-1">{localMessage('adminEnglish.contentParagraphs')}</label>
          <div className="space-y-2">
            {paragraphs.map((p, idx) => (
              <div key={idx} className="flex gap-2">
                <textarea
                  value={p}
                  onChange={(e) => updateParagraph(idx, e.target.value)}
                  placeholder={localMessage('adminEnglish.paragraphPlaceholder', { number: idx + 1 })}
                  rows={2}
                  className="field-soft flex-1 rounded-md px-3 py-2 typo-body-sm resize-none"
                />
                {paragraphs.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() => removeParagraph(idx)}
                    aria-label={localMessage('adminEnglish.deleteParagraph')}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button type="button" variant="link" size="sm" onClick={addParagraph} className="mt-2 px-0 typo-body-sm text-muted-foreground">
            {localMessage('adminEnglish.addParagraph')}
          </Button>
        </div>

        <div>
          <label className="typo-label block mb-1">{localMessage('adminEnglish.coverImage')}</label>
          <ProductImageUploader
            imageUrl={form.coverImageUrl ?? ''}
            onChange={(url) => setForm((previous) => ({ ...previous, coverImageUrl: url }))}
            cmsKind="journal"
            onDerivativesChange={(derivatives) => setForm((previous) => ({ ...previous, coverImageDerivatives: derivatives }))}
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
          <label htmlFor="isPublished" className="typo-body-sm">{localMessage('adminEnglish.publicationStatus')}</label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>{localMessage('popups.cancel')}</Button>
          <Button type="submit" disabled={loading}>
            {loading ? localMessage('common.saving') : initial ? localMessage('popups.edit') : localMessage('common.add')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const COLUMNS = [
  { label: localMessage('admin.products.import.previewColumns.galleryImages'), width: 'w-16' },
  { label: localMessage('popups.title') },
  { label: localMessage('product.filter.category'), width: 'w-28' },
  { label: localMessage('adminEnglish.date'), width: 'w-28' },
  { label: localMessage('popups.status'), width: 'w-20' },
  { label: localMessage('popups.actions'), width: 'w-36' },
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
    { errorMessage: localMessage('journalPage.loadError') },
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
    { successMessage: localMessage('adminEnglish.deleted'), errorMessage: localMessage('adminEnglish.deleteFailed') },
  );

  const handleDelete = (journal: Journal) => {
    if (!window.confirm(localMessage('adminEnglish.confirmDeleteJournal', { title: journal.title }))) return;
    void deleteJournal(journal);
  };

  const { execute: togglePublish } = useAsyncAction(
    async (journal: Journal) => {
      await adminJournalsApi.update(journal.id, { isPublished: !journal.isPublished });
      toast.success(toastMessage(journal.isPublished ? 'publishOff' : 'publishOn'));
      await loadJournals();
    },
    { errorMessage: localMessage('admin.products.statusChangeError') },
  );

  const filteredJournals = filterCategory
    ? journals.filter((j) => j.category === filterCategory)
    : journals;

  const sortedJournals = [...filteredJournals].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  if (authLoading || loading) {
    return (
      <AdminLoadingState title={localMessage('adminEnglish.loadingJournalEntries')} className="surface-card border-soft" />
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={localMessage('admin.common.sections.journal')}
        titleClassName="typo-h1"
        action={<Button onClick={handleOpenCreate}>{localMessage('adminEnglish.addJournal2')}</Button>}
      />

      <div className="surface-card border-soft flex flex-wrap gap-2 bg-background p-3">
        <Button
          type="button"
          size="sm"
          variant={filterCategory === '' ? 'black' : 'gray'}
          aria-pressed={filterCategory === ''}
          onClick={() => setFilterCategory('')}
          className="rounded-full"
        >
          {localMessage('common.all')}
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
        emptyMessage={localMessage('adminEnglish.noJournalEntriesYet')}
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
