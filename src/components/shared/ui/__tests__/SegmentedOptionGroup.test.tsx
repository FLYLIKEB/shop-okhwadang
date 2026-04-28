import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SegmentedOptionGroup from '@/components/shared/ui/SegmentedOptionGroup';

describe('SegmentedOptionGroup', () => {
  it('applies active state for single selection', () => {
    render(
      <SegmentedOptionGroup
        items={[
          { label: '전체', value: 'all' },
          { label: '활성', value: 'active' },
        ]}
        value="active"
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '활성' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '전체' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('supports array values for multi selection', () => {
    render(
      <SegmentedOptionGroup
        items={[
          { label: 'A', value: 'a' },
          { label: 'B', value: 'b' },
          { label: 'C', value: 'c' },
        ]}
        value={['a', 'c']}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'A' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'B' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'C' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('forwards clicked value via onToggle', async () => {
    const onToggle = vi.fn();

    render(
      <SegmentedOptionGroup
        items={[
          { label: '전체', value: 'all' },
          { label: '숨김', value: 'hidden' },
        ]}
        value="all"
        onToggle={onToggle}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '숨김' }));

    expect(onToggle).toHaveBeenCalledWith('hidden');
  });
});
