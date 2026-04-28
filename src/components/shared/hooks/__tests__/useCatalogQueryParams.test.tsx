import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildAttrs, parseAttrs, useCatalogQueryParams } from '@/components/shared/hooks/useCatalogQueryParams';

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams('sort=latest&page=3');

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/products',
  useSearchParams: () => mockSearchParams,
}));

function QueryHarness() {
  const { updateQuery } = useCatalogQueryParams();
  return (
    <button type="button" onClick={() => updateQuery({ sort: 'price_asc' })}>
      update
    </button>
  );
}

describe('useCatalogQueryParams helpers', () => {
  it('parseAttrs parses comma-separated key:value pairs', () => {
    const parsed = parseAttrs('clay_type:zini,teapot_shape:round');

    expect(parsed.get('clay_type')).toBe('zini');
    expect(parsed.get('teapot_shape')).toBe('round');
  });

  it('buildAttrs removes key when value is undefined', () => {
    const current = new Map<string, string>([
      ['clay_type', 'zini'],
      ['teapot_shape', 'round'],
    ]);

    expect(buildAttrs(current, 'clay_type', undefined)).toBe('teapot_shape:round');
  });
});

describe('useCatalogQueryParams', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSearchParams = new URLSearchParams('sort=latest&page=3');
  });

  it('resets page to 1 semantics when filters/sort change', async () => {
    render(<QueryHarness />);

    await userEvent.click(screen.getByRole('button', { name: 'update' }));

    expect(mockPush).toHaveBeenCalledWith('/products?sort=price_asc');
  });
});
