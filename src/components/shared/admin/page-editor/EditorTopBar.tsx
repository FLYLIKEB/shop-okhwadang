'use client';

import { localMessage } from '@/utils/localMessages';
import { useState } from 'react';
import { Eye, Save, Trash2, Info, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FormInput from '@/components/ui/FormInput';

interface EditorTopBarProps {
  title: string;
  slug: string;
  isPublished: boolean;
  hasChanges: boolean;
  saving: boolean;
  onTitleChange: (title: string) => void;
  onSlugChange: (slug: string) => void;
  onTogglePublish: () => void;
  onSave: () => void;
  onDelete: () => void;
  onPreview: () => void;
}

export default function EditorTopBar({
  title,
  slug,
  isPublished,
  hasChanges,
  saving,
  onTitleChange,
  onSlugChange,
  onTogglePublish,
  onSave,
  onDelete,
  onPreview,
}: EditorTopBarProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingSlug, setEditingSlug] = useState(false);
  const [titleValue, setTitleValue] = useState(title);
  const [slugValue, setSlugValue] = useState(slug);

  const handleTitleBlur = () => {
    setEditingTitle(false);
    if (titleValue.trim() && titleValue !== title) {
      onTitleChange(titleValue.trim());
    } else {
      setTitleValue(title);
    }
  };

  const handleSlugBlur = () => {
    setEditingSlug(false);
    const cleaned = slugValue
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    if (cleaned && cleaned !== slug) {
      if (isPublished && !window.confirm(localMessage('adminEnglish.changingTheUrlOfAPublishedPage'))) {
        setSlugValue(slug);
        return;
      }
      onSlugChange(cleaned);
      setSlugValue(cleaned);
    } else {
      setSlugValue(slug);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, onBlur: () => void) => {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
    else if (e.key === 'Escape') onBlur();
  };

  return (
    <div className="cms-editor__topbar surface-card space-y-3 rounded-none border-0 border-b border-soft px-5 py-4">
      {/* 제목 + 액션 버튼 */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <FormInput
              id="page-title"
              type="text"
              label={localMessage('adminEnglish.pageTitle')}
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => handleKeyDown(e, handleTitleBlur)}
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={() => { setTitleValue(title); setEditingTitle(true); }}
              className="max-w-full truncate typo-h2 font-display font-semibold hover:text-muted-foreground"
              title={localMessage('adminEnglish.clickToEditThePageTitle')}
            >
              {title}
            </button>
          )}
        </div>

        <Button
          type="button"
          variant={isPublished ? 'secondary' : 'outline'}
          size="sm"
          onClick={onTogglePublish}
          disabled={saving}
          title={isPublished ? localMessage('adminEnglish.clickToUnpublishVisitorsWillNoLonger') : localMessage('adminEnglish.clickToPublishThisPageOnThe')}
        >
          {isPublished ? localMessage('adminEnglish.published') : localMessage('adminEnglish.private')}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPreview}
          aria-label={localMessage('admin.reviews.import.previewButton')}
          title={localMessage('adminEnglish.previewHowThePageWillLookBefore')}
        >
          <Eye className="h-4 w-4" />
          {localMessage('admin.reviews.import.previewButton')}
        </Button>

        <Button
          type="button"
          size="sm"
          onClick={onSave}
          disabled={!hasChanges || saving}
          aria-label={localMessage('popups.save')}
          title={hasChanges ? localMessage('adminEnglish.saveChanges') : localMessage('adminEnglish.thereAreNoChangesToSave')}
        >
          <Save className="h-4 w-4" />
          {saving ? localMessage('common.saving') : hasChanges ? localMessage('adminEnglish.save') : localMessage('popups.save')}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDelete}
          title={localMessage('adminEnglish.permanentlyDeleteThisPageCannotBeRecovered')}
          className="h-10 min-h-10 w-10 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* slug 편집 */}
      <div className="flex flex-wrap items-center gap-2 typo-body-sm text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span className="shrink-0">{localMessage('adminEnglish.url')}</span>
        <span className="shrink-0 text-muted-foreground">p/</span>
        {editingSlug ? (
          <FormInput
            id="page-slug"
            type="text"
            value={slugValue}
            onChange={(e) => setSlugValue(e.target.value)}
            onBlur={handleSlugBlur}
            onKeyDown={(e) => handleKeyDown(e, handleSlugBlur)}
            autoFocus
            placeholder={localMessage('adminEnglish.englishLettersNumbersAndHyphensOnly')}
            className="h-9 min-h-9 w-48 rounded-lg px-2 py-1 typo-body-sm"
          />
        ) : (
          <button
            type="button"
            onClick={() => { setSlugValue(slug); setEditingSlug(true); }}
            title={localMessage('adminEnglish.editTheUrlSlugEnglishLettersNumbers')}
            className="field-soft rounded-lg border border-soft px-2 py-1 font-mono typo-body-sm hover:bg-muted/70"
          >
            {slug || localMessage('adminEnglish.emptyClickToEnter')}
          </button>
        )}
        <span className="text-muted-foreground/60">{localMessage('adminEnglish.storefrontUrlP')}{slug || '...'}</span>
        {slug && (
          <a
            href={`/p/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            title={localMessage('adminEnglish.openPageInNewTab')}
            className="ml-1 flex items-center gap-1 rounded-lg px-2 py-1 typo-body-sm text-primary hover:bg-muted"
          >
            <ExternalLink className="h-3 w-3" />
            {localMessage('adminEnglish.openPage')}
          </a>
        )}
      </div>
    </div>
  );
}
