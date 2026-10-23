'use client';

import { useEffect, useState, useReducer } from 'react';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { adminPagesApi } from '@/lib/api';
import type { Page } from '@/lib/api';
import { useUnsavedChanges } from '@/components/shared/hooks/useUnsavedChanges';
import { createDraftBlockId, draftReducer } from '@/components/shared/admin/page-editor/useDraftReducer';
import type { DraftAction } from '@/components/shared/admin/page-editor/useDraftReducer';
import { usePageEditor } from '@/components/shared/admin/page-editor/usePageEditor';
import PageListSidebar from '@/components/shared/admin/page-editor/PageListSidebar';
import EditorTopBar from '@/components/shared/admin/page-editor/EditorTopBar';
import BlockPalette from '@/components/shared/admin/page-editor/BlockPalette';
import EditorCanvas from '@/components/shared/admin/page-editor/EditorCanvas';
import BlockPropertyPanel from '@/components/shared/admin/page-editor/BlockPropertyPanel';
import PreviewModal from '@/components/shared/admin/page-editor/PreviewModal';
import { ConfirmDialog } from '@/components/shared/admin/ConfirmDialog';
import { AdminEmptyState, AdminLoadingState } from '@/components/shared/admin/AdminStates';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import { localMessage } from '@/utils/localMessages';

export default function AdminPagesPage() {
  const { isLoading: authLoading, isAdmin } = useAdminGuard();
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);

  const [draft, dispatch] = useReducer(draftReducer, {
    title: '',
    slug: '',
    blocks: [],
    deletedBlockIds: [],
    hasChanges: false,
  });

  useUnsavedChanges(draft.hasChanges);

  const { execute: loadPages, isLoading: loading } = useAsyncAction(
    async () => {
      const data = await adminPagesApi.getAll();
      setPages(data);
    },
    { errorMessage: localMessage('adminEnglish.unableToLoadPages') },
  );

  useEffect(() => {
    if (isAdmin) void loadPages();
  }, [isAdmin, loadPages]);

  const { handleSelectPage, handleCreatePage, handleDeletePage, handleTogglePublish, handleSave } =
    usePageEditor({
      draft,
      dispatch,
      selectedPage,
      setSelectedPage,
      setSelectedBlockId,
      setSaving,
      loadPages,
    });

  const selectedBlock = draft.blocks.find((b) => b.id === selectedBlockId) ?? null;
  const editDraft = (action: DraftAction) => {
    if (!saving) dispatch(action);
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <AdminLoadingState title={localMessage('admin.pages.loading')} />
      </div>
    );
  }

  return (
    <fieldset disabled={saving} inert={saving} className="cms-editor flex h-full min-w-0 -m-6 border-0 p-0 overflow-hidden bg-background">
      <PageListSidebar
        pages={pages}
        selectedPageId={selectedPage?.id ?? null}
        onSelectPage={handleSelectPage}
        onCreatePage={handleCreatePage}
      />

      {selectedPage ? (
        <div className="surface-card flex flex-1 flex-col overflow-hidden rounded-none border-0 shadow-none">
          <EditorTopBar
            title={draft.title}
            slug={draft.slug}
            isPublished={selectedPage.is_published}
            hasChanges={draft.hasChanges}
            saving={saving}
            onTitleChange={(title) => editDraft({ type: 'SET_TITLE', title })}
            onSlugChange={(slug) => editDraft({ type: 'SET_SLUG', slug })}
            onTogglePublish={() => setConfirmPublishOpen(true)}
            onSave={handleSave}
            onDelete={handleDeletePage}
            onPreview={() => setShowPreview(true)}
          />
          <div className="flex flex-1 overflow-hidden">
            <BlockPalette
              onAddBlock={(blockType, content) => {
                const nextId = createDraftBlockId();
                editDraft({ type: 'ADD_BLOCK', blockType, content, id: nextId });
                setSelectedBlockId(nextId);
              }}
            />
            <EditorCanvas
              blocks={draft.blocks}
              selectedBlockId={selectedBlockId}
              onSelectBlock={setSelectedBlockId}
              onDeleteBlock={(blockId) => {
                editDraft({ type: 'DELETE_BLOCK', blockId });
                if (selectedBlockId === blockId) setSelectedBlockId(null);
              }}
              onToggleVisibility={(blockId) =>
                editDraft({ type: 'TOGGLE_VISIBILITY', blockId })
              }
              onReorder={(activeId, overId) =>
                editDraft({ type: 'REORDER', activeId, overId })
              }
            />
            <BlockPropertyPanel
              block={selectedBlock}
              onUpdateContent={(blockId, content) =>
                editDraft({ type: 'UPDATE_CONTENT', blockId, content })
              }
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-8 overflow-y-auto p-8">
          <AdminPageHeader title={localMessage('admin.common.sections.pages')} />
          <div className="flex flex-1 items-center justify-center">
            <AdminEmptyState
              title={localMessage('admin.pages.emptyTitle')}
              description={localMessage('admin.pages.emptyDescription')}
              className="border-0 bg-transparent shadow-none"
            />
          </div>
        </div>
      )}

      {showPreview && (
        <PreviewModal
          blocks={draft.blocks}
          onClose={() => setShowPreview(false)}
        />
      )}
      <ConfirmDialog
        open={confirmPublishOpen}
        title={selectedPage?.is_published ? localMessage('admin.pages.publishDialog.unpublishTitle') : localMessage('admin.pages.publishDialog.publishTitle')}
        description={draft.hasChanges ? localMessage('admin.pages.publishDialog.saveDescription') : selectedPage?.is_published
          ? localMessage('admin.pages.publishDialog.unpublishDescription')
          : localMessage('admin.pages.publishDialog.publishDescription')}
        confirmLabel={draft.hasChanges ? localMessage('admin.pages.publishDialog.saveConfirm') : selectedPage?.is_published ? localMessage('admin.pages.publishDialog.unpublishConfirm') : localMessage('admin.pages.publishDialog.publishConfirm')}
        cancelLabel={localMessage('admin.pages.publishDialog.cancel')}
        destructive={selectedPage?.is_published}
        onCancel={() => setConfirmPublishOpen(false)}
        onConfirm={() => {
          setConfirmPublishOpen(false);
          void handleTogglePublish();
        }}
      />
    </fieldset>
  );
}
