import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AdminAnnouncementBarsPage from '../page';
import { adminAnnouncementBarsApi, type AnnouncementBarItem } from '@/lib/api';

vi.mock('@/components/shared/hooks/useAdminGuard', () => ({ useAdminGuard: () => ({ isAdmin: true }) }));
vi.mock('@/utils/toastMessages', () => ({ toastMessage: (key: string) => key }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/api', () => ({
  adminAnnouncementBarsApi: { getAll: vi.fn(), update: vi.fn() },
}));

const items: AnnouncementBarItem[] = [
  { id: 1, message: 'First', message_en: 'First EN', href: '/products', sort_order: 0, is_active: true, created_at: '2026-10-20T00:00:00Z', updated_at: '2026-10-20T00:00:00Z' },
  { id: 2, message: 'Second', message_en: null, href: null, sort_order: 1, is_active: false, created_at: '2026-10-20T00:00:00Z', updated_at: '2026-10-20T00:00:00Z' },
];

describe('AdminAnnouncementBarsPage', () => {
  it('edits and saves an existing bar, discards cancelled edits and opens a different bar', async () => {
    vi.mocked(adminAnnouncementBarsApi.getAll).mockResolvedValue(items);
    vi.mocked(adminAnnouncementBarsApi.update).mockResolvedValue({
      ...items[0], message: 'Updated', message_en: 'Updated EN', href: '/journal', sort_order: 3,
    });
    render(<AdminAnnouncementBarsPage />);
    await screen.findByText('First');
    fireEvent.click(screen.getAllByRole('button', { name: '수정' })[0]);
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByLabelText('국문 메시지')).toHaveValue('First');
    fireEvent.change(dialog.getByLabelText('국문 메시지'), { target: { value: 'Updated' } });
    fireEvent.change(dialog.getByLabelText('영문 메시지'), { target: { value: 'Updated EN' } });
    fireEvent.change(dialog.getByLabelText('링크 URL'), { target: { value: '/journal' } });
    fireEvent.change(dialog.getByLabelText('정렬 순서'), { target: { value: '3' } });
    expect(dialog.getByLabelText('국문 메시지')).toHaveValue('Updated');
    fireEvent.click(dialog.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(adminAnnouncementBarsApi.update).toHaveBeenCalledWith(1, {
      message: 'Updated', message_en: 'Updated EN', href: '/journal', sort_order: 3, is_active: true,
    });
    const updatedRow = screen.getByText('Updated').closest('tr')!;
    fireEvent.click(within(updatedRow).getByRole('button', { name: '수정' }));
    expect(screen.getByLabelText('국문 메시지')).toHaveValue('Updated');
    fireEvent.change(screen.getByLabelText('국문 메시지'), { target: { value: 'Discard me' } });
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    const secondRow = screen.getByText('Second').closest('tr')!;
    fireEvent.click(within(secondRow).getByRole('button', { name: '수정' }));
    expect(screen.getByLabelText('국문 메시지')).toHaveValue('Second');
    expect(screen.getByLabelText('영문 메시지')).toHaveValue('');
    expect(screen.getByLabelText('링크 URL')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    fireEvent.click(within(updatedRow).getByRole('button', { name: '수정' }));
    expect(screen.getByLabelText('국문 메시지')).toHaveValue('Updated');
    expect(adminAnnouncementBarsApi.update).toHaveBeenCalledTimes(1);
  });
});
