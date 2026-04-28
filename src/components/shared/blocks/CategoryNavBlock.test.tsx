import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CategoryNavBlock from '@/components/shared/blocks/CategoryNavBlock';
import type { Category } from '@/lib/api';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fill: _fill, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img data-testid="next-image" {...rest} />;
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'ko' }),
}));

vi.mock('@/lib/api', () => ({
  categoriesApi: {
    getTree: vi.fn(),
  },
}));

const mockCategories: Category[] = [
  { id: 1, name: '자사호', slug: 'teapot', description: null, parentId: null, imageUrl: null },
  { id: 2, name: '보이차', slug: 'puerh-tea', description: null, parentId: null, imageUrl: null },
  { id: 3, name: '다구', slug: 'tea-ware', description: null, parentId: null, imageUrl: null },
];

describe('CategoryNavBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders categories when prefetched_categories is provided', async () => {
    const content = {
      category_ids: [],
      template: 'text' as const,
      prefetched_categories: mockCategories,
    };

    render(<CategoryNavBlock content={content} />);

    await waitFor(() => {
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(3);
    });
  });

  it('returns null when prefetched_categories is empty array', () => {
    const content = {
      category_ids: [],
      template: 'text' as const,
      prefetched_categories: [],
    };

    const { container } = render(<CategoryNavBlock content={content} />);
    expect(container.firstChild).toBeNull();
  });
});
