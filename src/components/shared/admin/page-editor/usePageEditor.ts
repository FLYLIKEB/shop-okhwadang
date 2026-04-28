import { useCallback } from 'react';
import { toast } from 'sonner';
import { handleApiError } from '@/utils/error';
import { adminPagesApi, pagesApi } from '@/lib/api';
import type { Page, PageBlock } from '@/lib/api';
import type { DraftState, DraftAction } from '@/components/shared/admin/page-editor/useDraftReducer';

interface UsePageEditorOptions {
  draft: DraftState;
  dispatch: React.Dispatch<DraftAction>;
  selectedPage: Page | null;
  setSelectedPage: React.Dispatch<React.SetStateAction<Page | null>>;
  setSelectedBlockId: React.Dispatch<React.SetStateAction<number | null>>;
  setSaving: React.Dispatch<React.SetStateAction<boolean>>;
  loadPages: () => Promise<void>;
}

interface UsePageEditorReturn {
  handleSelectPage: (page: Page) => Promise<void>;
  handleCreatePage: (title: string, slug: string) => Promise<void>;
  handleDeletePage: () => Promise<void>;
  handleTogglePublish: () => Promise<void>;
  handleSave: () => Promise<void>;
}

export function usePageEditor({
  draft,
  dispatch,
  selectedPage,
  setSelectedPage,
  setSelectedBlockId,
  setSaving,
  loadPages,
}: UsePageEditorOptions): UsePageEditorReturn {
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
    [draft.hasChanges, dispatch, setSelectedPage, setSelectedBlockId],
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

  return { handleSelectPage, handleCreatePage, handleDeletePage, handleTogglePublish, handleSave };
}
