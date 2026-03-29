import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminPagesPage from '../page';

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
const mockGetBySlug = vi.fn();

vi.mock('@/lib/api', () => ({
  adminPagesApi: {
    getAll: (...args: unknown[]) => mockGetAll(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
    addBlock: (...args: unknown[]) => mockAddBlock(...args),
    updateBlock: (...args: unknown[]) => mockUpdateBlock(...args),
    deleteBlock: (...args: unknown[]) => mockDeleteBlock(...args),
    reorderBlocks: (...args: unknown[]) => mockReorderBlocks(...args),
  },
  pagesApi: {
    getBySlug: (...args: unknown[]) => mockGetBySlug(...args),
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
    mockGetBySlug.mockResolvedValue(mockPage);
    mockCreate.mockResolvedValue({ id: 2, title: '새 페이지', slug: 'new-page', is_published: false, blocks: [] });
    mockUpdate.mockResolvedValue(mockPage);
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
      expect(mockGetBySlug).toHaveBeenCalledWith('main');
    });

    await waitFor(() => {
      expect(screen.getByText('블록 추가')).toBeInTheDocument();
    });
  });

  it('블록 추가 버튼 클릭 시 블록이 추가된다', async () => {
    render(<AdminPagesPage />);

    await waitFor(() => {
      expect(screen.getByText('메인 페이지')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('메인 페이지'));

    await waitFor(() => {
      expect(screen.getByText('블록 추가')).toBeInTheDocument();
    });

    const addTextBtn = screen.getByTestId('add-block-text_content');
    fireEvent.click(addTextBtn);

    await waitFor(() => {
      expect(screen.getByText('텍스트 (신규)')).toBeInTheDocument();
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

    const deleteBtn = screen.getByLabelText('블록 삭제');
    fireEvent.click(deleteBtn);

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
      expect(screen.getByText('블록 추가')).toBeInTheDocument();
    });

    // Add a block to trigger hasChanges
    const addTextBtn = screen.getByTestId('add-block-text_content');
    fireEvent.click(addTextBtn);

    await waitFor(() => {
      expect(screen.getByText('텍스트 (신규)')).toBeInTheDocument();
    });

    // Save button should be enabled
    const saveBtn = screen.getByLabelText('저장');
    expect(saveBtn).not.toBeDisabled();

    // Mock the reload after save
    mockGetBySlug.mockResolvedValue({
      ...mockPage,
      blocks: [
        ...mockPage.blocks,
        { id: 20, type: 'text_content', content: { html: '', template: 'default' }, sort_order: 1, is_visible: true },
      ],
    });

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockAddBlock).toHaveBeenCalledWith(1, expect.objectContaining({
        type: 'text_content',
      }));
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
      expect(screen.getByText('블록 추가')).toBeInTheDocument();
    });

    // Add a block to trigger hasChanges
    fireEvent.click(screen.getByTestId('add-block-hero_banner'));

    await waitFor(() => {
      expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });

    addSpy.mockRestore();
  });

  it('미리보기 버튼 클릭 시 미리보기 모달이 표시된다', async () => {
    render(<AdminPagesPage />);

    await waitFor(() => {
      expect(screen.getByText('메인 페이지')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('메인 페이지'));

    await waitFor(() => {
      expect(screen.getByLabelText('미리보기')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('미리보기'));

    await waitFor(() => {
      expect(screen.getByText('미리보기', { selector: 'h2' })).toBeInTheDocument();
    });
  });
});
