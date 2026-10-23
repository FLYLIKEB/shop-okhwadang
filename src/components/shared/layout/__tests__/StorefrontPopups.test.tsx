import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StorefrontPopups from '../StorefrontPopups';

const { getList, toastError } = vi.hoisted(() => ({ getList: vi.fn(), toastError: vi.fn() }));
vi.mock('@/lib/api', () => ({ popupsApi: { getList } }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn() } }));
vi.mock('@/contexts/GlobalLoadingContext', () => ({ useGlobalLoading: () => ({ startLoading: vi.fn(), stopLoading: vi.fn() }) }));
vi.mock('@/i18n/navigation', () => ({ Link: ({ children, href, onClick }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} onClick={onClick}>{children}</a> }));
vi.mock('next/image', () => ({ default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} /> }));

const items = [
  { id: 1, title: 'First popup', imageUrl: '/first.webp', linkUrl: '/products' },
  { id: 2, title: 'Second popup', imageUrl: '/second.webp', linkUrl: null },
];

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  getList.mockResolvedValue(items);
});
afterEach(cleanup);

describe('StorefrontPopups', () => {
  it('shows one popup at a time and closes with Escape', async () => {
    render(<StorefrontPopups />);
    expect(await screen.findByRole('dialog', { name: 'First popup' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Second popup' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'viewLink' })).toHaveAttribute('href', '/products');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(await screen.findByRole('dialog', { name: 'Second popup' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('remembers hide-today for this popup and shows it again on a later day', async () => {
    const view = render(<StorefrontPopups />);
    await screen.findByRole('dialog', { name: 'First popup' });
    fireEvent.click(screen.getByRole('button', { name: 'hideToday' }));
    expect(JSON.parse(localStorage.getItem('popup-hidden-1')!)).toBe(new Date().toDateString());
    view.unmount();
    const remount = render(<StorefrontPopups />);
    expect(await screen.findByRole('dialog', { name: 'Second popup' })).toBeInTheDocument();
    remount.unmount();
    localStorage.setItem('popup-hidden-1', JSON.stringify('Yesterday'));
    render(<StorefrontPopups />);
    expect(await screen.findByRole('dialog', { name: 'First popup' })).toBeInTheDocument();
  });

  it('contains keyboard focus and restores focus when dismissed', async () => {
    getList.mockResolvedValue([items[0]]);
    render(<><button>Outside</button><StorefrontPopups /></>);
    const outside = screen.getByRole('button', { name: 'Outside' });
    outside.focus();
    await screen.findByRole('dialog');
    const close = screen.getByRole('button', { name: 'close' });
    close.focus();
    fireEvent.keyDown(close, { key: 'Tab' });
    expect(screen.getByRole('link')).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('link'), { key: 'Tab', shiftKey: true });
    expect(close).toHaveFocus();
    fireEvent.click(close);
    expect(outside).toHaveFocus();
  });

  it('still opens and closes when browser storage is unavailable', async () => {
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    render(<StorefrontPopups />);
    await screen.findByRole('dialog', { name: 'First popup' });
    fireEvent.click(screen.getByRole('button', { name: 'hideToday' }));
    expect(await screen.findByRole('dialog', { name: 'Second popup' })).toBeInTheDocument();
    read.mockRestore();
    write.mockRestore();
  });

  it('reports failed loading without blocking the home page', async () => {
    getList.mockRejectedValue(new Error('Unavailable'));
    render(<StorefrontPopups />);
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
