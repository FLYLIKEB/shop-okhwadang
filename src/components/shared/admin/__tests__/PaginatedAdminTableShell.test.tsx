import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PaginatedAdminTableShell } from '@/components/shared/admin/PaginatedAdminTableShell';

function renderShell(overrides: Partial<React.ComponentProps<typeof PaginatedAdminTableShell>> = {}) {
  const onPageChange = vi.fn();
  render(
    <PaginatedAdminTableShell
      loading={false}
      currentPage={1}
      totalPages={3}
      onPageChange={onPageChange}
      {...overrides}
    >
      <div>table body</div>
    </PaginatedAdminTableShell>,
  );

  return { onPageChange };
}

describe('PaginatedAdminTableShell', () => {
  it('renders loading state and hides table body and pagination while loading', () => {
    renderShell({ loading: true, loadingMessage: '목록 로딩 중' });

    expect(screen.getByRole('status')).toHaveTextContent('목록 로딩 중');
    expect(screen.queryByText('table body')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('renders empty state with action and hides table body', () => {
    renderShell({ isEmpty: true, emptyMessage: '항목이 없습니다.', emptyAction: <button type="button">생성</button> });

    expect(screen.getByRole('status')).toHaveTextContent('항목이 없습니다.');
    expect(screen.getByRole('button', { name: '생성' })).toBeInTheDocument();
    expect(screen.queryByText('table body')).not.toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('renders children and passes page changes to pagination when populated', async () => {
    const user = userEvent.setup();
    const { onPageChange } = renderShell({ currentPage: 2, totalPages: 3 });

    expect(screen.getByText('table body')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '다음' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
