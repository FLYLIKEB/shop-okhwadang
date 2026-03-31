'use client';

import { useEffect, useState, useReducer, useCallback } from 'react';
import { toast } from 'sonner';
import { handleApiError } from '@/utils/error';
import { arrayMove } from '@dnd-kit/sortable';
import { adminPagesApi, pagesApi } from '@/lib/api';
import type { Page, PageBlock } from '@/lib/api';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import PageListSidebar from '@/components/admin/page-editor/PageListSidebar';
import EditorTopBar from '@/components/admin/page-editor/EditorTopBar';
import BlockPalette from '@/components/admin/page-editor/BlockPalette';
import EditorCanvas from '@/components/admin/page-editor/EditorCanvas';
import BlockPropertyPanel from '@/components/admin/page-editor/BlockPropertyPanel';
import type { DraftBlock } from '@/components/admin/page-editor/SortableBlockItem';

// --- Draft state management ---

interface DraftState {
  title: string;
  slug: string;
  blocks: DraftBlock[];
  deletedBlockIds: number[];
  hasChanges: boolean;
}

type DraftAction =
  | { type: 'INIT'; blocks: PageBlock[]; title: string; slug: string }
  | { type: 'SET_TITLE'; title: string }
  | { type: 'SET_SLUG'; slug: string }
  | { type: 'ADD_BLOCK'; blockType: PageBlock['type']; content: Record<string, unknown> }
  | { type: 'DELETE_BLOCK'; blockId: number }
  | { type: 'UPDATE_CONTENT'; blockId: number; content: Record<string, unknown> }
  | { type: 'TOGGLE_VISIBILITY'; blockId: number }
  | { type: 'REORDER'; activeId: number; overId: number };

let nextTempId = -1;

function draftReducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case 'INIT':
      nextTempId = -1;
      return {
        title: action.title,
        slug: action.slug,
        blocks: action.blocks.map((b) => ({ ...b })),
        deletedBlockIds: [],
        hasChanges: false,
      };

    case 'SET_TITLE':
      return { ...state, title: action.title, hasChanges: true };

    case 'SET_SLUG':
      return { ...state, slug: action.slug, hasChanges: true };

    case 'ADD_BLOCK': {
      const id = nextTempId--;
      const newBlock: DraftBlock = {
        id,
        type: action.blockType,
        content: action.content,
        sort_order: state.blocks.length,
        is_visible: true,
        _isNew: true,
      };
      return { ...state, blocks: [...state.blocks, newBlock], hasChanges: true };
    }

    case 'DELETE_BLOCK': {
      const block = state.blocks.find((b) => b.id === action.blockId);
      const deletedBlockIds = block && !block._isNew
        ? [...state.deletedBlockIds, action.blockId]
        : state.deletedBlockIds;
      return {
        ...state,
        blocks: state.blocks.filter((b) => b.id !== action.blockId),
        deletedBlockIds,
        hasChanges: true,
      };
    }

    case 'UPDATE_CONTENT':
      return {
        ...state,
        blocks: state.blocks.map((b) =>
          b.id === action.blockId
            ? { ...b, content: action.content, _isModified: !b._isNew ? true : b._isModified }
            : b,
        ),
        hasChanges: true,
      };

    case 'TOGGLE_VISIBILITY':
      return {
        ...state,
        blocks: state.blocks.map((b) =>
          b.id === action.blockId
            ? { ...b, is_visible: !b.is_visible, _isModified: !b._isNew ? true : b._isModified }
            : b,
        ),
        hasChanges: true,
      };

    case 'REORDER': {
      const oldIndex = state.blocks.findIndex((b) => b.id === action.activeId);
      const newIndex = state.blocks.findIndex((b) => b.id === action.overId);
      if (oldIndex === -1 || newIndex === -1) return state;
      const reordered = arrayMove(state.blocks, oldIndex, newIndex).map((b, i) => ({
        ...b,
        sort_order: i,
      }));
      return { ...state, blocks: reordered, hasChanges: true };
    }
  }
}

