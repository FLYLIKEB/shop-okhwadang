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

    expect(screen.getByText('홈 CMS 콘텐츠가 비어 있습니다')).toBeInTheDocument();
    expect(screen.getByText("slug='home' 페이지와 블록 게시 상태를 확인하세요.")).toBeInTheDocument();
    expect(screen.getAllByText(/scripts\/run-seed\.sh/)).toHaveLength(2);
  });
});
