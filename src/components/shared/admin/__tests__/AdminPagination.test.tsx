import { localMessage } from '@/utils/localMessages';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AdminPagination, { getAdminPaginationItems } from '@/components/shared/admin/AdminPagination';

describe('AdminPagination', () => {
  it('compacts large page ranges with ellipsis and edge controls', () => {
    expect(getAdminPaginationItems(50, 100)).toEqual([1, 'ellipsis', 49, 50, 51, 'ellipsis', 100]);

    render(<AdminPagination currentPage={50} totalPages={100} onPageChange={vi.fn()} />);

    expect(screen.getByText(localMessage('admin.common.pagination.status', { current: 50, total: 100 }))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: localMessage('admin.common.pagination.first') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: localMessage('admin.common.pagination.last') })).toBeInTheDocument();
    expect(screen.getAllByText('…')).toHaveLength(2);
  });
});
