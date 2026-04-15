import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import CategoryFormModal from '@/components/shared/admin/CategoryFormModal';
import type { AdminCategory } from '@/lib/api';

const mockCategories: AdminCategory[] = [
  {
    id: 1,
    name: '패션',
    slug: 'fashion',
    parentId: null,
    sortOrder: 0,
    isActive: true,
    imageUrl: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    children: [],
  },
];

describe('CategoryFormModal', () => {
  it('open=false → 렌더링하지 않음', () => {
    render(
      <CategoryFormModal
        open={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        categories={[]}
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('open=true → 폼 렌더링', () => {
    render(
      <CategoryFormModal
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        categories={mockCategories}
      />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/카테고리명/)).toBeInTheDocument();
    expect(screen.getByLabelText(/slug/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '추가' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument();
  });

  it('initial 있으면 수정 모달 타이틀 + 기존 값 채워짐', () => {
    render(
      <CategoryFormModal
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        categories={mockCategories}
        initial={mockCategories[0]}
      />,
    );
    expect(screen.getByText('카테고리 수정')).toBeInTheDocument();
    expect(screen.getByDisplayValue('패션')).toBeInTheDocument();
    expect(screen.getByDisplayValue('fashion')).toBeInTheDocument();
  });

  it('취소 버튼 클릭 → onClose 호출', async () => {
    const onClose = vi.fn();
    render(
      <CategoryFormModal
        open={true}
        onClose={onClose}
        onSubmit={vi.fn()}
        categories={[]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('빈 폼 제출 → 검증 에러 표시', async () => {
    render(
      <CategoryFormModal
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        categories={[]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: '추가' }));
    expect(screen.getByText('카테고리명을 입력하세요.')).toBeInTheDocument();
  });

  it('카테고리명 입력 시 slug 자동 생성', async () => {
    render(
      <CategoryFormModal
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        categories={[]}
      />,
    );
    const nameInput = screen.getByLabelText(/카테고리명/);
    await userEvent.type(nameInput, 'Test Category');
    expect(screen.getByDisplayValue('test-category')).toBeInTheDocument();
  });

  it('유효한 폼 제출 → onSubmit 호출', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <CategoryFormModal
        open={true}
        onClose={onClose}
        onSubmit={onSubmit}
        categories={[]}
      />,
    );
    await userEvent.type(screen.getByLabelText(/카테고리명/), '패션');
    // Korean chars are stripped from auto-slug; manually set slug
    const slugInput = screen.getByLabelText(/slug/i);
    await userEvent.clear(slugInput);
    await userEvent.type(slugInput, 'fashion');
    await userEvent.click(screen.getByRole('button', { name: '추가' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: '패션', slug: 'fashion' }),
    );
  });

  it('상위 카테고리 목록 렌더링', () => {
    render(
      <CategoryFormModal
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        categories={mockCategories}
      />,
    );
    expect(screen.getByRole('option', { name: '패션' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '없음 (최상위)' })).toBeInTheDocument();
  });
});
