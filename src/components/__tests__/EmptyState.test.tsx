import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import EmptyState from '@/components/EmptyState';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="결과 없음" description="검색 결과가 없습니다." />);
    expect(screen.getByText('결과 없음')).toBeInTheDocument();
    expect(screen.getByText('검색 결과가 없습니다.')).toBeInTheDocument();
  });

  it('renders action button when action prop provided; click fires onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<EmptyState title="빈 상태" action={{ label: '다시 시도', onClick }} />);
    const button = screen.getByRole('button', { name: '다시 시도' });
    expect(button).toBeInTheDocument();
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does NOT render button when no action prop', () => {
    render(<EmptyState title="빈 상태" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
