import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CategoryNavBlock from '@/components/shared/blocks/CategoryNavBlock';
import { categoriesApi } from '@/lib/api';
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
  default: ({
    children,
    href,
    prefetch,
  }: {
    children: React.ReactNode;
    href: string;
    prefetch?: boolean;
  }) => (
    <a href={href} data-prefetch={String(prefetch)}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'en' }),
}));

vi.mock('@/lib/api', () => ({
  categoriesApi: {
    getTree: vi.fn(),
  },
}));

const mockCategories: Category[] = [
  { id: 1, name: '자사호', slug: 'teapot', description: null, parentId: null, imageUrl: null },
  {
    id: 2,
    name: '보이차',
    slug: 'puerh-tea',
    description: null,
    parentId: null,
    imageUrl: 'https://images.example.com/puerh-tea.jpg',
  },
  { id: 3, name: '다구', slug: 'tea-ware', description: null, parentId: null, imageUrl: null },
];

describe('CategoryNavBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders text category links with locale path and disabled prefetch', async () => {
    const content = {
      category_ids: [],
      template: 'text' as const,
      prefetched_categories: mockCategories,
    };

    render(<CategoryNavBlock content={content} />);

    await waitFor(() => {
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(3);
      expect(links[0]).toHaveAttribute('href', '/en/products?categoryId=1');
      expect(links[0]).toHaveAttribute('data-prefetch', 'false');
    });
  });

  it('renders image category links with locale path and disabled prefetch', async () => {
    const content = {
      category_ids: [],
      template: 'image' as const,
      prefetched_categories: mockCategories,
    };

    render(<CategoryNavBlock content={content} />);

    await waitFor(() => {
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(3);
      expect(links[1]).toHaveAttribute('href', '/en/products?categoryId=2');
      expect(links[1]).toHaveAttribute('data-prefetch', 'false');
    });
  });

  it('uses optimized responsive images for category thumbnails', async () => {
    const content = {
      category_ids: [],
      template: 'image' as const,
      prefetched_categories: mockCategories,
    };

    render(<CategoryNavBlock content={content} />);

    const image = await screen.findByRole('img', { name: '보이차' });
    expect(image).toHaveAttribute('src', 'https://images.example.com/puerh-tea.jpg');
    expect(image).toHaveAttribute('sizes', '(max-width: 768px) calc(50vw - 0.5rem), calc(25vw - 0.75rem)');
    expect(image).toHaveAttribute('quality', '75');
    expect(image).not.toHaveAttribute('unoptimized');
  });

  it('keeps the clay-color fallback when a category image fails', async () => {
    const content = {
      category_ids: [],
      template: 'image' as const,
      prefetched_categories: mockCategories,
    };

    render(<CategoryNavBlock content={content} />);

    const image = await screen.findByRole('img', { name: '보이차' });
    fireEvent.error(image);

    expect(screen.queryByRole('img', { name: '보이차' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '보이차' }).firstElementChild).toHaveStyle({
      backgroundColor: '#2A2520',
    });
  });

  it('fetches client fallback categories only once when category_ids is omitted', async () => {
    vi.mocked(categoriesApi.getTree).mockResolvedValue(mockCategories);

    render(<CategoryNavBlock content={{ template: 'text' }} />);

    await waitFor(() => {
      expect(screen.getAllByRole('link')).toHaveLength(3);
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(categoriesApi.getTree).toHaveBeenCalledTimes(1);
    expect(categoriesApi.getTree).toHaveBeenCalledWith('en');
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
