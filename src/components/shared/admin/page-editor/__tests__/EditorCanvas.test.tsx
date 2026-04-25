import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EditorCanvas from '@/components/shared/admin/page-editor/EditorCanvas';
import type { DraftBlock } from '@/components/shared/admin/page-editor/SortableBlockItem';

vi.mock('@dnd-kit/core', async (importActual) => {
  const actual = await importActual<typeof import('@dnd-kit/core')>();
  return {
    ...actual,
    DndContext: ({
      children,
      onDragEnd,
    }: {
      children: ReactNode;
      onDragEnd?: (event: { active: { id: number }; over: { id: number } | null }) => void;
    }) => (
      <div>
        <button type="button" onClick={() => onDragEnd?.({ active: { id: 1 }, over: { id: 2 } })}>
          reorder 1 over 2
        </button>
        <button type="button" onClick={() => onDragEnd?.({ active: { id: 1 }, over: { id: 1 } })}>
          reorder same
        </button>
        <button type="button" onClick={() => onDragEnd?.({ active: { id: 1 }, over: null })}>
          reorder no target
        </button>
        {children}
      </div>
    ),
  };
});

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: ReactNode }) => <>{children}</>,
  verticalListSortingStrategy: vi.fn(),
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

const blocks: DraftBlock[] = [
  {
    id: 1,
    type: 'hero_banner',
    content: { title: '메인 배너' },
    sort_order: 0,
    is_visible: true,
  },
  {
    id: 2,
    type: 'product_grid',
    content: { title: '추천 상품', limit: 8, template: '4col' },
    sort_order: 1,
    is_visible: true,
  },
  {
    id: 3,
    type: 'text_content',
    content: { html: '<p>안녕하세요</p>' },
    sort_order: 2,
    is_visible: false,
  },
];

describe('EditorCanvas', () => {
  beforeEach(() => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('blocks=[] → 빈 상태 메시지', () => {
    render(
      <EditorCanvas
        blocks={[]}
        selectedBlockId={null}
        onSelectBlock={vi.fn()}
        onDeleteBlock={vi.fn()}
        onToggleVisibility={vi.fn()}
        onReorder={vi.fn()}
      />,
    );
    expect(screen.getByText('블록이 없습니다')).toBeInTheDocument();
  });

  it('블록 목록 렌더 — 타입 라벨 + 순번 표시', () => {
    render(
      <EditorCanvas
        blocks={blocks}
        selectedBlockId={null}
        onSelectBlock={vi.fn()}
        onDeleteBlock={vi.fn()}
        onToggleVisibility={vi.fn()}
        onReorder={vi.fn()}
      />,
    );
    expect(screen.getByText('히어로 배너')).toBeInTheDocument();
    expect(screen.getByText('상품 그리드')).toBeInTheDocument();
    expect(screen.getByText('텍스트')).toBeInTheDocument();
    // 순번 1, 2, 3
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('블록 클릭 → onSelectBlock(id) 호출', async () => {
    const onSelectBlock = vi.fn();
    render(
      <EditorCanvas
        blocks={blocks}
        selectedBlockId={null}
        onSelectBlock={onSelectBlock}
        onDeleteBlock={vi.fn()}
        onToggleVisibility={vi.fn()}
        onReorder={vi.fn()}
      />,
    );
    // 블록 본문 영역 클릭 (라벨 텍스트가 있는 버튼)
    await userEvent.click(screen.getByText('히어로 배너'));
    expect(onSelectBlock).toHaveBeenCalledWith(1);
  });

  it('가시성 토글 버튼 → onToggleVisibility(id)', async () => {
    const onToggleVisibility = vi.fn();
    render(
      <EditorCanvas
        blocks={blocks}
        selectedBlockId={null}
        onSelectBlock={vi.fn()}
        onDeleteBlock={vi.fn()}
        onToggleVisibility={onToggleVisibility}
        onReorder={vi.fn()}
      />,
    );
    // is_visible=true 인 블록은 "숨기기" aria-label
    const hideButtons = screen.getAllByRole('button', { name: '숨기기' });
    await userEvent.click(hideButtons[0]);
    expect(onToggleVisibility).toHaveBeenCalledWith(1);
  });

  it('삭제 버튼 + confirm → onDeleteBlock(id)', async () => {
    const onDeleteBlock = vi.fn();
    render(
      <EditorCanvas
        blocks={blocks}
        selectedBlockId={null}
        onSelectBlock={vi.fn()}
        onDeleteBlock={onDeleteBlock}
        onToggleVisibility={vi.fn()}
        onReorder={vi.fn()}
      />,
    );
    const deleteButtons = screen.getAllByRole('button', { name: '블록 삭제' });
    await userEvent.click(deleteButtons[1]);
    expect(window.confirm).toHaveBeenCalled();
    expect(onDeleteBlock).toHaveBeenCalledWith(2);
  });

  it('삭제 버튼 + confirm=false → onDeleteBlock 호출 안 됨', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const onDeleteBlock = vi.fn();
    render(
      <EditorCanvas
        blocks={blocks}
        selectedBlockId={null}
        onSelectBlock={vi.fn()}
        onDeleteBlock={onDeleteBlock}
        onToggleVisibility={vi.fn()}
        onReorder={vi.fn()}
      />,
    );
    await userEvent.click(screen.getAllByRole('button', { name: '블록 삭제' })[0]);
    expect(onDeleteBlock).not.toHaveBeenCalled();
  });

  it('selectedBlockId 와 일치하는 블록은 ring-2 클래스', () => {
    render(
      <EditorCanvas
        blocks={blocks}
        selectedBlockId={2}
        onSelectBlock={vi.fn()}
        onDeleteBlock={vi.fn()}
        onToggleVisibility={vi.fn()}
        onReorder={vi.fn()}
      />,
    );
    // SortableBlockItem 의 컨테이너 div 가 ring-2 클래스를 가짐
    const selectedTitle = screen.getByText('상품 그리드');
    const wrapper = selectedTitle.closest('div.mb-2');
    expect(wrapper?.className).toContain('ring-2');
  });

  it('is_visible=false 블록은 EyeOff 아이콘 ("표시" aria-label)', () => {
    render(
      <EditorCanvas
        blocks={blocks}
        selectedBlockId={null}
        onSelectBlock={vi.fn()}
        onDeleteBlock={vi.fn()}
        onToggleVisibility={vi.fn()}
        onReorder={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: '표시' })).toBeInTheDocument();
  });

  it('드래그 종료 시 active/over id가 다르면 onReorder(activeId, overId)를 호출', async () => {
    const onReorder = vi.fn();
    render(
      <EditorCanvas
        blocks={blocks}
        selectedBlockId={null}
        onSelectBlock={vi.fn()}
        onDeleteBlock={vi.fn()}
        onToggleVisibility={vi.fn()}
        onReorder={onReorder}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'reorder 1 over 2' }));
    expect(onReorder).toHaveBeenCalledWith(1, 2);
  });

  it('드래그 종료 시 타겟이 없거나 같은 블록이면 onReorder를 호출하지 않음', async () => {
    const onReorder = vi.fn();
    render(
      <EditorCanvas
        blocks={blocks}
        selectedBlockId={null}
        onSelectBlock={vi.fn()}
        onDeleteBlock={vi.fn()}
        onToggleVisibility={vi.fn()}
        onReorder={onReorder}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'reorder same' }));
    await userEvent.click(screen.getByRole('button', { name: 'reorder no target' }));
    expect(onReorder).not.toHaveBeenCalled();
  });
});
