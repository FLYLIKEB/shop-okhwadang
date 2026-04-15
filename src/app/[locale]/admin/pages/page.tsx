'use client';

import { useEffect, useState, useReducer } from 'react';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { adminPagesApi } from '@/lib/api';
import type { Page } from '@/lib/api';
import { useUnsavedChanges } from '@/components/shared/hooks/useUnsavedChanges';
import { draftReducer } from '@/components/shared/admin/page-editor/useDraftReducer';
import { usePageEditor } from '@/components/shared/admin/page-editor/usePageEditor';
import PageListSidebar from '@/components/shared/admin/page-editor/PageListSidebar';
import EditorTopBar from '@/components/shared/admin/page-editor/EditorTopBar';
import BlockPalette from '@/components/shared/admin/page-editor/BlockPalette';
import EditorCanvas from '@/components/shared/admin/page-editor/EditorCanvas';
import BlockPropertyPanel from '@/components/shared/admin/page-editor/BlockPropertyPanel';
import PreviewModal from '@/components/shared/admin/page-editor/PreviewModal';

export default function AdminPagesPage() {
  const { isLoading: authLoading, isAdmin } = useAdminGuard();
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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
        <span className="text-sm text-muted-foreground">로딩 중...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full -m-6">
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
            onTogglePublish={handleTogglePublish}
            onSave={handleSave}
            onDelete={handleDeletePage}
            onPreview={() => setShowPreview(true)}
          />
          <div className="flex flex-1 overflow-hidden">
            <BlockPalette
              onAddBlock={(blockType, content) =>
                dispatch({ type: 'ADD_BLOCK', blockType, content })
              }
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
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
          <p className="text-base font-medium text-foreground">편집할 페이지를 선택하세요</p>
          <p className="text-sm max-w-sm">
            왼쪽 목록에서 페이지를 선택하면 블록 편집기가 열립니다.<br />
            새 페이지는 왼쪽 상단 <b>+</b> 버튼으로 만들 수 있습니다.
          </p>
          <div className="mt-2 rounded-lg border bg-muted/40 px-6 py-4 text-xs text-left space-y-1.5 max-w-sm">
            <p className="font-semibold text-foreground mb-2">블록이란?</p>
            <p>🖼 <b>히어로 배너</b> — 페이지 최상단 큰 이미지 영역</p>
            <p>🛍 <b>상품 그리드</b> — 상품을 격자 형태로 나열</p>
            <p>🎠 <b>상품 캐러셀</b> — 상품을 슬라이드로 표시</p>
            <p>🗂 <b>카테고리 내비</b> — 카테고리 바로가기 버튼</p>
            <p>📢 <b>프로모션 배너</b> — 할인·이벤트 안내 띠 배너</p>
            <p>📝 <b>텍스트</b> — 자유 형식 HTML 텍스트</p>
          </div>
        </div>
      )}

      {showPreview && (
        <PreviewModal
          blocks={draft.blocks}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
