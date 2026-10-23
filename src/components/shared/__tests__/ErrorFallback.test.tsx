import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ErrorFallback from '../ErrorFallback';
import { createHomePageContentError } from '@/lib/storefront-diagnostics';

describe('ErrorFallback', () => {
  beforeEach(() => {
    document.documentElement.lang = 'ko';
    window.history.replaceState({}, '', '/');
  });

  it('shows targeted CMS guidance for missing home content', () => {
    render(
      <ErrorFallback
        error={createHomePageContentError('ko')}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText("Home CMS content is missing")).toBeInTheDocument();
    expect(screen.getByText("Check the published slug='home' page and its page blocks.")).toBeInTheDocument();
    expect(screen.getAllByText(/scripts\/run-seed\.sh/)).toHaveLength(2);
  });
});
