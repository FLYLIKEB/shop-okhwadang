import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AdminPagination, { getAdminPaginationItems } from '@/components/shared/admin/AdminPagination';

describe('AdminPagination', () => {
  it('compacts large page ranges with ellipsis and edge controls', () => {
    expect(getAdminPaginationItems(50, 100)).toEqual([1, 'ellipsis', 49, 50, 51, 'ellipsis', 100]);

    render(<AdminPagination currentPage={50} totalPages={100} onPageChange={vi.fn()} />);

    expect(screen.getByText('50 / 100 페이지')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '처음' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '끝' })).toBeInTheDocument();
    expect(screen.getAllByText('…')).toHaveLength(2);
  });
});
