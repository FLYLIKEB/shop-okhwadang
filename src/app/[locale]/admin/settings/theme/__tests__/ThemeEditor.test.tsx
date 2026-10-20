import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ThemeEditor from '../ThemeEditor';
import type { SiteSetting } from '@/lib/api';
import userEvent from '@testing-library/user-event';

const { mockRevalidate, mockRefresh } = vi.hoisted(() => ({ mockRevalidate: vi.fn().mockResolvedValue(undefined), mockRefresh: vi.fn() }));
vi.mock('../actions', () => ({ revalidateTheme: mockRevalidate }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

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
  key: 'primary_color',
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
  makeSetting({ id: 1, key: 'primary_color', label: 'Primary Color', value: '#111111' }),
  makeSetting({ id: 2, key: 'secondary_color', label: 'Secondary Color', value: '#222222' }),
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
      { key: 'primary_color', value: '#abcdef' },
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
    expect(document.documentElement.style.getPropertyValue('--db-primary-color')).toBe('');
  });

  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.style.removeProperty('--db-primary-color');
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
    document.documentElement.style.setProperty('--db-primary-color', '#123456');
    const { unmount } = render(<ThemeEditor initialSettings={allSettings} />);
    fireEvent.change(screen.getAllByPlaceholderText('#000000')[0], { target: { value: '#abcdef' } });
    expect(document.documentElement.style.getPropertyValue('--db-primary-color')).toBe('#abcdef');
    unmount();
    expect(document.documentElement.style.getPropertyValue('--db-primary-color')).toBe('#123456');
    document.documentElement.style.removeProperty('--db-primary-color');
  });

  it('cleans preview after successful save and revalidates before refreshing', async () => {
    render(<ThemeEditor initialSettings={allSettings} />);
    fireEvent.change(screen.getAllByPlaceholderText('#000000')[0], { target: { value: '#abcdef' } });
    fireEvent.click(screen.getByText('저장'));
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(mockRevalidate.mock.invocationCallOrder[0]).toBeLessThan(mockRefresh.mock.invocationCallOrder[0]);
    expect(document.documentElement.style.getPropertyValue('--db-primary-color')).toBe('');
  });

  it('cleans preview on exit after a failed save', async () => {
    mockBulkUpdate.mockRejectedValueOnce(new Error('save failed'));
    const { unmount } = render(<ThemeEditor initialSettings={allSettings} />);
    fireEvent.change(screen.getAllByPlaceholderText('#000000')[0], { target: { value: '#abcdef' } });
    fireEvent.click(screen.getByText('저장'));
    await waitFor(() => expect(screen.getByText('저장')).not.toBeDisabled());
    unmount();
    expect(document.documentElement.style.getPropertyValue('--db-primary-color')).toBe('');
  });

  it('shows empty state when no settings match active tab', () => {
    render(<ThemeEditor initialSettings={[]} />);
    expect(screen.getByText('설정 항목이 없습니다.')).toBeInTheDocument();
  });

  it('renders color settings in color tab', () => {
    render(<ThemeEditor initialSettings={allSettings} />);
    expect(screen.getByText('Primary Color')).toBeInTheDocument();
    expect(screen.getByText('Secondary Color')).toBeInTheDocument();
  });

  it('switches tabs and shows filtered settings', () => {
    render(<ThemeEditor initialSettings={allSettings} />);
    fireEvent.click(screen.getByText('타이포그래피'));
    expect(screen.getByText('Base Font Size')).toBeInTheDocument();
    expect(screen.queryByText('Primary Color')).not.toBeInTheDocument();
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
        { key: 'primary_color', value: '#ff0000' },
      ]);
    });
  });

  it('renders preview panel', () => {
    render(<ThemeEditor initialSettings={[]} />);
    expect(screen.getByText(/라이브 프리뷰/)).toBeInTheDocument();
    expect(screen.getByText('Primary 버튼')).toBeInTheDocument();
  });
});