// --- Preview block renderers ---

function PreviewHeroBanner({ content }: { content: Record<string, unknown> }) {
  const imageUrl = content.image_url as string;
  const title = content.title as string;
  const subtitle = content.subtitle as string;
  const ctaText = content.cta_text as string;
  return (
    <div className="relative flex min-h-48 items-center justify-center overflow-hidden rounded-lg bg-gray-200">
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="relative z-10 text-center">
        {title && <h2 className="text-2xl font-bold drop-shadow">{title}</h2>}
        {subtitle && <p className="mt-1 text-sm text-gray-700 drop-shadow">{subtitle}</p>}
        {ctaText && (
          <span className="mt-3 inline-block rounded bg-foreground px-4 py-2 text-sm text-background">
            {ctaText}
          </span>
        )}
        {!title && !subtitle && !imageUrl && (
          <span className="text-sm text-muted-foreground">히어로 배너 (내용 없음)</span>
        )}
      </div>
    </div>
  );
}

function PreviewProductGrid({ content }: { content: Record<string, unknown> }) {
  const title = content.title as string;
  const template = (content.template as string) ?? '3col';
  const limit = (content.limit as number) ?? 8;
  const colMap: Record<string, string> = { '2col': 'grid-cols-2', '3col': 'grid-cols-3', '4col': 'grid-cols-4' };
  const colClass = colMap[template] ?? 'grid-cols-3';
  return (
    <div>
      {title && <h3 className="mb-3 font-semibold">{title}</h3>}
      <div className={`grid gap-2 ${colClass}`}>
        {Array.from({ length: Math.min(limit, 6) }).map((_, i) => (
          <div key={i} className="aspect-square rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
            상품 {i + 1}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{template} · 최대 {limit}개</p>
    </div>
  );
}

function PreviewProductCarousel({ content }: { content: Record<string, unknown> }) {
  const title = content.title as string;
  const limit = (content.limit as number) ?? 8;
  return (
    <div>
      {title && <h3 className="mb-3 font-semibold">{title}</h3>}
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: Math.min(limit, 5) }).map((_, i) => (
          <div key={i} className="h-24 w-20 shrink-0 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
            {i + 1}
          </div>
        ))}
        <div className="flex h-24 w-8 shrink-0 items-center justify-center text-muted-foreground">›</div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">캐러셀 · 최대 {limit}개</p>
    </div>
  );
}

function PreviewCategoryNav({ content }: { content: Record<string, unknown> }) {
  const template = (content.template as string) ?? 'text';
  const categories = ['상의', '하의', '아우터', '신발', '가방'];
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => (
        <span key={cat} className="rounded-full border px-3 py-1 text-sm">
          {template === 'icon' ? '◆ ' : ''}{cat}
        </span>
      ))}
      <p className="w-full mt-1 text-xs text-muted-foreground">카테고리 내비 · {template} 스타일</p>
    </div>
  );
}

function PreviewPromotionBanner({ content }: { content: Record<string, unknown> }) {
  const imageUrl = content.image_url as string;
  const title = content.title as string;
  const subtitle = content.subtitle as string;
  const ctaText = content.cta_text as string;
  const expiresAt = content.expires_at as string;
  return (
    <div className="relative flex min-h-32 items-center justify-between overflow-hidden rounded-lg bg-orange-50 px-6">
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
      )}
      <div className="relative z-10">
        {title && <h3 className="text-lg font-bold text-orange-900">{title}</h3>}
        {subtitle && <p className="text-sm text-orange-700">{subtitle}</p>}
        {expiresAt && <p className="mt-1 text-xs text-orange-500">~ {expiresAt}</p>}
        {!title && !subtitle && <span className="text-sm text-muted-foreground">프로모션 배너 (내용 없음)</span>}
      </div>
      {ctaText && (
        <span className="relative z-10 shrink-0 rounded bg-orange-500 px-4 py-2 text-sm text-white">
          {ctaText}
        </span>
      )}
    </div>
  );
}

