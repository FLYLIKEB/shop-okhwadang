import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ThemeEditor from '../ThemeEditor';
import type { SiteSetting } from '@/lib/api';
import userEvent from '@testing-library/user-event';

const { mockRevalidate, mockRefresh } = vi.hoisted(() => ({ mockRevalidate: vi.fn().mockResolvedValue(undefined), mockRefresh: vi.fn() }));
vi.mock('../actions', () => ({ revalidateTheme: mockRevalidate }));
vi.mock('next-intl', async () => {
  const { default: messages } = await import('@/i18n/messages/ko.json');
  return { useTranslations: () => (key: string, values?: Record<string, string>) => {
    let message = messages.admin.settings[key as keyof typeof messages.admin.settings] ?? key;
    for (const [name, value] of Object.entries(values ?? {})) message = message.replace(`{${name}}`, value);
    return message;
  } };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: mockRefresh }),
  usePathname: () => '/admin/settings/theme',
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/shared/hooks/useUnsavedChanges', () => ({
  useUnsavedChanges: vi.fn(),
}));

const mockBulkUpdate = vi.fn().mockResolvedValue([]);
const mockReset = vi.fn().mockResolvedValue({ message: 'ok' });
const mockGetAll = vi.fn().mockResolvedValue([]);

vi.mock('@/lib/api', () => ({
  settingsApi: { getAll: (...args: unknown[]) => mockGetAll(...args) },
  adminSettingsApi: {
    bulkUpdate: (...args: unknown[]) => mockBulkUpdate(...args),
    reset: (...args: unknown[]) => mockReset(...args),
  },
}));

const makeSetting = (overrides: Partial<SiteSetting> = {}): SiteSetting => ({
  id: 1,
  key: 'color_primary',
  value: '#000000',
  valueEn: null,
  group: 'color',
  label: 'Primary Color',
  inputType: 'color',
  options: null,
  defaultValue: '#000000',
  sortOrder: 1,
  ...overrides,
});

const colorSettings: SiteSetting[] = [
  makeSetting({ id: 1, key: 'color_primary', label: 'Primary Color', value: '#111111' }),
  makeSetting({ id: 2, key: 'color_secondary', label: 'Secondary Color', value: '#222222' }),
];

const typographySettings: SiteSetting[] = [
  makeSetting({
    id: 3,
    key: 'font_size_base',
    label: 'Base Font Size',
    value: '16px',
    group: 'typography',
    inputType: 'text',
  }),
];

const allSettings = [...colorSettings, ...typographySettings];

