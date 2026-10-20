import { useReducer, useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HeroBannerFields from '../block-property-panel/blocks/HeroBannerFields';
import PromotionBannerFields from '../block-property-panel/blocks/PromotionBannerFields';
import BlockPropertyPanel from '../BlockPropertyPanel';
import { draftReducer } from '../useDraftReducer';
import { usePageEditor } from '../usePageEditor';
import type { Page } from '@/lib/api';

const uploadCmsImage = vi.hoisted(() => vi.fn());
const adminPagesApi = vi.hoisted(() => ({ saveDraft: vi.fn(), getById: vi.fn() }));
vi.mock('@/lib/api', () => ({ uploadApi: { uploadCmsImage }, adminPagesApi }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('CMS image upload persistence', () => {
  it.each(['hero', 'slider', 'promotion'].flatMap((kind) => ['old.jpg', ''].map((imageUrl) => ({ kind, imageUrl }))))('keeps original, derivatives and edits during $kind upload from "$imageUrl"', async ({ kind, imageUrl }) => {
    let finish!: (value: unknown) => void;
    uploadCmsImage.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    function Editor() {
      const initialContent: Record<string, unknown> = {
        title: 'before', image_url: imageUrl, template: kind === 'slider' ? 'slider' : 'fullscreen',
        slides: [{ title: 'slide', image_url: imageUrl }],
      };
      const [draft, dispatch] = useReducer(draftReducer, {
        title: 'page', slug: 'page', hasChanges: false, deletedBlockIds: [],
        blocks: [{ id: 1, type: kind === 'promotion' ? 'promotion_banner' : 'hero_banner', content: initialContent, sort_order: 0, is_visible: true }],
      });
      const [page, setPage] = useState<Page | null>({ id: 1, title: 'page', slug: 'page', is_published: false, blocks: draft.blocks });
      const editor = usePageEditor({ draft, dispatch, selectedPage: page, setSelectedPage: setPage, setSelectedBlockId: vi.fn(), setSaving: vi.fn(), loadPages: async () => undefined });
      const content = draft.blocks[0].content;
      const Fields = kind === 'promotion' ? PromotionBannerFields : HeroBannerFields;
      return <><Fields content={content} onChange={(next) => dispatch({ type: 'UPDATE_CONTENT', blockId: 1, content: next })} /><button onClick={editor.handleSave}>Save</button><button onClick={() => page && editor.handleSelectPage(page)}>Reload</button><output>{JSON.stringify(content)}</output></>;
    }
    let stored: unknown;
    adminPagesApi.saveDraft.mockImplementation(async (_id, data) => { stored = structuredClone({ id: 1, ...data }); return stored; });
    adminPagesApi.getById.mockImplementation(async () => structuredClone(stored));
    const { container, unmount } = render(<Editor />);
    const inputs = container.querySelectorAll('input[type=file]');
    fireEvent.change(inputs[kind === 'slider' ? 1 : 0], { target: { files: [new File(['image'], 'new.jpg', { type: 'image/jpeg' })] } });
    fireEvent.change(screen.getAllByLabelText('제목')[0], { target: { value: 'latest edit' } });
    await act(async () => finish({ original: { url: 'new.jpg' }, derivatives: { full: { url: 'new.webp' } } }));
    await waitFor(() => expect(container.querySelector('img[src="new.jpg"]')).toBeInTheDocument());
    await act(async () => fireEvent.click(screen.getByText('Save')));
    await act(async () => fireEvent.click(screen.getByText('Reload')));
    const persisted = JSON.parse(container.querySelector('output')!.textContent!);
    expect(persisted.title).toBe('latest edit');
    expect(kind === 'slider' ? persisted.slides[0] : persisted).toMatchObject({ image_url: 'new.jpg', image_derivatives: { full: 'new.webp' } });
    unmount();
  });
  it('does not attach an in-flight upload to a newly selected block', async () => {
    let finish!: (value: unknown) => void;
    uploadCmsImage.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const onUpdateContent = vi.fn();
    const block = { id: 1, type: 'hero_banner' as const, content: { title: 'first' }, sort_order: 0, is_visible: true };
    const { container, rerender } = render(<BlockPropertyPanel block={block} onUpdateContent={onUpdateContent} />);
    fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [new File(['image'], 'new.jpg', { type: 'image/jpeg' })] } });
    rerender(<BlockPropertyPanel block={{ ...block, id: 2, content: { title: 'second' } }} onUpdateContent={onUpdateContent} />);
    await act(async () => finish({ original: { url: 'new.jpg' }, derivatives: {} }));
    expect(onUpdateContent).not.toHaveBeenCalled();
  });
});