function PreviewTextContent({ content }: { content: Record<string, unknown> }) {
  const html = content.html as string;
  if (!html) return <p className="text-sm text-muted-foreground">텍스트 블록 (내용 없음)</p>;
  // Strip tags for safe plain-text preview; full HTML rendering requires DOMPurify (SSR-incompatible without dynamic import)
  const plainText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return <p className="whitespace-pre-wrap text-sm">{plainText}</p>;
}

function PreviewBlock({ block }: { block: DraftBlock }) {
  switch (block.type) {
    case 'hero_banner':
      return <PreviewHeroBanner content={block.content} />;
    case 'product_grid':
      return <PreviewProductGrid content={block.content} />;
    case 'product_carousel':
      return <PreviewProductCarousel content={block.content} />;
    case 'category_nav':
      return <PreviewCategoryNav content={block.content} />;
    case 'promotion_banner':
      return <PreviewPromotionBanner content={block.content} />;
    case 'text_content':
      return <PreviewTextContent content={block.content} />;
  }
}

const BLOCK_TYPE_LABELS: Record<string, string> = {
  hero_banner: '히어로 배너',
  product_grid: '상품 그리드',
  product_carousel: '상품 캐러셀',
  category_nav: '카테고리 내비',
  promotion_banner: '프로모션 배너',
  text_content: '텍스트',
};

// --- Preview modal ---

