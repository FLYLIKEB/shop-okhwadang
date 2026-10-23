'use client';

import { localMessage } from '@/utils/localMessages';
import { useState } from 'react';
import { Plus, FileText } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import type { Page } from '@/lib/api';
import { Button } from '@/components/ui/button';
import FormInput from '@/components/ui/FormInput';

interface PageListSidebarProps {
  pages: Page[];
  selectedPageId: number | null;
  onSelectPage: (page: Page) => void;
  onCreatePage: (title: string, slug: string) => Promise<void>;
}

export default function PageListSidebar({
  pages,
  selectedPageId,
  onSelectPage,
  onCreatePage,
}: PageListSidebarProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) return;
    setCreating(true);
    try {
      await onCreatePage(title.trim(), slug.trim());
      setTitle('');
      setSlug('');
      setShowForm(false);
    } finally {
      setCreating(false);
    }
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, ''),
    );
  };

  return (
    <aside className="cms-editor__sidebar surface-card flex w-64 shrink-0 flex-col rounded-none border-0 border-r border-soft">
      <div className="flex items-center justify-between border-b border-soft px-4 py-4">
        <h2 className="typo-body font-semibold">{localMessage('adminEnglish.pages')}</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setShowForm(!showForm)}
          aria-label={localMessage('adminEnglish.newPage')}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 border-b border-soft p-4">
          <FormInput
            id="new-page-title"
            label={localMessage('adminEnglish.pageTitle')}
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder={localMessage('adminEnglish.pageTitle')}
            required
          />
          <FormInput
            id="new-page-slug"
            label="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={localMessage('adminEnglish.englishLettersNumbersAndHyphens')}
            required
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={creating}
              size="sm"
              className="flex-1"
            >
              {creating ? localMessage('adminEnglish.creating') : localMessage('admin.reviews.import.summary.create')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              {localMessage('popups.cancel')}
            </Button>
          </div>
        </form>
      )}

      {/* 사용 안내 */}
      <div className="mx-3 my-3 space-y-2 rounded-xl bg-muted/40 px-3 py-3 typo-body-sm text-muted-foreground">
        <p className="typo-label font-semibold text-foreground">{localMessage('admin.common.sections.pages')}</p>
        <p>{localMessage('adminEnglish.editTheLayoutOfPagesShownOn')}</p>
        <ul className="mt-2 list-none space-y-1">
          <li><b className="text-foreground">+</b> {localMessage('adminEnglish.createPage')}</li>
          <li>{localMessage('adminEnglish.addEditOrDeleteBlocks')}</li>
          <li><b className="text-foreground">{localMessage('admin.reviews.import.previewButton')}</b>{localMessage('adminEnglish.toReviewChanges')}</li>
          <li><b className="text-foreground">{localMessage('adminEnglish.saveAndPublish')}</b>{localMessage('adminEnglish.toUpdateTheStorefront')}</li>
        </ul>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {pages.length === 0 ? (
          <p className="px-4 py-8 text-center typo-body-sm text-muted-foreground">
            {localMessage('adminEnglish.noPagesYet')}<br />
            <span className="typo-label">{localMessage('adminEnglish.useTheButtonAboveToCreateOne')}</span>
          </p>
        ) : (
          <ul className="space-y-0.5 px-2">
            {pages.map((page) => (
              <li key={page.id}>
                <button
                  type="button"
                  onClick={() => onSelectPage(page)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left typo-body-sm transition-colors',
                    selectedPageId === page.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate font-medium normal-case">{page.title}</span>
                  {!page.is_published && (
                    <span className="shrink-0 rounded-lg bg-muted px-2 py-1 typo-label text-muted-foreground">
                      {localMessage('statusBadge.journal.private')}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
