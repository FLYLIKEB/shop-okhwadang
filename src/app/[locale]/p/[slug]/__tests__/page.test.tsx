import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import SlugPage, { generateMetadata } from '../page';
import { fetchPage } from '@/lib/api-server';

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('notFound');
  }),
}));

vi.mock('@/components/shared/blocks/BlockRenderer', () => ({
  default: ({ blocks }: { blocks: Array<{ content: { html?: string } }> }) => (
    <div data-testid="blocks">{blocks.map((block) => block.content.html).join('')}</div>
  ),
}));

vi.mock('@/lib/api-server', () => ({
  fetchPage: vi.fn(),
}));

const mockFetchPage = vi.mocked(fetchPage);

describe('/[locale]/p/[slug] CMS page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests the CMS page with the route locale for metadata', async () => {
    mockFetchPage.mockResolvedValue({
      id: 12,
      slug: 'best',
      title: 'Best Sellers',
      is_published: true,
      blocks: [],
    });

    const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'en', slug: 'best' }) });

    expect(mockFetchPage).toHaveBeenCalledWith('best', 'en');
    expect(metadata.title).toBe('Best Sellers | Ockhwadang');
  });

  it('requests the CMS page with the route locale before rendering blocks', async () => {
    mockFetchPage.mockResolvedValue({
      id: 8,
      slug: 'about',
      title: 'About Okhwadang',
      is_published: true,
      blocks: [
        {
          id: 1,
          type: 'text_content',
          sort_order: 0,
          is_visible: true,
          content: { html: '<h1>About Okhwadang</h1>' },
        },
      ],
    });

    const jsx = await SlugPage({ params: Promise.resolve({ locale: 'en', slug: 'about' }) });
    render(jsx);

    expect(mockFetchPage).toHaveBeenCalledWith('about', 'en');
    expect(screen.getByTestId('blocks')).toHaveTextContent('About Okhwadang');
  });
});
