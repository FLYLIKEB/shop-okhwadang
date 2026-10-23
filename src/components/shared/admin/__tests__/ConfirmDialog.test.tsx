import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from '../ConfirmDialog';

describe('ConfirmDialog color semantics', () => {
  it('pairs destructive actions with destructive foreground and retains the action', () => {
    const onConfirm = vi.fn();
    const { rerender } = render(<ConfirmDialog open title="Delete" description="Remove item" confirmLabel="Confirm" destructive onConfirm={onConfirm} onCancel={vi.fn()} />);
    const confirm = screen.getByRole('button', { name: 'Confirm' });
    expect(confirm).toHaveClass('bg-destructive', 'text-destructive-foreground');
    expect(confirm).not.toHaveClass('text-primary-foreground');
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledOnce();

    rerender(<ConfirmDialog open title="Publish" description="Publish item" confirmLabel="Confirm" onConfirm={onConfirm} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveClass('bg-primary', 'text-primary-foreground');
    expect(screen.getByRole('button', { name: 'Confirm' })).not.toHaveClass('text-destructive-foreground');
  });
});
