import { localMessage } from '@/utils/localMessages';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminPagesPage from '../page';
import { uiMessages as koMessages } from '@/i18n/ui-messages';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  usePathname: () => '/admin/pages',
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin' },
    isLoading: false,
  }),
}));

const mockGetAll = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();
const mockAddBlock = vi.fn();
const mockUpdateBlock = vi.fn();
const mockDeleteBlock = vi.fn();
const mockReorderBlocks = vi.fn();
const mockGetById = vi.fn();
const mockSaveDraft = vi.fn();

vi.mock('@/lib/api', () => ({
  adminPagesApi: {
    saveDraft: (...args: unknown[]) => mockSaveDraft(...args),
    getAll: (...args: unknown[]) => mockGetAll(...args),
    getById: (...args: unknown[]) => mockGetById(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
    addBlock: (...args: unknown[]) => mockAddBlock(...args),
    updateBlock: (...args: unknown[]) => mockUpdateBlock(...args),
    deleteBlock: (...args: unknown[]) => mockDeleteBlock(...args),
    reorderBlocks: (...args: unknown[]) => mockReorderBlocks(...args),
  },
}));

const mockPage = {
  id: 1,
  title: '메인 페이지',
  slug: 'main',
  is_published: true,
  blocks: [
    {
      id: 10,
      type: 'hero_banner' as const,
      content: { title: '환영합니다', template: 'fullscreen' },
      sort_order: 0,
      is_visible: true,
    },
  ],
};

describe('AdminPagesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAll.mockResolvedValue([mockPage]);
    mockGetById.mockResolvedValue(mockPage);
    mockCreate.mockResolvedValue({ id: 2, title: '새 페이지', slug: 'new-page', is_published: false, blocks: [] });
    mockUpdate.mockResolvedValue(mockPage);
    mockSaveDraft.mockResolvedValue(mockPage);
    mockAddBlock.mockResolvedValue({ id: 20, type: 'text_content', content: { html: '' }, sort_order: 0, is_visible: true });
    mockDeleteBlock.mockResolvedValue(undefined);
    mockReorderBlocks.mockResolvedValue(undefined);

    // Reset window.confirm
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('페이지 목록을 렌더링한다', async () => {
    render(<AdminPagesPage />);

    await waitFor(() => {
      expect(screen.getByText('메인 페이지')).toBeInTheDocument();
    });
  });

  it('페이지 선택 시 에디터를 표시한다', async () => {
    render(<AdminPagesPage />);

    await waitFor(() => {
      expect(screen.getByText('메인 페이지')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('메인 페이지'));

    await waitFor(() => {
      expect(mockGetById).toHaveBeenCalledWith(1);
    });

    await waitFor(() => {
      expect(screen.getByText(localMessage('adminEnglish.addBlock'))).toBeInTheDocument();
    });
  });

  it('블록 추가 버튼 클릭 시 블록이 추가된다', async () => {
    render(<AdminPagesPage />);

    await waitFor(() => {
      expect(screen.getByText('메인 페이지')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('메인 페이지'));

    await waitFor(() => {
      expect(screen.getByText(localMessage('adminEnglish.addBlock'))).toBeInTheDocument();
    });

    const addTextBtn = screen.getByTestId('add-block-text_content');
    fireEvent.click(addTextBtn);

    await waitFor(() => {
      expect(screen.getByText((content, el) =>
        el?.tagName === 'SPAN' && content === localMessage('adminEnglish.new') && el.previousSibling?.textContent === localMessage('adminEnglish.text')
      )).toBeInTheDocument();
    });
  });

  it('블록 삭제 시 블록이 제거된다', async () => {
    render(<AdminPagesPage />);

    await waitFor(() => {
      expect(screen.getByText('메인 페이지')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('메인 페이지'));

    await waitFor(() => {
      expect(screen.getByText('환영합니다')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByLabelText(localMessage('admin.pages.blockDeleteDialog.title'));
    fireEvent.click(deleteBtn);
    fireEvent.click(screen.getByRole('button', { name: localMessage('popups.delete') }));

    await waitFor(() => {
      expect(screen.queryByText('환영합니다')).not.toBeInTheDocument();
    });
  });

  it('저장 버튼 클릭 시 API를 호출한다', async () => {
    render(<AdminPagesPage />);

    await waitFor(() => {
      expect(screen.getByText('메인 페이지')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('메인 페이지'));

    await waitFor(() => {
      expect(screen.getByText(localMessage('adminEnglish.addBlock'))).toBeInTheDocument();
    });

    // Add a block to trigger hasChanges
    const addTextBtn = screen.getByTestId('add-block-text_content');
    fireEvent.click(addTextBtn);

    await waitFor(() => {
      expect(screen.getByText((content, el) =>
        el?.tagName === 'SPAN' && content === localMessage('adminEnglish.new') && el.previousSibling?.textContent === localMessage('adminEnglish.text')
      )).toBeInTheDocument();
    });

    // Save button should be enabled
    const saveBtn = screen.getByLabelText(localMessage('popups.save'));
    expect(saveBtn).not.toBeDisabled();

    // Mock the reload after save
    mockSaveDraft.mockResolvedValue({
      ...mockPage,
      blocks: [
        ...mockPage.blocks,
        { id: 20, type: 'text_content', content: { html: '', template: 'default' }, sort_order: 1, is_visible: true },
      ],
    });

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockSaveDraft).toHaveBeenCalledWith(1, expect.objectContaining({
        blocks: expect.arrayContaining([expect.objectContaining({ type: 'text_content', id: expect.any(Number) })]),
      }), expect.any(String));
    });
  });

  it('미저장 변경사항이 있으면 beforeunload 이벤트가 등록된다', async () => {
    const addSpy = vi.spyOn(window, 'addEventListener');

    render(<AdminPagesPage />);

    await waitFor(() => {
      expect(screen.getByText('메인 페이지')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('메인 페이지'));

    await waitFor(() => {
      expect(screen.getByText(localMessage('adminEnglish.addBlock'))).toBeInTheDocument();
    });

    // Add a block to trigger hasChanges
    fireEvent.click(screen.getByTestId('add-block-hero_banner'));

    await waitFor(() => {
      expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });

    addSpy.mockRestore();
  });

  it('비공개 페이지 선택 시 관리자 상세 API로 숨김 블록까지 표시한다', async () => {
    const draftPage = {
      id: 2,
      title: '비공개 페이지',
      slug: 'draft-page',
      is_published: false,
      blocks: [],
    };
    const draftPageWithHiddenBlock = {
      ...draftPage,
      blocks: [
        {
          id: 30,
          type: 'text_content' as const,
          content: { html: '<p>숨김 블록</p>', template: 'default' },
          sort_order: 0,
          is_visible: false,
        },
      ],
    };
    mockGetAll.mockResolvedValue([draftPage]);
    mockGetById.mockResolvedValue(draftPageWithHiddenBlock);

    render(<AdminPagesPage />);

    await waitFor(() => {
      expect(screen.getByText('비공개 페이지')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('비공개 페이지'));

    await waitFor(() => {
      expect(mockGetById).toHaveBeenCalledWith(2);
    });
    expect(screen.getAllByText(localMessage('adminEnglish.text')).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: localMessage('adminEnglish.show') })).toBeInTheDocument();
  });

  it('숨김 블록 저장 응답으로 추가 GET 없이 dirty state를 초기화한다', async () => {
    const hiddenPage = {
      ...mockPage,
      is_published: false,
      blocks: [
        {
          id: 30,
          type: 'text_content' as const,
          content: { html: '<p>숨김 블록</p>', template: 'default' },
          sort_order: 0,
          is_visible: false,
        },
      ],
    };
    mockGetAll.mockResolvedValue([hiddenPage]);
    mockGetById.mockResolvedValue(hiddenPage);
    mockSaveDraft.mockResolvedValue({
      ...hiddenPage,
      blocks: [{ ...hiddenPage.blocks[0], is_visible: true }],
    });
    mockUpdateBlock.mockResolvedValue({ ...hiddenPage.blocks[0], is_visible: true });

    render(<AdminPagesPage />);

    await waitFor(() => {
      expect(screen.getByText('메인 페이지')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('메인 페이지'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: localMessage('adminEnglish.show') })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: localMessage('adminEnglish.show') }));
    fireEvent.click(screen.getByLabelText(localMessage('popups.save')));

    await waitFor(() => {
      expect(mockSaveDraft).toHaveBeenCalledWith(1, expect.objectContaining({
        blocks: [expect.objectContaining({ id: 30, is_visible: true })],
      }), expect.any(String));
    });
    await waitFor(() => {
      expect(mockGetById).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByLabelText(localMessage('popups.save'))).toBeDisabled();
    });
  });

  it('미리보기 버튼 클릭 시 미리보기 모달이 표시된다', async () => {
    render(<AdminPagesPage />);

    await waitFor(() => {
      expect(screen.getByText('메인 페이지')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('메인 페이지'));

    await waitFor(() => {
      expect(screen.getByLabelText(localMessage('admin.reviews.import.previewButton'))).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(localMessage('admin.reviews.import.previewButton')));

    await waitFor(() => {
      expect(screen.getByText(localMessage('admin.reviews.import.previewButton'), { selector: 'h2' })).toBeInTheDocument();
    });
  });

  it('dirty 공개 변경은 저장을 안내하며 취소하면 draft와 서버를 유지한다', async () => {
    render(<AdminPagesPage />);
    fireEvent.click(await screen.findByText('메인 페이지'));
    fireEvent.click(await screen.findByTestId('add-block-text_content'));
    fireEvent.click(screen.getByRole('button', { name: localMessage('adminEnglish.published') }));
    expect(screen.getByText(koMessages.admin.pages.publishDialog.saveDescription)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: koMessages.admin.pages.publishDialog.cancel }));
    expect(mockSaveDraft).not.toHaveBeenCalled();
    expect(screen.getByLabelText(localMessage('popups.save'))).not.toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: localMessage('adminEnglish.published') }));
    fireEvent.click(screen.getByRole('button', { name: koMessages.admin.pages.publishDialog.saveConfirm }));
    await waitFor(() => expect(mockSaveDraft).toHaveBeenCalledWith(1, expect.objectContaining({
      is_published: false,
      blocks: expect.arrayContaining([expect.objectContaining({ type: 'text_content' })]),
    }), expect.any(String)));
  });

  it('저장 응답을 기다리는 동안 편집과 다른 페이지 선택을 잠근다', async () => {
    const user = userEvent.setup();
    mockGetAll.mockResolvedValue([mockPage, { ...mockPage, id: 2, title: '다른 페이지' }]);
    let resolveSave!: (value: typeof mockPage) => void;
    mockSaveDraft.mockReturnValue(new Promise<typeof mockPage>((resolve) => { resolveSave = resolve; }));
    render(<AdminPagesPage />);
    await user.click(await screen.findByText('메인 페이지'));
    await user.click(await screen.findByTestId('add-block-text_content'));
    await user.click(screen.getByLabelText(localMessage('popups.save')));
    expect(screen.getByTestId('add-block-text_content')).toBeDisabled();
    expect(screen.getByRole('button', { name: localMessage('adminEnglish.newPage') })).toBeDisabled();
    await user.click(screen.getByText('다른 페이지'));
    await user.click(screen.getByTestId('add-block-text_content'));
    expect(mockGetById).toHaveBeenCalledTimes(1);
    expect(mockSaveDraft.mock.calls[0][1].blocks).toHaveLength(2);
    await act(async () => resolveSave(mockPage));
    await waitFor(() => expect(screen.getByTestId('add-block-text_content')).not.toBeDisabled());
    expect(screen.getAllByText('메인 페이지')).toHaveLength(2);
  });
});
