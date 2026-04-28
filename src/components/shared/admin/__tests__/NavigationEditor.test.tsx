import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NavigationEditor from '@/components/shared/admin/NavigationEditor';
import type { NavigationItem } from '@/lib/api';

// 자식 모달/프리뷰는 별개 단위로 테스트 — 여기서는 컨테이너 동작만 검증
vi.mock('@/components/shared/admin/navigation/NavigationFormModal', () => ({
  default: ({
    open,
    onSubmit,
    initial,
  }: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: { label: string; url: string; parent_id: number | null; is_active: boolean }) => Promise<void>;
    initial: { id?: number } | null;
  }) =>
    open ? (
      <div data-testid="form-modal">
        <span>{initial ? `editing-${initial.id}` : 'creating'}</span>
        <button
          type="button"
          onClick={() =>
            void onSubmit({ label: '신규', url: '/new', parent_id: null, is_active: true })
          }
        >
          mock-submit
        </button>
      </div>
    ) : null,
}));

vi.mock('@/components/shared/admin/navigation/NavigationPreview', () => ({
  default: () => <div data-testid="navigation-preview">preview</div>,
}));

vi.mock('@/components/shared/admin/navigation/SortableNavigationRow', () => ({
  default: ({
    item,
    onEdit,
    onDelete,
    onToggleActive,
  }: {
    item: NavigationItem;
    depth: number;
    onEdit: (i: NavigationItem) => void;
    onDelete: (i: NavigationItem) => Promise<void>;
    onToggleActive: (i: NavigationItem) => Promise<void>;
  }) => (
    <div data-testid={`row-${item.id}`}>
      <span>{item.label}</span>
      <button type="button" onClick={() => onEdit(item)}>edit-{item.id}</button>
      <button type="button" onClick={() => void onDelete(item)}>delete-{item.id}</button>
      <button type="button" onClick={() => void onToggleActive(item)}>toggle-{item.id}</button>
    </div>
  ),
}));

const sampleItems: NavigationItem[] = [
  { id: 1, group: 'gnb', label: '홈', url: '/', sort_order: 0, is_active: true, parent_id: null, children: [] },
  { id: 2, group: 'gnb', label: '상품', url: '/products', sort_order: 1, is_active: true, parent_id: null, children: [
    { id: 3, group: 'gnb', label: '신상품', url: '/products?new=1', sort_order: 0, is_active: true, parent_id: 2, children: [] },
  ] },
  { id: 4, group: 'gnb', label: '이벤트', url: '/events', sort_order: 2, is_active: false, parent_id: null, children: [] },
];

const baseHandlers = () => ({
  onReload: vi.fn().mockResolvedValue(undefined),
  onCreate: vi.fn().mockResolvedValue(undefined),
  onUpdate: vi.fn().mockResolvedValue(undefined),
  onDelete: vi.fn().mockResolvedValue(undefined),
  onReorder: vi.fn().mockResolvedValue(undefined),
});

describe('NavigationEditor', () => {
  beforeEach(() => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('items=[] 일 때 빈 상태 표시', () => {
    const handlers = baseHandlers();
    render(<NavigationEditor group="gnb" items={[]} {...handlers} />);
    expect(screen.getByText('등록된 메뉴가 없습니다')).toBeInTheDocument();
  });

  it('아이템 카운트: 총 N개 (활성 M개)', () => {
    const handlers = baseHandlers();
    render(<NavigationEditor group="gnb" items={sampleItems} {...handlers} />);
    // flatItems = 4 (홈 + 상품 + 신상품 + 이벤트), 활성 root = 2 (홈, 상품)
    expect(screen.getByText(/총 4개 메뉴/)).toBeInTheDocument();
    expect(screen.getByText(/2개 활성/)).toBeInTheDocument();
  });

  it('"메뉴 추가" 버튼 클릭 → 폼 모달 (creating)', async () => {
    const handlers = baseHandlers();
    render(<NavigationEditor group="gnb" items={sampleItems} {...handlers} />);
    await userEvent.click(screen.getByRole('button', { name: /메뉴 추가/ }));
    expect(screen.getByTestId('form-modal')).toBeInTheDocument();
    expect(screen.getByText('creating')).toBeInTheDocument();
  });

  it('수정 버튼 클릭 → 폼 모달 (editing-id)', async () => {
    const handlers = baseHandlers();
    render(<NavigationEditor group="gnb" items={sampleItems} {...handlers} />);
    await userEvent.click(screen.getByText('edit-2'));
    expect(screen.getByText('editing-2')).toBeInTheDocument();
  });

  it('새 메뉴 폼 제출 → onCreate + onReload', async () => {
    const handlers = baseHandlers();
    render(<NavigationEditor group="gnb" items={sampleItems} {...handlers} />);
    await userEvent.click(screen.getByRole('button', { name: /메뉴 추가/ }));
    await userEvent.click(screen.getByText('mock-submit'));
    expect(handlers.onCreate).toHaveBeenCalledWith({
      label: '신규',
      url: '/new',
      parent_id: null,
      is_active: true,
    });
    expect(handlers.onReload).toHaveBeenCalled();
  });

  it('수정 폼 제출 → onUpdate(id, data) + onReload', async () => {
    const handlers = baseHandlers();
    render(<NavigationEditor group="gnb" items={sampleItems} {...handlers} />);
    await userEvent.click(screen.getByText('edit-1'));
    await userEvent.click(screen.getByText('mock-submit'));
    expect(handlers.onUpdate).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ label: '신규', url: '/new', parent_id: null, is_active: true }),
    );
  });

  it('삭제 버튼 + confirm → onDelete + onReload', async () => {
    const handlers = baseHandlers();
    render(<NavigationEditor group="gnb" items={sampleItems} {...handlers} />);
    fireEvent.click(screen.getByText('delete-1'));
    // 비동기 처리 대기
    await Promise.resolve();
    expect(window.confirm).toHaveBeenCalled();
    expect(handlers.onDelete).toHaveBeenCalledWith(1);
  });

  it('confirm=false → onDelete 호출 안 됨', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const handlers = baseHandlers();
    render(<NavigationEditor group="gnb" items={sampleItems} {...handlers} />);
    fireEvent.click(screen.getByText('delete-1'));
    await Promise.resolve();
    expect(handlers.onDelete).not.toHaveBeenCalled();
  });

  it('자식 있는 메뉴 삭제 시 confirm 메시지에 자식 개수 포함', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const handlers = baseHandlers();
    render(<NavigationEditor group="gnb" items={sampleItems} {...handlers} />);
    fireEvent.click(screen.getByText('delete-2'));
    await Promise.resolve();
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('하위 메뉴 1개'));
  });

  it('활성 토글 → onUpdate({ is_active: !current })', async () => {
    const handlers = baseHandlers();
    render(<NavigationEditor group="gnb" items={sampleItems} {...handlers} />);
    fireEvent.click(screen.getByText('toggle-1'));
    await Promise.resolve();
    expect(handlers.onUpdate).toHaveBeenCalledWith(1, { is_active: false });
  });

  it('미리보기 토글 — 클릭 시 NavigationPreview 표시', async () => {
    const handlers = baseHandlers();
    render(<NavigationEditor group="gnb" items={sampleItems} {...handlers} />);
    expect(screen.queryByTestId('navigation-preview')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /미리보기$/ }));
    expect(screen.getByTestId('navigation-preview')).toBeInTheDocument();
  });
});
