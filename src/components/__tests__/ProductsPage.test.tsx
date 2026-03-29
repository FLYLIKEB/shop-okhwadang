import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/products',
}));

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, ...rest } = props;
    return <img data-fill={fill ? 'true' : undefined} {...rest} />;
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('ViewToggle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to grid view and switches to list on click', async () => {
    const { default: ViewToggle } = await import('@/components/products/ViewToggle');
    const onChange = vi.fn();
    render(<ViewToggle value="grid" onChange={onChange} />);

    const listButton = screen.getByLabelText('리스트 보기');
    await userEvent.click(listButton);

    expect(onChange).toHaveBeenCalledWith('list');
    expect(localStorage.getItem('products-view-mode')).toBe('list');
  });
});

describe('SortDropdown', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('updates URL with sort parameter on change', async () => {
    const { default: SortDropdown } = await import('@/components/products/SortDropdown');
    render(<SortDropdown />);

    const select = screen.getByLabelText('정렬 기준');
    fireEvent.change(select, { target: { value: 'price_asc' } });

    expect(mockPush).toHaveBeenCalledWith('/products?sort=price_asc');
  });
});

describe('Pagination', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders page buttons and navigates on click', async () => {
    const { default: Pagination } = await import('@/components/products/Pagination');
    render(<Pagination total={100} page={1} limit={20} />);

    const nextButton = screen.getByText('다음');
    await userEvent.click(nextButton);

    expect(mockPush).toHaveBeenCalledWith('/products?page=2');
  });

  it('disables prev button on first page', async () => {
    const { default: Pagination } = await import('@/components/products/Pagination');
    render(<Pagination total={100} page={1} limit={20} />);

    const prevButton = screen.getByText('이전');
    expect(prevButton).toBeDisabled();
  });

  it('does not render when total fits in one page', async () => {
    const { default: Pagination } = await import('@/components/products/Pagination');
    const { container } = render(<Pagination total={10} page={1} limit={20} />);
    expect(container.innerHTML).toBe('');
  });
});
