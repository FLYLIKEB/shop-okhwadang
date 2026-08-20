import { render, screen } from '@testing-library/react';
import React from 'react';
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

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => React.createElement('img', { src, alt }),
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

  it('renders a bundled local journal without calling the backend API', async () => {
    const jsx = await JournalDetailPage({
      params: Promise.resolve({ locale: 'en', slug: 'spring-tea-table' }),
    });
    render(jsx);

    expect(mockFetchJournal).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'A Spring Tea Table' })).toBeInTheDocument();
    expect(screen.getByText('Tea Table')).toBeInTheDocument();
  });

  it('uses a bundled local journal for metadata without calling the backend API', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'en', slug: 'spring-tea-table' }),
    });

    expect(mockFetchJournal).not.toHaveBeenCalled();
    expect(metadata.title).toBe('A Spring Tea Table — Journal');
    expect(metadata.description).toBe(
      'Tea table ideas for spring, from green and white tea pairings to teaware, cloth, and floral details.',
    );
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

  it('renders safe CMS body images from HTML content without escaping them as text', async () => {
    mockFetchJournal.mockResolvedValue({
      ...apiCreatedJournal,
      content: JSON.stringify([
        '<p>Intro before image.</p><img src="https://cdn.ockhwadang.com/journal/photo.jpg" alt="Tea table photo"><p>Outro after image.</p>',
      ]),
    });

    const jsx = await JournalDetailPage({
      params: Promise.resolve({ locale: 'en', slug: 'cms-created-journal' }),
    });
    render(jsx);

    expect(screen.getByText('Intro before image.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Tea table photo' })).toHaveAttribute(
      'src',
      'https://cdn.ockhwadang.com/journal/photo.jpg',
    );
    expect(screen.getByText('Outro after image.')).toBeInTheDocument();
    expect(screen.queryByText(/<img/)).not.toBeInTheDocument();
  });

  it('ignores unsafe CMS image URLs while keeping adjacent journal text', async () => {
    mockFetchJournal.mockResolvedValue({
      ...apiCreatedJournal,
      content: JSON.stringify([
        'Before unsafe image <img src="javascript:alert(1)" alt="Bad image"> after unsafe image.',
        { type: 'image', src: '/uploads/journal/safe.jpg', alt: 'Safe uploaded image' },
      ]),
    });

    const jsx = await JournalDetailPage({
      params: Promise.resolve({ locale: 'en', slug: 'cms-created-journal' }),
    });
    render(jsx);

    expect(screen.queryByRole('img', { name: 'Bad image' })).not.toBeInTheDocument();
    expect(screen.getByText('Before unsafe image after unsafe image.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Safe uploaded image' })).toHaveAttribute(
      'src',
      '/uploads/journal/safe.jpg',
    );
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

  it('does not fall back to local content after a missing API journal for an unknown slug', async () => {
    mockFetchJournal.mockResolvedValue(null);

    await expect(
      JournalDetailPage({
        params: Promise.resolve({ locale: 'en', slug: 'unknown-cms-journal' }),
      }),
    ).rejects.toThrow('notFound');

    expect(mockFetchJournal).toHaveBeenCalledWith('unknown-cms-journal', 'en');
  });
});
