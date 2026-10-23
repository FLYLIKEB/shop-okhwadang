import { act, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProductGrid from '../ProductGrid';
import { LOCAL_KEYS } from '@/constants/storage';
import type { Product } from '@/lib/api';

vi.mock('next-intl', () => ({ useTranslations: () => ({ rich: (_key: string, values: { count: number }) => `${values.count} products` }) }));
vi.mock('../ProductCard', () => ({ default: () => <div data-testid="grid-product">Grid product</div> }));
vi.mock('../ProductListItem', () => ({ default: () => <div data-testid="list-product">List product</div> }));
vi.mock('../ViewToggle', () => ({ default: () => null }));
vi.mock('../SortDropdown', () => ({ default: () => null }));

const product: Product = {
  id: 1, name: 'Tea', slug: 'tea', price: 1000, salePrice: null, shortDescription: null,
  rating: 0, reviewCount: 0, status: 'active', isFeatured: false, viewCount: 0, category: null, images: [],
};

afterEach(() => localStorage.removeItem(LOCAL_KEYS.VIEW_MODE));

describe('ProductGrid hydration', () => {
  it('hydrates server grid before applying the stored raw list preference', async () => {
    localStorage.removeItem(LOCAL_KEYS.VIEW_MODE);
    const element = <ProductGrid products={[product]} total={1} />;
    const container = document.createElement('div');
    container.innerHTML = renderToString(element);
    expect(container.querySelector('[data-testid="grid-product"]')).not.toBeNull();
    localStorage.setItem(LOCAL_KEYS.VIEW_MODE, 'list');
    document.body.appendChild(container);
    const onRecoverableError = vi.fn();
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(async () => { root = hydrateRoot(container, element, { onRecoverableError }); });
      await waitFor(() => expect(container.querySelector('[data-testid="list-product"]')).not.toBeNull());
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(localStorage.getItem(LOCAL_KEYS.VIEW_MODE)).toBe('list');
    } finally {
      await act(async () => root?.unmount());
      container.remove();
    }
  });
});