function PreviewModal({
  blocks,
  onClose,
}: {
  blocks: DraftBlock[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative h-4/5 w-4/5 overflow-y-auto rounded-lg bg-background p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded border px-3 py-1 text-sm hover:bg-muted"
        >
          닫기
        </button>
        <h2 className="mb-6 text-xl font-bold">미리보기</h2>
        {blocks.filter((b) => b.is_visible).length === 0 ? (
          <p className="text-sm text-muted-foreground">표시할 블록이 없습니다.</p>
        ) : (
          <div className="space-y-6">
            {blocks
              .filter((b) => b.is_visible)
              .map((block) => (
                <div key={block.id} className="rounded-lg border p-4">
                  <span className="mb-3 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {BLOCK_TYPE_LABELS[block.type] ?? block.type}
                  </span>
                  <PreviewBlock block={block} />
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main page component ---

export default function AdminPagesPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
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

  const loadPages = useCallback(async () => {
    try {
      const data = await adminPagesApi.getAll();
      setPages(data);
    } catch {
      toast.error('페이지 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  const handleSelectPage = useCallback(
    async (page: Page) => {
      if (draft.hasChanges) {
        const confirmed = window.confirm('저장하지 않은 변경사항이 있습니다. 이동하시겠습니까?');
        if (!confirmed) return;
      }
      try {
        const fullPage = await pagesApi.getBySlug(page.slug);
        setSelectedPage(fullPage);
        setSelectedBlockId(null);
        dispatch({ type: 'INIT', blocks: fullPage.blocks, title: fullPage.title, slug: fullPage.slug });
      } catch {
        toast.error('페이지를 불러오지 못했습니다.');
      }
    },
    [draft.hasChanges],
  );

  const handleCreatePage = async (title: string, slug: string) => {
    try {
      const newPage = await adminPagesApi.create({ title, slug });
      toast.success('페이지가 생성되었습니다.');
      await loadPages();
      setSelectedPage(newPage);
      dispatch({ type: 'INIT', blocks: [], title: newPage.title, slug: newPage.slug });
    } catch (err) {
      toast.error(handleApiError(err, '생성에 실패했습니다.'));
    }
  };

  const handleDeletePage = async () => {
    if (!selectedPage) return;
    const confirmed = window.confirm(`"${selectedPage.title}" 페이지를 삭제하시겠습니까?`);
    if (!confirmed) return;
    try {
      await adminPagesApi.remove(selectedPage.id);
      toast.success('페이지가 삭제되었습니다.');
      setSelectedPage(null);
      setSelectedBlockId(null);
      dispatch({ type: 'INIT', blocks: [], title: '', slug: '' });
      await loadPages();
    } catch (err) {
      toast.error(handleApiError(err, '삭제에 실패했습니다.'));
    }
  };

  const handleTogglePublish = async () => {
    if (!selectedPage) return;
    const message = selectedPage.is_published
      ? '이 페이지를 비공개로 전환합니다.\n방문자에게 보이지 않게 됩니다. 계속하시겠습니까?'
      : '이 페이지를 공개하면 쇼핑몰에 바로 노출됩니다.\n계속하시겠습니까?';
    if (!window.confirm(message)) return;
    try {
      const updated = await adminPagesApi.update(selectedPage.id, {
        is_published: !selectedPage.is_published,
      } as Partial<Page>);
      setSelectedPage(updated);
      await loadPages();
      toast.success(updated.is_published ? '페이지가 공개되었습니다.' : '페이지가 비공개로 전환되었습니다.');
    } catch (err) {
      toast.error(handleApiError(err, '상태 변경에 실패했습니다.'));
    }
  };

  const handleSave = async () => {
    if (!selectedPage) return;
    setSaving(true);
    try {
      // 1. Create new blocks
      const newBlocks = draft.blocks.filter((b) => b._isNew);
      for (const block of newBlocks) {
        await adminPagesApi.addBlock(selectedPage.id, {
          type: block.type,
          content: block.content,
          sort_order: block.sort_order,
          is_visible: block.is_visible,
        });
      }

      // 2. Update modified blocks
      const modifiedBlocks = draft.blocks.filter((b) => b._isModified && !b._isNew);
      for (const block of modifiedBlocks) {
        await adminPagesApi.updateBlock(selectedPage.id, block.id, {
          content: block.content,
          is_visible: block.is_visible,
        } as Partial<PageBlock>);
      }

      // 3. Delete removed blocks
      for (const blockId of draft.deletedBlockIds) {
        await adminPagesApi.deleteBlock(selectedPage.id, blockId);
      }

      // 4. Reorder blocks
      const existingBlocks = draft.blocks.filter((b) => !b._isNew && b.id > 0);
      if (existingBlocks.length > 0) {
        await adminPagesApi.reorderBlocks(
          selectedPage.id,
          existingBlocks.map((b) => ({ id: b.id, sort_order: b.sort_order })),
        );
      }

      // 5. Update page meta (title, slug)
      const metaChanged =
        draft.title !== selectedPage.title || draft.slug !== selectedPage.slug;
      if (metaChanged) {
        await adminPagesApi.update(selectedPage.id, {
          title: draft.title,
          slug: draft.slug,
        } as Partial<Page>);
      }

      toast.success('저장되었습니다.');

      // Reload the page data via admin API to avoid slug issues
      const allPages = await adminPagesApi.getAll();
      const reloadedMeta = allPages.find((p) => p.id === selectedPage.id);
      if (reloadedMeta?.slug) {
        const reloaded = await pagesApi.getBySlug(reloadedMeta.slug);
        setSelectedPage(reloaded);
        dispatch({ type: 'INIT', blocks: reloaded.blocks, title: reloaded.title, slug: reloaded.slug });
      } else {
        // fallback: clear dirty flags to prevent duplicate save
        const cleanBlocks: PageBlock[] = draft.blocks
          .filter((b) => !b._isNew || b.id > 0)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .map(({ _isNew, _isModified, ...b }) => b as PageBlock);
        setSelectedPage((prev) => prev ? { ...prev, title: draft.title, slug: draft.slug } : prev);
        dispatch({ type: 'INIT', blocks: cleanBlocks, title: draft.title, slug: draft.slug });
      }
      await loadPages();
    } catch (err) {
      toast.error(handleApiError(err, '저장에 실패했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  const selectedBlock = draft.blocks.find((b) => b.id === selectedBlockId) ?? null;

  if (loading) {
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
