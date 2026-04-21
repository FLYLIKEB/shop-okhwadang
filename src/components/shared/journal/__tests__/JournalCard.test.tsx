import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import JournalCard from '@/components/shared/journal/JournalCard';
import { JournalCategory, type Journal } from '@/lib/api';

const BASE_JOURNAL: Journal = {
  id: 1,
  slug: 'journal-test',
  title: '저널 테스트',
  subtitle: '부제목',
  category: JournalCategory.CULTURE,
  date: '2026-04-21',
  readTime: '5분',
  summary: '요약',
  content: null,
  coverImageUrl: null,
  isPublished: true,
  createdAt: '2026-04-21T00:00:00.000Z',
  updatedAt: '2026-04-21T00:00:00.000Z',
};

describe('JournalCard', () => {
  it('uses fallback image when cover image is missing', () => {
    render(
      <JournalCard
        journal={BASE_JOURNAL}
        fallbackImageUrl="https://example.com/fallback.jpg"
        categoryLabel="다문화"
      />,
    );

    const image = screen.getByRole('img', { name: '저널 테스트' });
    expect(image).toHaveAttribute('src', 'https://example.com/fallback.jpg');
  });

  it('prefers journal cover image when available', () => {
    render(
      <JournalCard
        journal={{ ...BASE_JOURNAL, coverImageUrl: 'https://example.com/cover.jpg' }}
        fallbackImageUrl="https://example.com/fallback.jpg"
        categoryLabel="다문화"
      />,
    );

    const image = screen.getByRole('img', { name: '저널 테스트' });
    expect(image).toHaveAttribute('src', 'https://example.com/cover.jpg');
  });
});
