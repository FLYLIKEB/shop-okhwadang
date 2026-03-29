import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import CategoryTree from '@/components/filters/CategoryTree';
import type { Category } from '@/lib/api';

const mockCategories: Category[] = [
  {
    id: 1,
    name: '의류',
    slug: 'clothing',
    parentId: null,
    children: [
      { id: 11, name: '상의', slug: 'tops', parentId: 1 },
      { id: 12, name: '하의', slug: 'bottoms', parentId: 1 },
    ],
  },
  {
    id: 2,
    name: '신발',
    slug: 'shoes',
    parentId: null,
    children: [],
  },
];

describe('CategoryTree', () => {
  it('renders categories', () => {
    render(<CategoryTree categories={mockCategories} onSelect={vi.fn()} />);
    expect(screen.getByText('의류')).toBeInTheDocument();
    expect(screen.getByText('신발')).toBeInTheDocument();
  });

  it('renders 전체 button', () => {
    render(<CategoryTree categories={mockCategories} onSelect={vi.fn()} />);
    expect(screen.getByText('전체')).toBeInTheDocument();
  });

  it('전체 button calls onSelect with undefined', async () => {
    const onSelect = vi.fn();
    render(<CategoryTree categories={mockCategories} onSelect={onSelect} />);
    await userEvent.click(screen.getByText('전체'));
    expect(onSelect).toHaveBeenCalledWith(undefined);
  });

  it('child categories shown on parent click', async () => {
    render(<CategoryTree categories={mockCategories} onSelect={vi.fn()} />);
    // Children not visible initially
    expect(screen.queryByText('상의')).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('의류'));
    expect(screen.getByText('상의')).toBeInTheDocument();
    expect(screen.getByText('하의')).toBeInTheDocument();
  });

  it('selected category has active class', () => {
    render(<CategoryTree categories={mockCategories} selectedId={2} onSelect={vi.fn()} />);
    const button = screen.getByText('신발').closest('button')!;
    expect(button.className).toMatch(/bg-primary/);
  });

  it('전체 button has active class when no category selected', () => {
    render(<CategoryTree categories={mockCategories} selectedId={undefined} onSelect={vi.fn()} />);
    const button = screen.getByText('전체').closest('button')!;
    expect(button.className).toMatch(/bg-primary/);
  });

  it('empty categories not shown', () => {
    const { container } = render(<CategoryTree categories={[]} onSelect={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('clicking a category calls onSelect with its id', async () => {
    const onSelect = vi.fn();
    render(<CategoryTree categories={mockCategories} onSelect={onSelect} />);
    await userEvent.click(screen.getByText('신발'));
    expect(onSelect).toHaveBeenCalledWith(2);
  });
});
