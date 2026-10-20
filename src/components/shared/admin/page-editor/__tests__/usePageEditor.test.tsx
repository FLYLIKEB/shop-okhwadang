import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePageEditor } from '../usePageEditor';
import type { DraftState } from '../useDraftReducer';

const api = vi.hoisted(() => ({ saveDraft: vi.fn(), getById: vi.fn(), create: vi.fn(), remove: vi.fn() }));
vi.mock('@/lib/api', () => ({ adminPagesApi: api }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const page = { id: 1, title: 'old', slug: 'old', is_published: false, blocks: [] };
const draft: DraftState = { title: 'new', slug: 'new', hasChanges: true, deletedBlockIds: [], blocks: [
  { id: -1, type: 'text_content', content: { html: 'draft' }, sort_order: 0, is_visible: false, _isNew: true },
] };

describe('atomic CMS editor save', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.spyOn(window, 'confirm').mockReturnValue(true); });
  function setup() {
    const options = { draft, selectedPage: page, dispatch: vi.fn(), setSelectedPage: vi.fn(), setSelectedBlockId: vi.fn(), setSaving: vi.fn(), loadPages: vi.fn().mockResolvedValue(undefined) };
    return { ...renderHook((currentDraft) => usePageEditor({ ...options, draft: currentDraft }), { initialProps: draft }), options };
  }
  it('ignores A after B has loaded and editing B has started', async () => {
    let finishA!: (value: typeof page) => void;
    api.getById.mockReturnValueOnce(new Promise((resolve) => { finishA = resolve; }));
    const second = { ...page, id: 2, title: 'B', slug: 'b' };
    api.getById.mockResolvedValueOnce(second);
    const { result, options, rerender } = setup();
    let pendingA!: Promise<void>;
    act(() => { pendingA = result.current.handleSelectPage(page); });
    await act(() => result.current.handleSelectPage(second));
    rerender({ ...draft, title: 'B edited' });
    await act(async () => { finishA(page); await pendingA; });
    expect(options.setSelectedPage).toHaveBeenCalledTimes(1);
    expect(options.setSelectedPage).toHaveBeenLastCalledWith(second);
    expect(options.dispatch).toHaveBeenCalledTimes(1);
  });
  it.each(['save', 'create', 'delete'] as const)('ignores an earlier selection after %s', async (operation) => {
    let finish!: (value: typeof page) => void;
    api.getById.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    api.saveDraft.mockResolvedValue(page);
    api.create.mockResolvedValue({ ...page, id: 3 });
    api.remove.mockResolvedValue(undefined);
    const { result, options } = setup();
    let pending!: Promise<void>;
    act(() => { pending = result.current.handleSelectPage({ ...page, id: 2 }); });
    await act(() => operation === 'save' ? result.current.handleSave() : operation === 'create' ? result.current.handleCreatePage('new', 'new') : result.current.handleDeletePage());
    const calls = options.dispatch.mock.calls.length;
    await act(async () => { finish({ ...page, id: 2 }); await pending; });
    expect(options.dispatch).toHaveBeenCalledTimes(calls);
    expect(options.setSelectedPage).not.toHaveBeenLastCalledWith(expect.objectContaining({ id: 2 }));
  });
  it('reuses the key and draft after response loss, initializes from save response without GET', async () => {
    const saved = { ...page, title: 'new', slug: 'new', blocks: [{ ...draft.blocks[0], id: 8 }] };
    api.saveDraft.mockRejectedValueOnce(new Error('response lost')).mockResolvedValueOnce(saved);
    const { result, options } = setup();
    await act(() => result.current.handleSave());
    expect(options.dispatch).not.toHaveBeenCalled();
    await act(() => result.current.handleSave());
    expect(api.saveDraft.mock.calls[0]).toEqual(api.saveDraft.mock.calls[1]);
    expect(api.getById).not.toHaveBeenCalled();
    expect(options.dispatch).toHaveBeenCalledWith({ type: 'INIT', title: 'new', slug: 'new', blocks: saved.blocks });
  });
  it('changes the key when the payload changes', async () => {
    api.saveDraft.mockRejectedValue(new Error('response lost'));
    const { result, rerender } = setup();
    await act(() => result.current.handleSave());
    rerender({ ...draft, title: 'changed' });
    await act(() => result.current.handleSave());
    expect(api.saveDraft.mock.calls[0][2]).not.toBe(api.saveDraft.mock.calls[1][2]);
  });
  it('submits the entire dirty draft and publish flag atomically', async () => {
    api.saveDraft.mockResolvedValue({ ...page, ...draft, is_published: true });
    const { result } = setup();
    await act(() => result.current.handleTogglePublish());
    expect(api.saveDraft).toHaveBeenCalledWith(1, expect.objectContaining({ title: 'new', is_published: true, blocks: [expect.objectContaining({ id: -1, is_visible: false })] }), expect.any(String));
  });
  it('preserves dirty draft when publish fails', async () => {
    const { result, options } = setup();
    api.saveDraft.mockRejectedValue(new Error('failed'));
    await act(() => result.current.handleTogglePublish());
    expect(options.dispatch).not.toHaveBeenCalled();
  });
  it('keeps the committed response initialized if the sidebar refresh fails', async () => {
    const saved = { ...page, blocks: [{ ...draft.blocks[0], id: 8 }] };
    api.saveDraft.mockResolvedValue(saved);
    const { result, options } = setup();
    options.loadPages.mockRejectedValue(new Error('sidebar refresh failed'));
    await act(() => result.current.handleSave());
    expect(options.setSelectedPage).toHaveBeenCalledWith(saved);
    expect(options.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'INIT', blocks: saved.blocks }));
    expect(api.getById).not.toHaveBeenCalled();
    expect(api.saveDraft).toHaveBeenCalledTimes(1);
  });
  it('sends numeric existing IDs when MySQL bigint reads contain strings', async () => {
    api.saveDraft.mockResolvedValue(page);
    const { result, rerender } = setup();
    rerender({ ...draft, blocks: [{ ...draft.blocks[0], id: '42' as unknown as number, _isNew: false }] });
    await act(() => result.current.handleSave());
    expect(api.saveDraft).toHaveBeenCalledWith(1, expect.objectContaining({ blocks: [expect.objectContaining({ id: 42 })] }), expect.any(String));
  });
});
