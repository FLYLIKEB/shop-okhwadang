'use client';

import { useEffect, useState, useReducer } from 'react';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { adminPagesApi } from '@/lib/api';
import type { Page } from '@/lib/api';
import { useUnsavedChanges } from '@/components/shared/hooks/useUnsavedChanges';
import { createDraftBlockId, draftReducer } from '@/components/shared/admin/page-editor/useDraftReducer';
import { usePageEditor } from '@/components/shared/admin/page-editor/usePageEditor';
import PageListSidebar from '@/components/shared/admin/page-editor/PageListSidebar';
import EditorTopBar from '@/components/shared/admin/page-editor/EditorTopBar';
import BlockPalette from '@/components/shared/admin/page-editor/BlockPalette';
import EditorCanvas from '@/components/shared/admin/page-editor/EditorCanvas';
import BlockPropertyPanel from '@/components/shared/admin/page-editor/BlockPropertyPanel';
import PreviewModal from '@/components/shared/admin/page-editor/PreviewModal';
import { ConfirmDialog } from '@/components/shared/admin/ConfirmDialog';
import { AdminEmptyState, AdminLoadingState } from '@/components/shared/admin/AdminStates';
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
    { errorMessage: '페이지 목록을 불러오지 못했습니다.' },
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

  if (authLoading || loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <AdminLoadingState title={localMessage('admin.pages.loading')} />
      </div>
    );
  }

  return (
    <div className="cms-editor flex h-full -m-6 overflow-hidden">
      <PageListSidebar
        pages={pages}
        selectedPageId={selectedPage?.id ?? null}
        onSelectPage={handleSelectPage}
        onCreatePage={handleCreatePage}
      />

      {selectedPage ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <EditorTopBar
            title={draft.title}
            slug={draft.slug}
            isPublished={selectedPage.is_published}
            hasChanges={draft.hasChanges}
            saving={saving}
            onTitleChange={(title) => dispatch({ type: 'SET_TITLE', title })}
            onSlugChange={(slug) => dispatch({ type: 'SET_SLUG', slug })}
            onTogglePublish={() => setConfirmPublishOpen(true)}
            onSave={handleSave}
            onDelete={handleDeletePage}
            onPreview={() => setShowPreview(true)}
          />
          <div className="flex flex-1 overflow-hidden">
            <BlockPalette
              onAddBlock={(blockType, content) => {
                const nextId = createDraftBlockId();
                dispatch({ type: 'ADD_BLOCK', blockType, content, id: nextId });
                setSelectedBlockId(nextId);
              }}
            />
            <EditorCanvas
              blocks={draft.blocks}
              selectedBlockId={selectedBlockId}
              onSelectBlock={setSelectedBlockId}
              onDeleteBlock={(blockId) => {
                dispatch({ type: 'DELETE_BLOCK', blockId });
                if (selectedBlockId === blockId) setSelectedBlockId(null);
              }}
              onToggleVisibility={(blockId) =>
                dispatch({ type: 'TOGGLE_VISIBILITY', blockId })
              }
              onReorder={(activeId, overId) =>
                dispatch({ type: 'REORDER', activeId, overId })
              }
            />
            <BlockPropertyPanel
              block={selectedBlock}
              onUpdateContent={(blockId, content) =>
                dispatch({ type: 'UPDATE_CONTENT', blockId, content })
              }
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-8">
          <AdminEmptyState
            title={localMessage('admin.pages.emptyTitle')}
            description={localMessage('admin.pages.emptyDescription')}
          />
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
        description={selectedPage?.is_published
          ? localMessage('admin.pages.publishDialog.unpublishDescription')
          : localMessage('admin.pages.publishDialog.publishDescription')}
        confirmLabel={selectedPage?.is_published ? localMessage('admin.pages.publishDialog.unpublishConfirm') : localMessage('admin.pages.publishDialog.publishConfirm')}
        cancelLabel={localMessage('admin.pages.publishDialog.cancel')}
        destructive={selectedPage?.is_published}
        onCancel={() => setConfirmPublishOpen(false)}
        onConfirm={() => {
          setConfirmPublishOpen(false);
          void handleTogglePublish();
        }}
      />
    </div>
  );
}
