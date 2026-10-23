import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ErrorPage from '../error';
import { HOME_PAGE_CONTENT_ERROR_CODE, createHomePageContentError } from '@/lib/storefront-diagnostics';


vi.mock('@/utils/clientLocale', () => ({
  getClientLocale: () => 'ko',
}));

describe('storefront route error boundary', () => {
  it('renders a CMS-specific message for missing home page content', () => {
    render(<ErrorPage error={createHomePageContentError('ko')} reset={vi.fn()} />);

    expect(screen.getByText('Home CMS content is missing')).toBeInTheDocument();
    expect(screen.getByText("Check the published slug='home' page and its page blocks.")).toBeInTheDocument();
    expect(screen.getAllByText(/scripts\/run-seed\.sh/).length).toBeGreaterThan(0);
  });


  it('renders a CMS-specific message when the production-safe digest is present', () => {
    const error = new Error('generic production error') as Error & { digest?: string };
    error.digest = HOME_PAGE_CONTENT_ERROR_CODE;

    render(<ErrorPage error={error} reset={vi.fn()} />);

    expect(screen.getByText('Home CMS content is missing')).toBeInTheDocument();
    expect(screen.getByText("Check the published slug='home' page and its page blocks.")).toBeInTheDocument();
  });
  it('falls back to the generic error UI for non-CMS runtime errors', () => {
    render(<ErrorPage error={new Error('boom')} reset={vi.fn()} />);

    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
  });
});
