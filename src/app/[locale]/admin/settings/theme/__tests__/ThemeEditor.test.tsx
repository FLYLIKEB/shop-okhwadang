import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ThemeEditor from '../ThemeEditor';
import type { SiteSetting } from '@/lib/api';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/settings/theme',
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/hooks/useUnsavedChanges', () => ({
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
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  it('renders tabs', () => {
    render(<ThemeEditor initialSettings={[]} />);
    expect(screen.getByText('색상')).toBeInTheDocument();
    expect(screen.getByText('타이포그래피')).toBeInTheDocument();
    expect(screen.getByText('간격')).toBeInTheDocument();
    expect(screen.getByText('모서리')).toBeInTheDocument();
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
    expect(screen.getByText('라이브 프리뷰')).toBeInTheDocument();
    expect(screen.getByText('Primary 버튼')).toBeInTheDocument();
  });
});
