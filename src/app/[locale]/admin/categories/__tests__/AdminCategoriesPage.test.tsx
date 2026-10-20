import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminCategoriesPage from '../page';
import type { AdminCategory } from '@/lib/api';

const mocks = vi.hoisted(() => ({ getAll: vi.fn(), reorder: vi.fn() }));
vi.mock('@/lib/api', () => ({ adminCategoriesApi: mocks }));
vi.mock('@/components/shared/hooks/useAdminGuard', () => ({ useAdminGuard: () => ({ isAdmin: true, isLoading: false }) }));
vi.mock('@/components/shared/admin/CategoryFormModal', () => ({ default: () => null }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function category(id: number, parentId: number | null, children: AdminCategory[] = []): AdminCategory {
  return { id, parentId, name: `Category ${id}`, slug: `category-${id}`, sortOrder: 0, isActive: true, children, imageUrl: null, createdAt: '2026-10-20', updatedAt: '2026-10-20' };
}

function row(id: number) {
  return within(screen.getByText(`Category ${id}`).closest('tr')!);
}

describe('AdminCategoriesPage nested sibling order', () => {
  beforeEach(() => {
    mocks.getAll.mockReset();
    mocks.reorder.mockReset().mockResolvedValue(undefined);
    mocks.getAll.mockResolvedValue([category(1, null, [category(2, 1, [category(4, 2), category(5, 2)]), category(3, 1)])]);
  });

  it('renders correct second and third level bounds and normalizes duplicate sort orders on move', async () => {
    render(<AdminCategoriesPage />);
    await screen.findByText('Category 1');
    fireEvent.click(row(1).getAllByRole('button')[1]);
    expect(row(2).getByLabelText('위로 이동')).toBeDisabled();
    expect(row(2).getByLabelText('아래로 이동')).toBeEnabled();
    expect(row(3).getByLabelText('아래로 이동')).toBeDisabled();
    fireEvent.click(row(2).getAllByRole('button')[0]);
    expect(row(4).getByLabelText('위로 이동')).toBeDisabled();
    expect(row(5).getByLabelText('아래로 이동')).toBeDisabled();
    fireEvent.click(row(5).getByLabelText('위로 이동'));
    await waitFor(() => expect(mocks.reorder).toHaveBeenCalledWith([{ id: 5, sortOrder: 0 }, { id: 4, sortOrder: 1 }]));
    await waitFor(() => expect(mocks.getAll).toHaveBeenCalledTimes(2));
    fireEvent.click(row(2).getByLabelText('아래로 이동'));
    await waitFor(() => expect(mocks.reorder).toHaveBeenLastCalledWith([{ id: 3, sortOrder: 0 }, { id: 2, sortOrder: 1 }]));
  });
});
