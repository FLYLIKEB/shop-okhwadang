import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ErrorPage from '../error';
import { createHomeCmsIntegrityError } from '../home-integrity';

vi.mock('@/utils/clientLocale', () => ({
  getClientLocale: () => 'ko',
}));

describe('storefront route error boundary', () => {
  it('renders a CMS-specific checklist for missing home page content', () => {
    render(<ErrorPage error={createHomeCmsIntegrityError('ko')} reset={vi.fn()} />);

    expect(screen.getByText('홈 CMS 콘텐츠를 확인해 주세요.')).toBeInTheDocument();
    expect(screen.getByText(/slug=home 페이지가 게시 상태인지 확인하세요/)).toBeInTheDocument();
    expect(screen.getByText(/page_blocks가 1개 이상인지 확인하세요/)).toBeInTheDocument();
  });

  it('falls back to the generic error UI for non-CMS runtime errors', () => {
    render(<ErrorPage error={new Error('boom')} reset={vi.fn()} />);

    expect(screen.getByText('데이터를 불러오지 못했습니다')).toBeInTheDocument();
  });
});
