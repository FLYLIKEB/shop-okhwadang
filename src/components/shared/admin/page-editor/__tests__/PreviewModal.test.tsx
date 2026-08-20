import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PreviewModal from '../PreviewModal';

vi.mock('../PreviewBlock', () => ({
  default: () => <div>preview block</div>,
  BLOCK_TYPE_LABELS: { hero_banner: 'Hero' },
}));

describe('PreviewModal', () => {
  it('uses the shared labeled scrollable modal shell', () => {
    const onClose = vi.fn();

    render(
      <PreviewModal
        blocks={[{ id: 1, type: 'hero_banner', content: {}, sort_order: 0, is_visible: true }]}
        onClose={onClose}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: '미리보기' });
    expect(dialog).toBeInTheDocument();
    expect(dialog.firstElementChild).toHaveClass('max-h-screen', 'overflow-y-auto');

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
  });
});
