import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/i18n/messages/en.json';
import { adminPopupsApi, type Popup } from '@/lib/api';
import AdminPopupsPage from '../page';

vi.mock('@/components/shared/hooks/useAdminGuard', () => ({ useAdminGuard: () => ({ isAdmin: true }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/api', () => ({ adminPopupsApi: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() } }));
vi.mock('@/components/shared/admin/ProductImageUploader', () => ({ default: () => null }));

const popup: Popup = {
  id: 1, title: 'Autumn', imageUrl: 'https://example.com/image.png', linkUrl: '/products',
  sortOrder: 0, isActive: false, startsAt: null, endsAt: null,
  createdAt: '2026-10-23T00:00:00Z', updatedAt: '2026-10-23T00:00:00Z',
};

function renderPage() {
  return render(<NextIntlClientProvider locale="en" messages={messages}><AdminPopupsPage /></NextIntlClientProvider>);
}

describe('AdminPopupsPage', () => {
  beforeEach(() => {
    vi.mocked(adminPopupsApi.getAll).mockResolvedValue([popup]);
  });

  it('creates inactive popups and converts local schedules to ISO timestamps', async () => {
    vi.mocked(adminPopupsApi.create).mockResolvedValue({ ...popup, id: 2, title: 'New event' });
    renderPage();
    await screen.findByText('Autumn');
    fireEvent.click(screen.getByRole('button', { name: 'New popup' }));
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByLabelText('Active')).not.toBeChecked();
    fireEvent.change(dialog.getByLabelText('Title'), { target: { value: 'New event' } });
    fireEvent.change(dialog.getByLabelText('Image URL'), { target: { value: popup.imageUrl } });
    fireEvent.change(dialog.getByLabelText('Publication start'), { target: { value: '2026-11-01T10:00' } });
    fireEvent.change(dialog.getByLabelText('Publication end'), { target: { value: '2026-11-02T10:00' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(adminPopupsApi.create).toHaveBeenCalledWith({
      title: 'New event', imageUrl: popup.imageUrl, linkUrl: null, sortOrder: 0, isActive: false,
      startsAt: new Date('2026-11-01T10:00').toISOString(), endsAt: new Date('2026-11-02T10:00').toISOString(),
    }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('rejects inverted dates, retains failed edits, then saves cleared schedule fields', async () => {
    const { toast } = await import('sonner');
    vi.mocked(adminPopupsApi.update).mockRejectedValueOnce(new Error('Save failed')).mockResolvedValue({ ...popup, title: 'Changed', isActive: true });
    renderPage();
    await screen.findByText('Autumn');
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Changed' } });
    fireEvent.change(screen.getByLabelText('Publication start'), { target: { value: '2026-11-02T10:00' } });
    fireEvent.change(screen.getByLabelText('Publication end'), { target: { value: '2026-11-01T10:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(messages.popups.invalidDates));
    expect(adminPopupsApi.update).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Publication start'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Publication end'), { target: { value: '' } });
    fireEvent.click(screen.getByLabelText('Active'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Save failed'));
    expect(screen.getByLabelText('Title')).toHaveValue('Changed');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(adminPopupsApi.update).toHaveBeenLastCalledWith(1, {
      title: 'Changed', imageUrl: popup.imageUrl, linkUrl: '/products', isActive: true, sortOrder: 0, startsAt: null, endsAt: null,
    });
  });

  it('retries list errors and requires confirmation before deleting', async () => {
    vi.mocked(adminPopupsApi.getAll).mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValue([popup]);
    vi.mocked(adminPopupsApi.remove).mockResolvedValue(undefined);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    await screen.findByText('Autumn');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(adminPopupsApi.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await screen.findByText('No popups yet.');
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(adminPopupsApi.remove).toHaveBeenCalledWith(1);
  });
});
