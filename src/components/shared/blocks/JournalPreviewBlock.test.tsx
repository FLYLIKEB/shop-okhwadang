import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import JournalPreviewBlock from '@/components/shared/blocks/JournalPreviewBlock';
import { JournalCategory, type Journal } from '@/lib/api';
import JournalListClient from '@/components/shared/journal/JournalListClient';
import en from '@/i18n/messages/en.json';

const mockGetAll = vi.fn();
const mockUseLocale = vi.fn(() => 'en');

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next-intl', async () => {
  const { createTranslator } = await vi.importActual<typeof import('next-intl')>('next-intl');
  const { useMemo } = await vi.importActual<typeof import('react')>('react');
  return {
    useLocale: () => mockUseLocale(),
    useTranslations: (namespace: keyof typeof en) => useMemo(() => createTranslator({
      locale: 'en',
      messages: en,
      namespace,
      onError: (error) => { throw error; },
    }), [namespace]),
  };
});

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    journalsApi: {
      getAll: (...args: unknown[]) => mockGetAll(...args),
    },
  };
});

vi.mock('@/components/shared/hooks/useScrollAnimation', () => ({
  useScrollAnimation: () => ({ ref: vi.fn(), visible: true }),
}));

vi.mock('@/components/shared/journal/JournalCard', () => ({
  default: ({ journal, categoryLabel }: { journal: Journal; categoryLabel: string }) => (
    <article>
      <h3>{journal.title}</h3>
      <p>{categoryLabel}</p>
    </article>
  ),
}));

const journal: Journal = {
  id: 1,
  slug: 'english-journal',
  title: 'English Journal',
  subtitle: null,
  category: JournalCategory.CULTURE,
  date: '2026-05-01',
  readTime: null,
  summary: null,
  content: null,
  coverImageUrl: null,
  isPublished: true,
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
};

describe('JournalPreviewBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLocale.mockReturnValue('en');
    mockGetAll.mockResolvedValue([journal]);
  });

  it('/en CMS 블록에서 현재 locale을 저널 목록 API에 전달한다', async () => {
    render(<JournalPreviewBlock content={{ category: JournalCategory.CULTURE, limit: 1 }} />);

    await waitFor(() => {
      expect(screen.getByText('English Journal')).toBeInTheDocument();
    });

    expect(mockGetAll).toHaveBeenCalledWith(JournalCategory.CULTURE, 'en');
  });

  it.each([
    ['소식', 'News'],
    ['unknown', 'Uncategorized'],
    [undefined, 'Uncategorized'],
  ])('renders prefetched API category %s without a translation error', (category, label) => {
    render(<JournalPreviewBlock content={{
      prefetched_journals: [{ ...journal, category } as Journal],
    }} />);

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(mockGetAll).not.toHaveBeenCalled();
  });

  it('keeps legacy API categories visible when filtering the journal list', async () => {
    mockGetAll.mockResolvedValue([{ ...journal, category: '소식' }]);
    render(<JournalListClient />);
    await screen.findByText('English Journal');

    fireEvent.click(screen.getByRole('button', { name: 'News' }));

    expect(screen.getByText('English Journal')).toBeInTheDocument();
  });
});
