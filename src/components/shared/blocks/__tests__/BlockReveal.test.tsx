import { render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BlockReveal from '../BlockReveal';

afterEach(() => vi.unstubAllGlobals());

describe('BlockReveal content availability', () => {
  it('includes visible content in server HTML before hydration', () => {
    const html = renderToStaticMarkup(<BlockReveal><h2>Collection</h2></BlockReveal>);
    expect(html).toContain('opacity:1');
    expect(html).not.toContain('opacity:0');
  });

  it('keeps content visible when the intersection observer never reports', () => {
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    render(<BlockReveal><h2>Collection</h2></BlockReveal>);
    expect(screen.getByRole('heading', { name: 'Collection' })).toBeVisible();
  });

  it('renders content when intersection observation is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<BlockReveal><h2>Collection</h2></BlockReveal>);
    expect(screen.getByRole('heading', { name: 'Collection' })).toBeVisible();
  });
});
