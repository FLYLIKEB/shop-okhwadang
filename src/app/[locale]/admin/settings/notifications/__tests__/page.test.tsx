import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import ko from '@/i18n/messages/ko.json';
import { adminNotificationTemplatesApi, type NotificationTemplate } from '@/lib/api';
import NotificationTemplatesPage from '../page';

vi.mock('@/components/shared/hooks/useAdminGuard', () => ({ useAdminGuard: () => ({ isAdmin: true }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/api', () => ({ adminNotificationTemplatesApi: {
  getAll: vi.fn(), update: vi.fn(), preview: vi.fn(), createRevision: vi.fn(), getProvider: vi.fn(), requestInspection: vi.fn(),
} }));

const email: NotificationTemplate = { key: 'ORDER_CONFIRMED', channel: 'email', locale: 'ko', subject: 'Subject', html: '<h1>{{name}}</h1>', text: 'Hello {{name}}', templateId: '', variables: ['name'], updatedAt: null };
const alimtalk: NotificationTemplate = { ...email, key: 'ORDER_CREATED', channel: 'alimtalk', subject: '', html: '', templateId: 'active-id' };
const copy = ko.admin.notificationTemplates;
const mount = () => render(<NextIntlClientProvider locale="ko" messages={ko}><NotificationTemplatesPage /></NextIntlClientProvider>);

beforeEach(() => {
  vi.mocked(adminNotificationTemplatesApi.getAll).mockResolvedValue([email, alimtalk]);
  vi.mocked(adminNotificationTemplatesApi.update).mockImplementation(async (template, content) => ({ ...template, ...content }));
});

describe('notification template editor', () => {
  it('saves edited HTML and retains dirty input when saving fails', async () => {
    mount();
    const html = await screen.findByLabelText(copy.html);
    fireEvent.change(html, { target: { value: '<h2>New design</h2>' } });
    vi.mocked(adminNotificationTemplatesApi.update).mockRejectedValueOnce(new Error('failed'));
    fireEvent.click(screen.getByRole('button', { name: copy.save }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(html).toHaveValue('<h2>New design</h2>');
    expect(screen.getByText(copy.unsaved)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: copy.save }));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(adminNotificationTemplatesApi.update).toHaveBeenLastCalledWith(email, { subject: email.subject, html: '<h2>New design</h2>', text: email.text, templateId: '' });
    expect(screen.queryByText(copy.unsaved)).not.toBeInTheDocument();
  });

  it('opens immediately and confines rendered HTML to a scriptless, isolated iframe', async () => {
    const popupDocument = document.implementation.createHTMLDocument();
    const popup = { document: popupDocument, closed: false, opener: window, close: vi.fn() };
    const open = vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
    let resolvePreview!: (value: { subject: string; html: string; text: string }) => void;
    vi.mocked(adminNotificationTemplatesApi.preview).mockImplementationOnce(() => new Promise((resolve) => { resolvePreview = resolve; }));
    mount();
    fireEvent.click(await screen.findByRole('button', { name: copy.preview }));
    expect(open).toHaveBeenCalledWith('about:blank', '_blank');
    expect(popup.opener).toBeNull();
    expect(popupDocument.body.textContent).toBe(copy.loading);
    resolvePreview({ subject: '<img src=x onerror=alert(1)>', html: '<script>window.opener.alert(1)</script><h1>Preview</h1>', text: 'Preview' });
    await waitFor(() => expect(popupDocument.querySelector('iframe')).not.toBeNull());
    const iframe = popupDocument.querySelector('iframe')!;
    expect(iframe.getAttribute('sandbox')).toBe('');
    expect(iframe.srcdoc).toContain('Content-Security-Policy');
    expect(iframe.srcdoc).toContain('<h1>Preview</h1>');
    expect(popupDocument.querySelector('script')).toBeNull();
    expect(popupDocument.querySelector('img')).toBeNull();
    expect(adminNotificationTemplatesApi.update).not.toHaveBeenCalled();
  });

  it('reports blocked popups without calling the preview endpoint', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    mount();
    fireEvent.click(await screen.findByRole('button', { name: copy.preview }));
    expect(toast.error).toHaveBeenCalledWith(copy.popupBlocked);
    expect(adminNotificationTemplatesApi.preview).not.toHaveBeenCalled();
  });

  it('closes the blank window after preview failure and keeps the draft', async () => {
    const popup = { document: document.implementation.createHTMLDocument(), closed: false, opener: window, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
    vi.mocked(adminNotificationTemplatesApi.preview).mockRejectedValueOnce(new Error('preview failed'));
    mount();
    fireEvent.change(await screen.findByLabelText(copy.subject), { target: { value: 'Draft' } });
    fireEvent.click(screen.getByRole('button', { name: copy.preview }));
    await waitFor(() => expect(popup.close).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalled();
    expect(screen.getByLabelText(copy.subject)).toHaveValue('Draft');
  });

  it('protects unsaved edits when changing templates and leaving the page', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    mount();
    fireEvent.change(await screen.findByLabelText(copy.subject), { target: { value: 'Draft' } });
    fireEvent.change(screen.getByLabelText(copy.channel), { target: { value: 'alimtalk' } });
    expect(confirm).toHaveBeenCalledWith(copy.discard);
    expect(screen.getByLabelText(copy.subject)).toHaveValue('Draft');
    const beforeUnload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(beforeUnload);
    expect(beforeUnload.defaultPrevented).toBe(true);
  });

  it('keeps the active Alimtalk ID during review and applies approval only after explicit save', async () => {
    const revision = { templateId: 'new-id', content: 'New message', status: 'REGISTERED' };
    vi.mocked(adminNotificationTemplatesApi.createRevision).mockResolvedValue(revision);
    vi.mocked(adminNotificationTemplatesApi.requestInspection).mockResolvedValue({ ...revision, status: 'INSPECTING' });
    vi.mocked(adminNotificationTemplatesApi.getProvider).mockResolvedValueOnce(revision).mockResolvedValue({ ...revision, status: 'APPROVED' });
    mount();
    fireEvent.change(await screen.findByLabelText(copy.channel), { target: { value: 'alimtalk' } });
    expect(screen.getByText(copy.alimtalkWarning)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: copy.createRevision }));
    await screen.findByText('new-id');
    expect(screen.getByLabelText(copy.templateId)).toHaveValue('active-id');
    expect(screen.getByRole('button', { name: copy.useApproved })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: copy.requestInspection }));
    await waitFor(() => expect(screen.getByRole('button', { name: copy.requestInspection })).toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: copy.refreshStatus }));
    await waitFor(() => expect(screen.getByRole('button', { name: copy.useApproved })).not.toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: copy.useApproved }));
    expect(screen.getByLabelText(copy.templateId)).toHaveValue('new-id');
    expect(adminNotificationTemplatesApi.update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: copy.save }));
    await waitFor(() => expect(adminNotificationTemplatesApi.update).toHaveBeenCalledWith(expect.objectContaining({ key: alimtalk.key }), expect.objectContaining({ templateId: 'new-id' })));
  });

  it('restores a pending revision after reloading and keeps its ID available when SOLAPI fails', async () => {
    vi.mocked(adminNotificationTemplatesApi.getAll).mockResolvedValueOnce([{ ...alimtalk, pendingTemplateId: 'pending-id' }]);
    vi.mocked(adminNotificationTemplatesApi.getProvider).mockRejectedValueOnce(new Error('unavailable'));
    mount();
    await screen.findByText('pending-id');
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByLabelText(copy.templateId)).toHaveValue('active-id');
    expect(screen.getByRole('button', { name: copy.refreshStatus })).not.toBeDisabled();
  });
});
