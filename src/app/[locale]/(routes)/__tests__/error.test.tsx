import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ErrorPage from '../error';
import { createHomePageContentError } from '@/lib/storefront-diagnostics';

vi.mock('@/utils/clientLocale', () => ({
  getClientLocale: () => 'ko',
}));

describe('storefront route error boundary', () => {
  it('renders a CMS-specific message for missing home page content', () => {
    render(<ErrorPage error={createHomePageContentError('ko')} reset={vi.fn()} />);

    expect(screen.getByText('홈 CMS 콘텐츠가 비어 있습니다')).toBeInTheDocument();
    expect(screen.getByText(/slug='home' 페이지와 블록 게시 상태를 확인하세요/)).toBeInTheDocument();
    expect(screen.getAllByText(/scripts\/run-seed\.sh/).length).toBeGreaterThan(0);
  });

  it('falls back to the generic error UI for non-CMS runtime errors', () => {
    render(<ErrorPage error={new Error('boom')} reset={vi.fn()} />);

    expect(screen.getByText('데이터를 불러오지 못했습니다')).toBeInTheDocument();
  });
});
