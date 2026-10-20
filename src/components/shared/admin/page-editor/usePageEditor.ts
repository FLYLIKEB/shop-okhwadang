import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { handleApiError } from '@/utils/error';
import { adminPagesApi } from '@/lib/api';
import type { Page } from '@/lib/api';
import type { DraftState, DraftAction } from '@/components/shared/admin/page-editor/useDraftReducer';
import { toastMessage } from '@/utils/toastMessages';

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
  const pendingSave = useRef<{ payload: string; key: string } | null>(null);
  const saving = useRef(false);
  const selectionVersion = useRef(0);
  const handleSelectPage = useCallback(
    async (page: Page) => {
      if (saving.current) return;
      if (draft.hasChanges) {
        const confirmed = window.confirm('저장하지 않은 변경사항이 있습니다. 이동하시겠습니까?');
        if (!confirmed) return;
      }
      const version = ++selectionVersion.current;
      try {
        const fullPage = await adminPagesApi.getById(page.id);
        if (version !== selectionVersion.current) return;
        setSelectedPage(fullPage);
        setSelectedBlockId(null);
        dispatch({ type: 'INIT', blocks: fullPage.blocks, title: fullPage.title, slug: fullPage.slug });
      } catch {
        if (version === selectionVersion.current) toast.error(toastMessage('pageLoadError'));
      }
    },
    [draft.hasChanges, dispatch, setSelectedPage, setSelectedBlockId],
  );

  const handleCreatePage = async (title: string, slug: string) => {
    if (saving.current) return;
    ++selectionVersion.current;
    try {
      const newPage = await adminPagesApi.create({ title, slug });
      toast.success(toastMessage('pageCreated'));
      await loadPages();
      ++selectionVersion.current;
      setSelectedPage(newPage);
      dispatch({ type: 'INIT', blocks: [], title: newPage.title, slug: newPage.slug });
    } catch (err) {
      toast.error(handleApiError(err, toastMessage('createError')));
    }
  };

  const handleDeletePage = async () => {
    if (!selectedPage || saving.current) return;
    const confirmed = window.confirm(`"${selectedPage.title}" 페이지를 삭제하시겠습니까?`);
    if (!confirmed) return;
    ++selectionVersion.current;
    try {
      await adminPagesApi.remove(selectedPage.id);
      toast.success(toastMessage('pageDeleted'));
      ++selectionVersion.current;
      setSelectedPage(null);
      setSelectedBlockId(null);
      dispatch({ type: 'INIT', blocks: [], title: '', slug: '' });
      await loadPages();
    } catch (err) {
      toast.error(handleApiError(err, toastMessage('deleteError')));
    }
  };

  const saveDraft = async (isPublished?: boolean) => {
    if (!selectedPage || saving.current) return;
    ++selectionVersion.current;
    saving.current = true;
    setSaving(true);
    try {
      const data = {
        title: draft.title, slug: draft.slug,
        ...(isPublished === undefined ? {} : { is_published: isPublished }),
        blocks: draft.blocks.map((block, index) => ({
          id: Number(block.id), type: block.type, content: block.content,
          sort_order: index, is_visible: block.is_visible,
        })),
      };
      const payload = JSON.stringify({ pageId: selectedPage.id, ...data });
      if (pendingSave.current?.payload !== payload) {
        pendingSave.current = { payload, key: crypto.randomUUID() };
      }
      const saved = await adminPagesApi.saveDraft(selectedPage.id, data, pendingSave.current.key);
      setSelectedPage(saved);
      setSelectedBlockId(null);
      dispatch({ type: 'INIT', blocks: saved.blocks, title: saved.title, slug: saved.slug });
      pendingSave.current = null;
      toast.success(toastMessage(isPublished === undefined ? 'saved' : saved.is_published ? 'pagePublished' : 'pageUnpublished'));
      await loadPages();
    } catch (err) {
      toast.error(handleApiError(err, toastMessage('saveError')));
    } finally {
      saving.current = false;
      setSaving(false);
    }
  };

  const handleSave = () => saveDraft();

  const handleTogglePublish = async () => {
    if (!selectedPage || saving.current) return;
    await saveDraft(!selectedPage.is_published);
  };

  return { handleSelectPage, handleCreatePage, handleDeletePage, handleTogglePublish, handleSave };
}
