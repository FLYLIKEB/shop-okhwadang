import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, renderHook, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { GlobalLoadingProvider } from '@/contexts/GlobalLoadingContext';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import LogsPage from '@/app/[locale]/admin/logs/page';
import LocalizationPage from '@/app/[locale]/admin/localization/page';
import messages from '@/i18n/messages/ko.json';

const { getLogs, getCoverage } = vi.hoisted(() => ({ getLogs: vi.fn(), getCoverage: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/shared/hooks/useAdminGuard', () => ({ useAdminGuard: () => ({ isAdmin: true, user: { role: 'super_admin' } }) }));
vi.mock('@/lib/api', () => ({ adminLogsApi: { get: getLogs }, adminLocalizationApi: { getCoverage } }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function renderPage(page: React.ReactNode) {
  return render(<NextIntlClientProvider locale="ko" messages={messages}><GlobalLoadingProvider>{page}</GlobalLoadingProvider></NextIntlClientProvider>);
}

describe('admin request state', () => {
  beforeEach(() => vi.clearAllMocks());

  it('distinguishes failed coverage from empty results and retries', async () => {
    getCoverage.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ summaries: [], items: [] });
    renderPage(<LocalizationPage />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.queryByText(messages.admin.localization.empty)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: messages.admin.common.retry }));
    await waitFor(() => expect(screen.getByText(messages.admin.localization.empty)).toBeTruthy());
    expect(getCoverage).toHaveBeenCalledTimes(2);
  });

  it.each([false, true])('keeps loading while another execution is pending (failure=%s)', async (fails) => {
    const first = deferred<string>();
    const second = deferred<string>();
    const action = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => useAsyncAction<string>(action), { wrapper: GlobalLoadingProvider });
    let firstRun!: Promise<string>;
    let secondRun!: Promise<string>;
    act(() => { firstRun = result.current.execute(undefined); secondRun = result.current.execute(undefined); });
    await act(async () => { first.resolve('first'); await firstRun; });
    expect(result.current.isLoading).toBe(true);
    await act(async () => { if (fails) second.reject(new Error('failed')); else second.resolve('second'); await secondRun; });
    expect(result.current.isLoading).toBe(false);
  });

  it.each([false, true])('preserves the latest log tab against stale completion (failure=%s)', async (fails) => {
    const normal = deferred<unknown>();
    const error = deferred<unknown>();
    getLogs.mockImplementation(({ type }: { type: string }) => type === 'normal' ? normal.promise : error.promise);
    renderPage(<LogsPage />);
    await waitFor(() => expect(getLogs).toHaveBeenCalledWith(expect.objectContaining({ type: 'normal' })));
    fireEvent.click(screen.getByRole('button', { name: messages.admin.logs.types.error }));
    await waitFor(() => expect(getLogs).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' })));
    const response = (type: string, content: string) => ({ type, app: 'test', lines: 500, content, lineCount: 1, updatedAt: null, source: `test:${type}`, truncated: false });
    await act(async () => { error.resolve(response('error', 'CURRENT_ERROR_LOG')); });
    await act(async () => { if (fails) normal.reject(new Error('stale failure')); else normal.resolve(response('normal', 'STALE_NORMAL_LOG')); });
    expect(screen.getAllByText('CURRENT_ERROR_LOG').length).toBeGreaterThan(0);
    expect(screen.queryByText('STALE_NORMAL_LOG')).toBeNull();
    expect(screen.queryByText('stale failure')).toBeNull();
  });
});
