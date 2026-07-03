import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProductImageUploader from '../ProductImageUploader';

vi.mock('@/lib/api', () => ({
  uploadApi: {
    uploadImage: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ProductImageUploader', () => {
  it('shows the 10MB image upload limit in the helper copy', () => {
    render(<ProductImageUploader imageUrl="" onChange={vi.fn()} />);

    expect(screen.getByText('JPEG, PNG, WebP · 최대 10MB')).toBeInTheDocument();
    expect(screen.queryByText(/최대 5MB/)).not.toBeInTheDocument();
  });
});
