import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProductCard from '@/components/products/ProductCard';

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

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, isLoading: false, user: null, logout: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/api', () => ({
  wishlistApi: {
    add: vi.fn(),
    remove: vi.fn(),
    getList: vi.fn(),
    check: vi.fn(),
  },
}));

describe('ProductCard', () => {
  const baseProps = {
    id: 1,
    name: '테스트 상품',
    price: 29000,
    salePrice: null,
    status: 'active' as const,
    images: [{ id: 1, url: '/img/test.jpg', alt: null, sortOrder: 0, isThumbnail: true }],
  };

  it('shows price only when no sale price', () => {
    render(<ProductCard {...baseProps} />);
    expect(screen.getByText('29,000원')).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('shows sale price, original price strikethrough, and discount percentage', () => {
    render(<ProductCard {...baseProps} salePrice={24000} />);
    expect(screen.getByText('24,000원')).toBeInTheDocument();
    expect(screen.getByText('29,000원')).toBeInTheDocument();
    expect(screen.getByText('17%')).toBeInTheDocument();
  });

  it('shows soldout badge when status is soldout', () => {
    render(<ProductCard {...baseProps} status="soldout" />);
    expect(screen.getByText('품절')).toBeInTheDocument();
  });

  it('renders without crashing when images are empty', () => {
    render(<ProductCard {...baseProps} images={[]} />);
    expect(screen.getByText('No Image')).toBeInTheDocument();
  });

  it('links to the product detail page', () => {
    render(<ProductCard {...baseProps} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/products/1');
  });
});
