import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ProductErrorState from '@/components/shared/products/ProductErrorState';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh,
  }),
}));

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) => `${namespace}.${key}`,
}));

describe('ProductErrorState', () => {
  it('renders translated storefront error copy as an alert and retries with router refresh', async () => {
    const user = userEvent.setup();
    render(<ProductErrorState />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('product.loadErrorTitle');
    expect(alert).toHaveTextContent('product.loadErrorDescription');

    await user.click(screen.getByRole('button', { name: 'product.retry' }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
