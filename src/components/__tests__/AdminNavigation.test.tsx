import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import { AdminHeader } from '../AdminHeader';
import { AdminSidebar } from '../AdminSidebar';
import ko from '@/i18n/messages/ko.json';
import en from '@/i18n/messages/en.json';

const state = vi.hoisted(() => ({ pathname: '/ko/admin/faqs', role: 'admin' }));
vi.mock('next/navigation', () => ({ usePathname: () => state.pathname }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Operator', role: state.role }, logout: vi.fn() }),
}));
vi.mock('@/lib/api', () => ({
  adminInquiriesApi: { getAll: vi.fn(() => new Promise(() => undefined)) },
  adminOrdersApi: { getList: vi.fn(() => new Promise(() => undefined)) },
}));

describe.each([['ko', ko], ['en', en]] as const)('admin navigation (%s)', (locale, messages) => {
  it.each(['admin', 'super_admin'])('opens FAQ from CMS and preserves log visibility for %s', (role) => {
    state.role = role;
    state.pathname = `/${locale}/admin/dashboard`;
    render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <AdminSidebar open={false} onClose={vi.fn()} />
      </NextIntlClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: messages.admin.sidebar.cmsGroup }));
    expect(screen.getByRole('link', { name: messages.admin.sidebar.faqs })).toHaveAttribute('href', '/admin/faqs');
    fireEvent.click(screen.getByRole('button', { name: messages.admin.sidebar.operationsGroup }));
    if (role === 'super_admin') {
      expect(screen.getByRole('link', { name: messages.admin.sidebar.logs })).toHaveAttribute('href', '/admin/logs');
    } else {
      expect(screen.queryByRole('link', { name: messages.admin.sidebar.logs })).not.toBeInTheDocument();
    }
  });

  it('expands the CMS group when opening FAQ directly', () => {
    state.role = 'admin';
    state.pathname = `/${locale}/admin/faqs`;
    render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <AdminSidebar open={false} onClose={vi.fn()} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole('link', { name: messages.admin.sidebar.faqs })).toHaveAttribute('href', '/admin/faqs');
  });

  it.each([
    ['faqs', 'faqs'],
    ['announcement-bars', 'announcementBars'],
    ['journal/42/edit', 'journal'],
    ['logs', 'logs'],
  ] as const)('labels /admin/%s with its actual section', (route, key) => {
    state.role = 'super_admin';
    state.pathname = `/${locale}/admin/${route}`;
    render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <AdminHeader onMenuClick={vi.fn()} />
      </NextIntlClientProvider>,
    );
    const header = within(screen.getByRole('banner'));
    expect(header.getByText(messages.admin.common.sections[key])).toBeInTheDocument();
    expect(header.queryByText(messages.admin.common.sections.dashboard)).not.toBeInTheDocument();
  });
});
