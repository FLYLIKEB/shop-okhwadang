import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import AnnouncementBar from '@/components/shared/layout/AnnouncementBar';
import * as apiServer from '@/lib/api-server';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    if (key === 'prev') return 'Previous announcement';
    if (key === 'next') return 'Next announcement';
    return key;
  },
}));

describe('AnnouncementBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('SSR에서 locale 파라미터로 안내 문구를 조회해 렌더링한다', async () => {
    vi.spyOn(apiServer, 'fetchAnnouncementBars').mockResolvedValue([
      {
        id: 1,
        message: '영문 공지',
        message_en: 'English notice',
        href: '/products',
        sort_order: 0,
        is_active: true,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const jsx = await AnnouncementBar({ locale: 'en' });
    render(jsx);

    expect(apiServer.fetchAnnouncementBars).toHaveBeenCalledWith('en');
    const link = screen.getByRole('link', { name: '영문 공지' });
    expect(link).toHaveAttribute('href', '/en/products');
  });

  it('데이터가 비어있으면 높이 0으로 숨긴다', async () => {
    vi.spyOn(apiServer, 'fetchAnnouncementBars').mockResolvedValue([]);

    const jsx = await AnnouncementBar({ locale: 'ko' });
    render(jsx);

    expect(screen.getByTestId('announcement-bar-empty')).toBeInTheDocument();
  });
});
