import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MobileBottomNavWrapper from '@/components/MobileBottomNavWrapper';

const mockGetAll = vi.fn();

vi.mock('@/lib/api', () => ({
  settingsApi: {
    getAll: (...args: unknown[]) => mockGetAll(...args),
  },
}));

vi.mock('@/components/shared/MobileBottomNav', () => ({
  default: () => <div data-testid="mobile-bottom-nav" />,
}));

describe('MobileBottomNavWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('visible=false면 API 호출 없이 숨긴다', () => {
    const { container } = render(<MobileBottomNavWrapper visible={false} />);

    expect(container.firstChild).toBeNull();
    expect(mockGetAll).not.toHaveBeenCalled();
  });

  it('설정이 true면 네비를 렌더링한다', async () => {
    mockGetAll.mockResolvedValue([{ key: 'mobile_bottom_nav_visible', value: 'true' }]);

    render(<MobileBottomNavWrapper />);

    await waitFor(() => {
      expect(screen.getByTestId('mobile-bottom-nav')).toBeInTheDocument();
    });

    expect(mockGetAll).toHaveBeenCalledWith('general');
  });

  it('설정이 false면 네비를 숨긴다', async () => {
    mockGetAll.mockResolvedValue([{ key: 'mobile_bottom_nav_visible', value: 'false' }]);

    const { container } = render(<MobileBottomNavWrapper />);

    await waitFor(() => {
      expect(mockGetAll).toHaveBeenCalledWith('general');
    });

    expect(container.firstChild).toBeNull();
  });

  it('설정이 없으면 기본값으로 숨긴다', async () => {
    mockGetAll.mockResolvedValue([]);

    const { container } = render(<MobileBottomNavWrapper />);

    await waitFor(() => {
      expect(mockGetAll).toHaveBeenCalledWith('general');
    });

    expect(container.firstChild).toBeNull();
  });

  it('설정 조회 실패 시 기본값으로 숨긴다', async () => {
    mockGetAll.mockRejectedValue(new Error('network'));

    const { container } = render(<MobileBottomNavWrapper />);

    await waitFor(() => {
      expect(mockGetAll).toHaveBeenCalledWith('general');
    });

    expect(container.firstChild).toBeNull();
  });
});
