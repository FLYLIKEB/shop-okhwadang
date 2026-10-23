import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AnnouncementBar from '@/components/shared/layout/AnnouncementBar';
import AnnouncementBarClient from '@/components/shared/layout/AnnouncementBarClient';
import * as apiServer from '@/lib/api-server';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    if (key === 'prev') return 'Previous announcement';
    if (key === 'next') return 'Next announcement';
    return key;
  },
}));

describe('AnnouncementBar', () => {

  const item = { id: 1, message: 'First notice', message_en: null, href: null, sort_order: 0, is_active: true, created_at: '', updated_at: '' };

  it('keeps plain notices compact and linked notices touch accessible', () => {
    const { rerender } = render(<AnnouncementBarClient locale="ko" items={[item]} />);
    expect(screen.getByText('First notice')).toHaveClass('h-8');
    rerender(<AnnouncementBarClient locale="ko" items={[{ ...item, href: '/products' }]} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/ko/products');
    expect(screen.getByText('First notice')).toHaveClass('h-11');
  });

  it('moves one fixed-height notice per step and wraps backwards', () => {
    render(<AnnouncementBarClient locale="ko" items={[item, { ...item, id: 2, message: 'Second notice' }]} />);
    const track = screen.getByTestId('announcement-track');
    expect(track).toHaveClass('h-11');
    fireEvent.click(screen.getByRole('button', { name: 'Next announcement' }));
    expect(track).toHaveStyle({ transform: 'translateY(-100%)' });
    fireEvent.click(screen.getByRole('button', { name: 'Next announcement' }));
    expect(track).toHaveStyle({ transform: 'translateY(-0%)' });
    fireEvent.click(screen.getByRole('button', { name: 'Previous announcement' }));
    expect(track).toHaveStyle({ transform: 'translateY(-100%)' });
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