describe('ThemeEditor', () => {
  it('handles numeric settings returned by the API JSON serializer on load and reset', async () => {
    const serialized = JSON.parse(JSON.stringify([
      makeSetting({ key: 'font_weight_normal', label: 'Weight', value: '400', valueEn: '500', defaultValue: '400', group: 'typography', inputType: 'number' }),
    ], (_key, value) => typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value)) as SiteSetting[];
    render(<ThemeEditor initialSettings={serialized} />);
    fireEvent.click(screen.getByRole('tab', { name: '타이포그래피' }));
    expect(screen.getByLabelText('Weight')).toHaveValue(400);
    fireEvent.change(screen.getByLabelText('미리보기 언어'), { target: { value: 'en' } });
    expect(screen.getByRole('region', { name: '라이브 프리뷰' })).toHaveStyle({ fontWeight: '500' });
    mockGetAll.mockResolvedValueOnce(serialized);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByText('기본값으로 초기화'));
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(screen.getByLabelText('Weight (EN)')).toHaveValue('500');
  });
  it.each([['#abc', '#aabbcc'], ['#abcd', '#aabbcc'], ['#12345680', '#123456'], ['rgb(255, 0, 16)', '#ff0010']])('keeps the color picker in sync for %s', (value, hex) => {
    render(<ThemeEditor initialSettings={allSettings} />);
    fireEvent.change(screen.getByLabelText('Primary Color 값'), { target: { value } });
    expect(screen.getByLabelText('Primary Color')).toHaveValue(hex);
    expect(screen.getByLabelText('Primary Color 값')).toHaveValue(value);
  });
  it('previews persisted dark colors even when the document is light', () => {
    render(<ThemeEditor initialSettings={[
      ...allSettings,
      makeSetting({ key: 'color_dark_primary', group: 'color_dark', value: '#abcdef' }),
      makeSetting({ key: 'color_dark_destructive_foreground', group: 'color_dark', value: '#123456' }),
    ]} />);
    fireEvent.click(screen.getByRole('tab', { name: '다크 색상' }));
    expect(screen.getByRole('button', { name: 'Primary 버튼' })).toHaveStyle({ background: '#abcdef' });
    expect(screen.getByRole('button', { name: 'Destructive 버튼' })).toHaveStyle({ color: '#123456' });
  });

  it('previews base and English typography, spacing and radius without changing document styles', () => {
    render(<ThemeEditor initialSettings={[
      ...allSettings,
      makeSetting({ key: 'spacing_md', value: '24px', group: 'spacing', inputType: 'text' }),
      makeSetting({ key: 'radius_lg', value: '12px', group: 'radius', inputType: 'text' }),
    ]} />);
    fireEvent.click(screen.getByRole('tab', { name: '타이포그래피' }));
    fireEvent.change(screen.getByLabelText('Base Font Size'), { target: { value: '18px' } });
    fireEvent.change(screen.getByLabelText('Base Font Size (EN)'), { target: { value: '20px' } });
    const preview = screen.getByRole('region', { name: '라이브 프리뷰' });
    expect(preview).toHaveStyle({ fontSize: '18px', padding: '24px', borderRadius: '12px' });
    fireEvent.change(screen.getByLabelText('미리보기 언어'), { target: { value: 'en' } });
    expect(preview).toHaveStyle({ fontSize: '20px' });
    fireEvent.change(screen.getByLabelText('Base Font Size (EN)'), { target: { value: '' } });
    expect(preview).toHaveStyle({ fontSize: '18px' });
    expect(document.documentElement.style.getPropertyValue('--db-font-size-base')).toBe('');
  });

  it('blocks invalid base and English values and allows reverting to the saved value', async () => {
    render(<ThemeEditor initialSettings={allSettings} />);
    fireEvent.change(screen.getByLabelText('Primary Color 값'), { target: { value: '#12345' } });
    expect(screen.getByText('저장')).toBeDisabled();
    expect(screen.getByText('유효한 CSS 값을 입력해 주세요.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Primary Color 값'), { target: { value: '#111111' } });
    expect(screen.getByText('저장')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Primary Color (EN)'), { target: { value: '#abcdef' } });
    fireEvent.change(screen.getByLabelText('미리보기 언어'), { target: { value: 'en' } });
    expect(within(screen.getByRole('region', { name: '라이브 프리뷰' })).getByText('Primary 버튼')).toHaveStyle({ background: '#abcdef' });
    fireEvent.click(screen.getByText('저장'));
    await waitFor(() => expect(mockBulkUpdate).toHaveBeenCalledWith([{ key: 'color_primary', valueEn: '#abcdef' }]));
  });

  it('keeps edits on reset failure and does nothing when reset is cancelled', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ThemeEditor initialSettings={allSettings} />);
    fireEvent.change(screen.getByLabelText('Primary Color 값'), { target: { value: '#abcdef' } });
    fireEvent.click(screen.getByText('기본값으로 초기화'));
    expect(mockReset).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    mockReset.mockRejectedValueOnce(new Error('reset failed'));
    fireEvent.click(screen.getByText('기본값으로 초기화'));
    await waitFor(() => expect(screen.getByText('저장')).not.toBeDisabled());
    expect(screen.getByLabelText('Primary Color 값')).toHaveValue('#abcdef');
    expect(mockRefresh).not.toHaveBeenCalled();
  });
  it.each([false, true])('locks color, Korean and English inputs and reset while saving (failure: %s)', async (fails) => {
    const user = userEvent.setup();
    let settle!: () => void;
    mockBulkUpdate.mockImplementationOnce(() => new Promise((resolve, reject) => {
      settle = () => fails ? reject(new Error('save failed')) : resolve([]);
    }));
    render(<ThemeEditor initialSettings={allSettings} />);
    fireEvent.change(screen.getByLabelText('Primary Color 값'), { target: { value: '#abcdef' } });
    fireEvent.click(screen.getByText('타이포그래피'));
    const font = screen.getByLabelText('Base Font Size');
    const fontEn = screen.getByLabelText('Base Font Size (EN)');
    fireEvent.change(font, { target: { value: '18px' } });
    fireEvent.change(fontEn, { target: { value: '20px' } });
    await user.click(screen.getByText('저장'));
    expect(font).toBeDisabled();
    expect(fontEn).toBeDisabled();
    await user.type(font, 'newer');
    await user.type(fontEn, 'newer');
    expect(font).toHaveValue('18px');
    expect(fontEn).toHaveValue('20px');
    expect(screen.getByText('기본값으로 초기화')).toBeDisabled();
    await user.click(screen.getByText('기본값으로 초기화'));
    expect(mockReset).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('라이트 색상'));
    for (const label of ['Primary Color', 'Primary Color 값', 'Secondary Color', 'Secondary Color 값']) {
      expect(screen.getByLabelText(label)).toBeDisabled();
    }
    settle();
    await waitFor(() => expect(screen.getByLabelText('Primary Color 값')).not.toBeDisabled());
    expect(screen.getByLabelText('Primary Color 값')).toHaveValue('#abcdef');
    expect(screen.getByText('저장').hasAttribute('disabled')).toBe(!fails);
    fireEvent.click(screen.getByText('타이포그래피'));
    expect(screen.getByLabelText('Base Font Size')).toHaveValue('18px');
    expect(screen.getByLabelText('Base Font Size (EN)')).toHaveValue('20px');
    expect(mockBulkUpdate).toHaveBeenCalledWith([
      { key: 'color_primary', value: '#abcdef' },
      { key: 'font_size_base', value: '18px', valueEn: '20px' },
    ]);
  });

  it('locks editing and saving until reset and reload finish', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    let finishReload!: (settings: SiteSetting[]) => void;
    mockGetAll.mockImplementationOnce(() => new Promise((resolve) => { finishReload = resolve; }));
    render(<ThemeEditor initialSettings={allSettings} />);
    fireEvent.change(screen.getByLabelText('Primary Color 값'), { target: { value: '#abcdef' } });
    fireEvent.click(screen.getByText('기본값으로 초기화'));
    await waitFor(() => expect(mockGetAll).toHaveBeenCalled());
    expect(screen.getByText('저장')).toBeDisabled();
    expect(screen.getByLabelText('Primary Color 값')).toBeDisabled();
    finishReload(allSettings);
    await waitFor(() => expect(screen.getByLabelText('Primary Color 값')).not.toBeDisabled());
    expect(screen.getByLabelText('Primary Color 값')).toHaveValue('#111111');
    expect(mockBulkUpdate).not.toHaveBeenCalled();
    expect(document.documentElement.style.getPropertyValue('--db-color-primary')).toBe('');
  });

  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.style.removeProperty('--db-color-primary');
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  it('renders tabs', () => {
    render(<ThemeEditor initialSettings={[]} />);
    expect(screen.getByText('라이트 색상')).toBeInTheDocument();
    expect(screen.getByText('다크 색상')).toBeInTheDocument();
    expect(screen.getByText('타이포그래피')).toBeInTheDocument();
    expect(screen.getByText('간격')).toBeInTheDocument();
    expect(screen.getByText('모서리')).toBeInTheDocument();
  });

  it('restores existing inline styles when leaving with unsaved preview edits', () => {
    document.documentElement.style.setProperty('--db-color-primary', '#123456');
    const { unmount } = render(<ThemeEditor initialSettings={allSettings} />);
    fireEvent.change(screen.getAllByPlaceholderText('#000000')[0], { target: { value: '#abcdef' } });
    expect(document.documentElement.style.getPropertyValue('--db-color-primary')).toBe('#123456');
    unmount();
    expect(document.documentElement.style.getPropertyValue('--db-color-primary')).toBe('#123456');
    document.documentElement.style.removeProperty('--db-color-primary');
  });

  it('cleans preview after successful save and revalidates before refreshing', async () => {
    render(<ThemeEditor initialSettings={allSettings} />);
    fireEvent.change(screen.getAllByPlaceholderText('#000000')[0], { target: { value: '#abcdef' } });
    fireEvent.click(screen.getByText('저장'));
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(mockRevalidate.mock.invocationCallOrder[0]).toBeLessThan(mockRefresh.mock.invocationCallOrder[0]);
    expect(document.documentElement.style.getPropertyValue('--db-color-primary')).toBe('');
  });

  it('cleans preview on exit after a failed save', async () => {
    mockBulkUpdate.mockRejectedValueOnce(new Error('save failed'));
    const { unmount } = render(<ThemeEditor initialSettings={allSettings} />);
    fireEvent.change(screen.getAllByPlaceholderText('#000000')[0], { target: { value: '#abcdef' } });
    fireEvent.click(screen.getByText('저장'));
    await waitFor(() => expect(screen.getByText('저장')).not.toBeDisabled());
    unmount();
    expect(document.documentElement.style.getPropertyValue('--db-color-primary')).toBe('');
  });

  it('shows empty state when no settings match active tab', () => {
    render(<ThemeEditor initialSettings={[]} />);
    expect(screen.getByText('설정 항목이 없습니다.')).toBeInTheDocument();
  });

  it('renders color settings in color tab', () => {
    render(<ThemeEditor initialSettings={allSettings} />);
    expect(screen.getAllByText('Primary Color').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Secondary Color').length).toBeGreaterThan(0);
  });

  it('switches tabs and shows filtered settings', () => {
    render(<ThemeEditor initialSettings={allSettings} />);
    fireEvent.click(screen.getByText('타이포그래피'));
    expect(screen.getByText('Base Font Size')).toBeInTheDocument();
    expect(screen.queryByLabelText('Primary Color 값')).not.toBeInTheDocument();
  });

  it('save button is disabled when no changes', () => {
    render(<ThemeEditor initialSettings={allSettings} />);
    const saveButton = screen.getByText('저장');
    expect(saveButton).toBeDisabled();
  });

  it('save button enables after a change and calls API', async () => {
    render(<ThemeEditor initialSettings={allSettings} />);
    const hexInputs = screen.getAllByPlaceholderText('#000000');
    fireEvent.change(hexInputs[0], { target: { value: '#ff0000' } });

    const saveButton = screen.getByText('저장');
    expect(saveButton).not.toBeDisabled();

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockBulkUpdate).toHaveBeenCalledWith([
        { key: 'color_primary', value: '#ff0000' },
      ]);
    });
  });

  it('renders preview panel', () => {
    render(<ThemeEditor initialSettings={[]} />);
    expect(screen.getByText(/라이브 프리뷰/)).toBeInTheDocument();
    expect(screen.getByText('Primary 버튼')).toBeInTheDocument();
  });
});
