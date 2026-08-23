import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@/components/shared/admin/AdminStates';

describe('AdminStates', () => {
  it('renders loading with polite status semantics and skeleton shimmer', () => {
    render(<AdminLoadingState title="로딩 중" description="잠시만 기다려 주세요" />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('로딩 중')).toBeInTheDocument();
    expect(screen.getByText('잠시만 기다려 주세요')).toBeInTheDocument();
    expect(status.querySelector('.animate-skeleton-shimmer')).toBeInTheDocument();
  });

  it('renders empty icon, title, description, action slot, and class override', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <AdminEmptyState
        title="항목 없음"
        description="등록된 항목이 없습니다."
        action={<button type="button" onClick={onClick}>추가</button>}
        className="border-0 p-4"
      />,
    );

    const status = screen.getByRole('status');
    expect(status).toHaveClass('border-0');
    expect(status).toHaveClass('p-4');
    expect(screen.getByText('항목 없음')).toBeInTheDocument();
    expect(screen.getByText('등록된 항목이 없습니다.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '추가' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders errors as alerts while preserving the action slot', () => {
    render(<AdminErrorState title="오류 발생" description="다시 시도해 주세요" action={<button type="button">재시도</button>} />);

    expect(screen.getByRole('alert')).toHaveClass('border-destructive/30');
    expect(screen.getByText('오류 발생')).toBeInTheDocument();
    expect(screen.getByText('다시 시도해 주세요')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '재시도' })).toBeInTheDocument();
  });
});
