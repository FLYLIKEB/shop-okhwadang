import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BlockPropertyPanel from '@/components/shared/admin/page-editor/BlockPropertyPanel';
import type { DraftBlock } from '@/components/shared/admin/page-editor/SortableBlockItem';

describe('BlockPropertyPanel', () => {
  it('색상 카드 리스트 항목을 추가하고 편집한다', () => {
    const onUpdateContent = vi.fn();
    const block: DraftBlock = {
      id: 2,
      type: 'color_card_list',
      content: { layout: 'alternating', items: [] },
      sort_order: 0,
      is_visible: true,
    };

    render(<BlockPropertyPanel block={block} onUpdateContent={onUpdateContent} />);

    fireEvent.click(screen.getByText('+ 항목 추가'));

    expect(onUpdateContent).toHaveBeenLastCalledWith(
      2,
      expect.objectContaining({
        items: [expect.objectContaining({ color: '#8B4513' })],
      }),
    );
  });

  it('이미지 카드 그리드 열 수를 content.columns 숫자로 저장한다', () => {
    const onUpdateContent = vi.fn();
    const block: DraftBlock = {
      id: 3,
      type: 'image_card_grid',
      content: { columns: 3, items: [] },
      sort_order: 0,
      is_visible: true,
    };

    render(<BlockPropertyPanel block={block} onUpdateContent={onUpdateContent} />);

    fireEvent.change(screen.getByLabelText('열 수'), { target: { value: '4' } });

    expect(onUpdateContent).toHaveBeenLastCalledWith(3, expect.objectContaining({ columns: 4 }));
  });

  it('프로모션 배너 종료일은 렌더러 계약인 end_date로 저장한다', async () => {
    const onUpdateContent = vi.fn();
    const block: DraftBlock = {
      id: 1,
      type: 'promotion_banner',
      content: {
        title: '타이머 프로모션',
        template: 'timer',
        expires_at: '2026-01-01',
      },
      sort_order: 0,
      is_visible: true,
    };

    render(<BlockPropertyPanel block={block} onUpdateContent={onUpdateContent} />);

    fireEvent.change(screen.getByLabelText('종료일'), {
      target: { value: '2026-12-31' },
    });

    expect(onUpdateContent).toHaveBeenLastCalledWith(
      1,
      expect.objectContaining({ end_date: '2026-12-31' }),
    );
    expect(onUpdateContent).toHaveBeenLastCalledWith(
      1,
      expect.not.objectContaining({ expires_at: expect.any(String) }),
    );
  });
});
