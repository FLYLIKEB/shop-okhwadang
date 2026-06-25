import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import JournalDetailPage, { generateMetadata } from '../page';
import { JournalCategory, type Journal } from '@/lib/api';
import { fetchJournal } from '@/lib/api-server';

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('notFound');
  }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async ({ namespace }: { namespace: string }) => {
    const messages: Record<string, Record<string, string>> = {
      journalPage: {
        readSuffix: 'read',
        backToList: 'Back to journal list',
      },
      journalCategories: {
        culture: 'Tea Culture',
        usage: 'How to Use',
        tableSetting: 'Tea Table',
        news: 'News',
      },
    };

    return (key: string) => messages[namespace]?.[key] ?? key;
  }),
}));

vi.mock('@/lib/api-server', () => ({
  fetchJournal: vi.fn(),
}));

const mockFetchJournal = vi.mocked(fetchJournal);

const apiCreatedJournal: Journal = {
  id: 914,
  slug: 'cms-created-journal',
  title: 'CMS Created Journal',
  subtitle: 'Created from admin CMS',
  category: JournalCategory.NEWS,
  date: '2026-06-20',
  readTime: '4 min',
  summary: 'A journal entry created through the API.',
  content: JSON.stringify(['First API paragraph.', 'Second API paragraph.']),
  coverImageUrl: null,
  isPublished: true,
  createdAt: '2026-06-20T00:00:00.000Z',
  updatedAt: '2026-06-20T00:00:00.000Z',
};

describe('/[locale]/journal/[slug] detail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches an API-created journal by slug and route locale before rendering', async () => {
    mockFetchJournal.mockResolvedValue(apiCreatedJournal);

    const jsx = await JournalDetailPage({
      params: Promise.resolve({ locale: 'en', slug: 'cms-created-journal' }),
    });
    render(jsx);

    expect(mockFetchJournal).toHaveBeenCalledWith('cms-created-journal', 'en');
    expect(screen.getByRole('heading', { name: 'CMS Created Journal' })).toBeInTheDocument();
    expect(screen.getByText('News')).toBeInTheDocument();
    expect(screen.getByText('First API paragraph.')).toBeInTheDocument();
    expect(screen.getByText('Second API paragraph.')).toBeInTheDocument();
  });

  it('uses the API journal for metadata', async () => {
    mockFetchJournal.mockResolvedValue(apiCreatedJournal);

    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'en', slug: 'cms-created-journal' }),
    });

    expect(mockFetchJournal).toHaveBeenCalledWith('cms-created-journal', 'en');
    expect(metadata.title).toBe('CMS Created Journal — Journal');
    expect(metadata.description).toBe('A journal entry created through the API.');
  });
});
