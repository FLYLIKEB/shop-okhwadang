import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ProductImageUploader from '../ProductImageUploader';

const { uploadImageMock } = vi.hoisted(() => ({ uploadImageMock: vi.fn() }));

vi.mock('@/lib/api', () => ({
  uploadApi: {
    uploadImage: uploadImageMock,
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ProductImageUploader', () => {
  it('uploads a selected image and returns the stored URL', async () => {
    uploadImageMock.mockResolvedValueOnce({ url: '/uploads/admin-image.webp' });
    const onChange = vi.fn();
    render(<ProductImageUploader imageUrl="" onChange={onChange} />);

    const input = document.querySelector('input[type=\"file\"]');
    expect(input).toBeInstanceOf(HTMLInputElement);

    const file = new File(['image'], 'admin-image.webp', { type: 'image/webp' });
    await userEvent.upload(input as HTMLInputElement, file);

    await waitFor(() => {
      expect(uploadImageMock).toHaveBeenCalledWith(file);
      expect(onChange).toHaveBeenCalledWith('/uploads/admin-image.webp');
    });
  });

  it('shows the 20MB image upload limit in the helper copy', () => {
    render(<ProductImageUploader imageUrl="" onChange={vi.fn()} />);

    expect(screen.getByText('JPEG, PNG, WebP · 20MB 초과 시 자동 리사이징')).toBeInTheDocument();
    expect(screen.queryByText(/최대 10MB|최대 5MB/)).not.toBeInTheDocument();
  });
});
